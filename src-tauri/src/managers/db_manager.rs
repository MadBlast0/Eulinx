use std::path::PathBuf;
use std::sync::Mutex;

use rusqlite::{Connection, OptionalExtension};
use serde_json::Value;

use crate::error::AppError;
use crate::event_log::types::{
    EventLogResult, EventLogStats, EventRangeQuery, GapCause, GapReport, PersistedEventEnvelope,
    SeqGap,
};

/// Version of the on-disk SQLite schema. Bump this when migrations change.
/// Mirrors `SCHEMA_VERSION` in `src/database/schema.ts`.
pub const SCHEMA_VERSION: i32 = 2;

/// Result of opening the database against the on-disk schema version.
#[derive(Debug, PartialEq, Eq)]
pub enum MigrationStatus {
    /// DB was created or already at the expected version (no action needed).
    Open,
    /// DB was upgraded from an older version to the current one.
    Migrated,
    /// On-disk version is newer than what this binary supports.
    Refused,
}

/// A single logical entity table. Every row is stored as JSON in a `data`
/// column keyed by `id`, keeping the Rust layer agnostic to the TS schemas
/// while preserving the exact shapes the TypeScript repositories expect.
fn entity_tables() -> &'static [&'static str] {
    &[
        "app_meta",
        "workspace",
        "project",
        "user",
        "worker",
        "worker_channel",
        "session",
        "task",
        "execution",
        "workflow",
        "node",
        "edge",
        "run",
        "run_step",
        "run_context",
        "artifact",
        "prompt",
        "prompt_version",
        "chat",
        "message",
        "memory_entry",
        "settings",
        "log_entry",
        "plugin",
        "plugin_node",
        "plugin_tool",
        "lock_record",
        "merge_record",
    ]
}

/// Manages the SQLite connection and schema lifecycle for the app.
///
/// Rows are stored as a JSON `data` blob keyed by `id` inside a generic table
/// per entity. All mutations are mirrored into an append-only `event_log`
/// table to satisfy history requirements. The schema version is tracked via
/// SQLite's `PRAGMA user_version`.
pub struct DbManager {
    conn: Mutex<Connection>,
}

impl DbManager {
    /// Open (or create) the database at `path`. Creates the parent directory
    /// if needed and runs the migration gate.
    pub fn open(path: PathBuf) -> Result<Self, AppError> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| AppError::Internal(format!("create db dir failed: {e}")))?;
        }

        let conn = Connection::open(&path)
            .map_err(|e| AppError::Internal(format!("open db failed: {e}")))?;

        let manager = Self {
            conn: Mutex::new(conn),
        };

        manager.init_pragmas()?;
        manager.migrate()?;
        Ok(manager)
    }

    /// Open an in-memory database (primarily for tests / fresh sessions).
    pub fn open_memory() -> Result<Self, AppError> {
        let conn = Connection::open_in_memory()
            .map_err(|e| AppError::Internal(format!("open in-memory db failed: {e}")))?;
        let manager = Self {
            conn: Mutex::new(conn),
        };
        manager.init_pragmas()?;
        manager.migrate()?;
        Ok(manager)
    }

    fn init_pragmas(&self) -> Result<(), AppError> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::Internal("db lock poisoned".into()))?;
        conn.pragma_update(None, "journal_mode", "WAL")
            .map_err(|e| AppError::Internal(format!("pragma WAL failed: {e}")))?;
        conn.pragma_update(None, "foreign_keys", "ON")
            .map_err(|e| AppError::Internal(format!("pragma FK failed: {e}")))?;
        Ok(())
    }

    /// Migration gate implementing OPEN / MIGRATE / REFUSE semantics.
    ///
    /// * on-disk version == SCHEMA_VERSION -> Open
    /// * on-disk version <  SCHEMA_VERSION -> run forward migrations, Migrated
    /// * on-disk version >  SCHEMA_VERSION -> Refused (binary too old)
    pub fn migrate(&self) -> Result<MigrationStatus, AppError> {
        let on_disk = self.user_version()?;

        if on_disk > SCHEMA_VERSION {
            return Ok(MigrationStatus::Refused);
        }

        if on_disk == SCHEMA_VERSION {
            // Ensure the tables exist even if user_version was set elsewhere.
            self.create_core_tables()?;
            return Ok(MigrationStatus::Open);
        }

        // Forward migration from `on_disk + 1` up to SCHEMA_VERSION.
        for version in (on_disk + 1)..=SCHEMA_VERSION {
            self.apply_migration(version)?;
            self.set_user_version(version)?;
        }

        Ok(MigrationStatus::Migrated)
    }

    fn user_version(&self) -> Result<i32, AppError> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::Internal("db lock poisoned".into()))?;
        let version: i32 = conn
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .map_err(|e| AppError::Internal(format!("read user_version failed: {e}")))?;
        Ok(version)
    }

    fn set_user_version(&self, version: i32) -> Result<(), AppError> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::Internal("db lock poisoned".into()))?;
        conn.pragma_update(None, "user_version", version)
            .map_err(|e| AppError::Internal(format!("set user_version failed: {e}")))?;
        Ok(())
    }

    fn create_core_tables(&self) -> Result<(), AppError> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::Internal("db lock poisoned".into()))?;

        // Generic entity tables: id (text/int pk) + JSON payload.
        for table in entity_tables() {
            conn.execute_batch(&format!(
                "CREATE TABLE IF NOT EXISTS \"{table}\" (
                    id TEXT NOT NULL PRIMARY KEY,
                    data TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );"
            ))
            .map_err(|e| AppError::Internal(format!("create table {table} failed: {e}")))?;
        }

        // Append-only history log.
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS event_log (
                seq INTEGER PRIMARY KEY AUTOINCREMENT,
                table_name TEXT NOT NULL,
                row_id TEXT NOT NULL,
                action TEXT NOT NULL,
                data TEXT NOT NULL,
                timestamp TEXT NOT NULL
            );",
        )
        .map_err(|e| AppError::Internal(format!("create event_log failed: {e}")))?;

        // Migration bookkeeping.
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                applied_at TEXT NOT NULL
            );",
        )
        .map_err(|e| AppError::Internal(format!("create schema_migrations failed: {e}")))?;

        // Event log persistence table — stores serialized event envelopes
        // for the event bus. Indexed by workspace, sequence, execution, and correlation.
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS event_persisted_log (
                seq INTEGER NOT NULL,
                event_id TEXT NOT NULL PRIMARY KEY,
                event_type TEXT NOT NULL,
                payload TEXT NOT NULL,
                service TEXT NOT NULL,
                workspace_id TEXT NOT NULL,
                session_id TEXT,
                execution_id TEXT,
                correlation_id TEXT,
                causation_id TEXT,
                emitted_at TEXT NOT NULL
            );
             CREATE INDEX IF NOT EXISTS idx_event_log_workspace_seq
                ON event_persisted_log (workspace_id, seq);
             CREATE INDEX IF NOT EXISTS idx_event_log_execution
                ON event_persisted_log (execution_id);
             CREATE INDEX IF NOT EXISTS idx_event_log_correlation
                ON event_persisted_log (correlation_id);
             CREATE INDEX IF NOT EXISTS idx_event_log_type
                ON event_persisted_log (event_type);",
        )
        .map_err(|e| {
            AppError::Internal(format!("create event_persisted_log + indexes failed: {e}"))
        })?;

        Ok(())
    }

    fn apply_migration(&self, version: i32) -> Result<(), AppError> {
        match version {
            1 => {
                self.create_core_tables()?;
                let conn = self
                    .conn
                    .lock()
                    .map_err(|_| AppError::Internal("db lock poisoned".into()))?;
                let now = now_iso();
                conn.execute(
                    "INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?1, ?2)",
                    rusqlite::params![version, now],
                )
                .map_err(|e| AppError::Internal(format!("record migration failed: {e}")))?;
            }
            2 => {
                self.create_core_tables()?;
                let conn = self
                    .conn
                    .lock()
                    .map_err(|_| AppError::Internal("db lock poisoned".into()))?;
                let now = now_iso();
                conn.execute(
                    "INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?1, ?2)",
                    rusqlite::params![version, now],
                )
                .map_err(|e| AppError::Internal(format!("record migration failed: {e}")))?;
            }
            _ => {
                return Err(AppError::Internal(format!(
                    "unknown migration version: {version}"
                )));
            }
        }
        Ok(())
    }

    fn append_event(
        conn: &Connection,
        table: &str,
        row_id: &str,
        action: &str,
        data: &str,
    ) -> Result<(), AppError> {
        conn.execute(
            "INSERT INTO event_log (table_name, row_id, action, data, timestamp) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![table, row_id, action, data, now_iso()],
        )
        .map_err(|e| AppError::Internal(format!("append event failed: {e}")))?;
        Ok(())
    }

    /// Query rows, optionally filtered by exact-match fields extracted from
    /// the JSON `data` column.
    pub fn query(&self, table: &str, filter: Option<&Value>) -> Result<Vec<Value>, AppError> {
        self.validate_table(table)?;
        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::Internal("db lock poisoned".into()))?;

        let mut stmt = conn
            .prepare(&format!("SELECT data FROM \"{table}\""))
            .map_err(|e| AppError::Internal(format!("prepare query failed: {e}")))?;

        let rows = stmt
            .query_map([], |row| row.get::<usize, String>(0))
            .map_err(|e| AppError::Internal(format!("query failed: {e}")))?;

        let mut out: Vec<Value> = Vec::new();
        for r in rows {
            let raw = r.map_err(|e| AppError::Internal(format!("row read failed: {e}")))?;
            let value: Value = serde_json::from_str(&raw)
                .map_err(|e| AppError::Internal(format!("row parse failed: {e}")))?;
            out.push(value);
        }

        if let Some(f) = filter {
            if let Some(obj) = f.as_object() {
                if !obj.is_empty() {
                    out.retain(|v| match v.as_object() {
                        Some(vo) => obj.iter().all(|(k, want)| match (vo.get(k), want) {
                            (Some(a), b) => json_equal(a, b),
                            _ => false,
                        }),
                        None => false,
                    });
                }
            }
        }

        Ok(out)
    }

    /// Find a single row by id.
    pub fn find_by_id(&self, table: &str, id: &str) -> Result<Option<Value>, AppError> {
        self.validate_table(table)?;
        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::Internal("db lock poisoned".into()))?;

        let mut stmt = conn
            .prepare(&format!("SELECT data FROM \"{table}\" WHERE id = ?1"))
            .map_err(|e| AppError::Internal(format!("prepare find failed: {e}")))?;

        let row = stmt
            .query_row(rusqlite::params![id], |row| row.get::<usize, String>(0))
            .optional()
            .map_err(|e| AppError::Internal(format!("find failed: {e}")))?;

        match row {
            Some(raw) => {
                let value: Value = serde_json::from_str(&raw)
                    .map_err(|e| AppError::Internal(format!("row parse failed: {e}")))?;
                Ok(Some(value))
            }
            None => Ok(None),
        }
    }

    /// Insert a row. The provided object must contain an `id`.
    pub fn insert(&self, table: &str, data: &Value) -> Result<Value, AppError> {
        self.validate_table(table)?;
        let obj = data
            .as_object()
            .ok_or_else(|| AppError::InvalidInput("insert payload must be an object".into()))?;
        let id = obj
            .get("id")
            .and_then(|v| v.as_str())
            .ok_or_else(|| AppError::InvalidInput("insert payload missing string 'id'".into()))?;

        let raw = serde_json::to_string(data)
            .map_err(|e| AppError::Internal(format!("serialize failed: {e}")))?;
        let updated_at = extract_updated_at(obj).to_string();

        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::Internal("db lock poisoned".into()))?;
        conn.execute(
            &format!(
                "INSERT OR REPLACE INTO \"{table}\" (id, data, updated_at) VALUES (?1, ?2, ?3)"
            ),
            rusqlite::params![id, raw, updated_at],
        )
        .map_err(|e| AppError::Internal(format!("insert failed: {e}")))?;
        Self::append_event(&conn, table, id, "insert", &raw)?;

        Ok(data.clone())
    }

    /// Update an existing row by merging `data` over the stored object.
    pub fn update(&self, table: &str, id: &str, data: &Value) -> Result<Value, AppError> {
        self.validate_table(table)?;
        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::Internal("db lock poisoned".into()))?;

        let existing: Option<String> = {
            let mut stmt = conn
                .prepare(&format!("SELECT data FROM \"{table}\" WHERE id = ?1"))
                .map_err(|e| AppError::Internal(format!("prepare update failed: {e}")))?;
            stmt.query_row(rusqlite::params![id], |row| row.get::<usize, String>(0))
                .optional()
                .map_err(|e| AppError::Internal(format!("update find failed: {e}")))?
        };

        let existing =
            existing.ok_or_else(|| AppError::NotFound(format!("row {id} in {table}")))?;
        let mut base: Value = serde_json::from_str(&existing)
            .map_err(|e| AppError::Internal(format!("row parse failed: {e}")))?;

        merge_object(&mut base, data);

        let merged_raw = serde_json::to_string(&base)
            .map_err(|e| AppError::Internal(format!("serialize failed: {e}")))?;
        let updated_at = extract_updated_at(base.as_object().unwrap()).to_string();

        conn.execute(
            &format!("UPDATE \"{table}\" SET data = ?1, updated_at = ?2 WHERE id = ?3"),
            rusqlite::params![merged_raw, updated_at, id],
        )
        .map_err(|e| AppError::Internal(format!("update failed: {e}")))?;
        Self::append_event(&conn, table, id, "update", &merged_raw)?;

        Ok(base)
    }

    /// Delete a row by id.
    pub fn delete(&self, table: &str, id: &str) -> Result<(), AppError> {
        self.validate_table(table)?;
        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::Internal("db lock poisoned".into()))?;

        let affected = conn
            .execute(
                &format!("DELETE FROM \"{table}\" WHERE id = ?1"),
                rusqlite::params![id],
            )
            .map_err(|e| AppError::Internal(format!("delete failed: {e}")))?;

        if affected == 0 {
            return Err(AppError::NotFound(format!("row {id} in {table}")));
        }
        Self::append_event(&conn, table, id, "delete", "{}")?;
        Ok(())
    }

    /// Run multiple statements sequentially inside a single transaction with
    /// rollback-on-error. Each statement is `{ table, action, data }`.
    pub fn transaction(&self, statements: &[DbStatement]) -> Result<Vec<Value>, AppError> {
        let mut conn = self
            .conn
            .lock()
            .map_err(|_| AppError::Internal("db lock poisoned".into()))?;
        let tx = conn
            .transaction()
            .map_err(|e| AppError::Internal(format!("begin tx failed: {e}")))?;

        let mut results: Vec<Value> = Vec::new();
        for stmt in statements {
            self.validate_table(&stmt.table)?;
            match stmt.action.as_str() {
                "insert" | "update" => {
                    let raw = serde_json::to_string(&stmt.data)
                        .map_err(|e| AppError::Internal(format!("serialize failed: {e}")))?;
                    let id = stmt
                        .data
                        .get("id")
                        .and_then(|v| v.as_str())
                        .ok_or_else(|| AppError::InvalidInput("statement missing 'id'".into()))?;
                    let updated_at = extract_updated_at(
                        stmt.data.as_object().unwrap_or(&serde_json::Map::new()),
                    )
                    .to_string();
                    if stmt.action == "insert" {
                        tx.execute(
                            &format!(
                                "INSERT OR REPLACE INTO \"{}\" (id, data, updated_at) VALUES (?1, ?2, ?3)",
                                stmt.table
                            ),
                            rusqlite::params![id, raw, updated_at],
                        )
                        .map_err(|e| AppError::Internal(format!("tx insert failed: {e}")))?;
                    } else {
                        let affected = tx
                            .execute(
                                &format!(
                                    "UPDATE \"{}\" SET data = ?1, updated_at = ?2 WHERE id = ?3",
                                    stmt.table
                                ),
                                rusqlite::params![raw, updated_at, id],
                            )
                            .map_err(|e| AppError::Internal(format!("tx update failed: {e}")))?;
                        if affected == 0 {
                            return Err(AppError::NotFound(format!("row {id} in {}", stmt.table)));
                        }
                    }
                    Self::append_event(&tx, &stmt.table, id, &stmt.action, &raw)?;
                    results.push(stmt.data.clone());
                }
                "delete" => {
                    let id = stmt
                        .data
                        .get("id")
                        .and_then(|v| v.as_str())
                        .ok_or_else(|| AppError::InvalidInput("delete missing 'id'".into()))?;
                    let affected = tx
                        .execute(
                            &format!("DELETE FROM \"{}\" WHERE id = ?1", stmt.table),
                            rusqlite::params![id],
                        )
                        .map_err(|e| AppError::Internal(format!("tx delete failed: {e}")))?;
                    if affected == 0 {
                        return Err(AppError::NotFound(format!("row {id} in {}", stmt.table)));
                    }
                    Self::append_event(&tx, &stmt.table, id, "delete", "{}")?;
                }
                other => {
                    return Err(AppError::InvalidInput(format!("unknown action: {other}")));
                }
            }
        }

        tx.commit()
            .map_err(|e| AppError::Internal(format!("tx commit failed: {e}")))?;
        Ok(results)
    }

    pub fn write_event_log(
        &self,
        request: crate::ipc::EventLogWriteRequest,
    ) -> Result<(), AppError> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::Internal("db lock poisoned".into()))?;
        let data = serde_json::to_string(&request.payload)
            .map_err(|e| AppError::Internal(format!("serialize payload failed: {e}")))?;
        conn.execute(
            "INSERT INTO event_log (table_name, row_id, action, data, timestamp) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![request.workspace_id, request.workspace_id, request.event_type, data, request.timestamp],
        )
        .map_err(|e| AppError::Internal(format!("write event log failed: {e}")))?;
        Ok(())
    }

    /// Write a batch of persisted event envelopes in a single transaction.
    /// Uses INSERT OR IGNORE to skip duplicate event_ids.
    pub fn write_event_log_batch(
        &self,
        events: &[PersistedEventEnvelope],
    ) -> Result<EventLogResult, AppError> {
        let mut conn = self
            .conn
            .lock()
            .map_err(|_| AppError::Internal("db lock poisoned".into()))?;
        let tx = conn
            .transaction()
            .map_err(|e| AppError::Internal(format!("begin tx failed: {e}")))?;

        let mut written = 0u32;
        let mut first_seq = u64::MAX;
        let mut last_seq = 0u64;

        for event in events {
            let affected = tx
                .execute(
                    "INSERT OR IGNORE INTO event_persisted_log \
                     (seq, event_id, event_type, payload, service, workspace_id, \
                      session_id, execution_id, correlation_id, causation_id, emitted_at) \
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
                    rusqlite::params![
                        event.sequence as i64,
                        event.event_id,
                        event.event_type,
                        event.payload,
                        event.service,
                        event.workspace_id,
                        event.session_id,
                        event.execution_id,
                        event.correlation_id,
                        event.causation_id,
                        event.emitted_at,
                    ],
                )
                .map_err(|e| AppError::Internal(format!("insert event failed: {e}")))?;

            if affected > 0 {
                written += 1;
                if event.sequence < first_seq {
                    first_seq = event.sequence;
                }
                if event.sequence > last_seq {
                    last_seq = event.sequence;
                }
            }
        }

        tx.commit()
            .map_err(|e| AppError::Internal(format!("commit failed: {e}")))?;

        if written == 0 {
            return Ok(EventLogResult {
                written: 0,
                first_sequence: 0,
                last_sequence: 0,
            });
        }

        Ok(EventLogResult {
            written,
            first_sequence: first_seq,
            last_sequence: last_seq,
        })
    }

    /// Query the persisted event log with optional filters.
    /// Builds a dynamic WHERE clause from the fields set in `query`.
    pub fn query_event_log(
        &self,
        query: &EventRangeQuery,
    ) -> Result<Vec<PersistedEventEnvelope>, AppError> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::Internal("db lock poisoned".into()))?;

        let mut sql = String::from(
            "SELECT seq, event_id, event_type, payload, service, workspace_id, \
             session_id, execution_id, correlation_id, causation_id, emitted_at \
             FROM event_persisted_log WHERE workspace_id = ?",
        );
        let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
        params.push(Box::new(query.workspace_id.clone()));

        if let Some(fs) = query.from_sequence {
            sql.push_str(" AND seq >= ?");
            params.push(Box::new(fs as i64));
        }
        if let Some(ts) = query.to_sequence {
            sql.push_str(" AND seq <= ?");
            params.push(Box::new(ts as i64));
        }
        if let Some(ref eid) = query.execution_id {
            sql.push_str(" AND execution_id = ?");
            params.push(Box::new(eid.clone()));
        }
        if let Some(ref cid) = query.correlation_id {
            sql.push_str(" AND correlation_id = ?");
            params.push(Box::new(cid.clone()));
        }
        if let Some(ref types) = query.event_types {
            if !types.is_empty() {
                let placeholders = vec!["?"; types.len()].join(",");
                sql.push_str(&format!(" AND event_type IN ({placeholders})"));
                for t in types {
                    params.push(Box::new(t.clone()));
                }
            }
        }

        sql.push_str(" ORDER BY seq ASC");
        if let Some(lim) = query.limit {
            sql.push_str(" LIMIT ?");
            params.push(Box::new(lim as i64));
        }

        let mut stmt = conn
            .prepare(&sql)
            .map_err(|e| AppError::Internal(format!("prepare query failed: {e}")))?;

        let param_refs: Vec<&dyn rusqlite::types::ToSql> =
            params.iter().map(|p| p.as_ref()).collect();

        let rows = stmt
            .query_map(param_refs.as_slice(), |row| {
                Ok(PersistedEventEnvelope {
                    sequence: row.get::<_, i64>(0)? as u64,
                    event_id: row.get(1)?,
                    event_type: row.get(2)?,
                    payload: row.get(3)?,
                    service: row.get(4)?,
                    workspace_id: row.get(5)?,
                    session_id: row.get(6)?,
                    execution_id: row.get(7)?,
                    correlation_id: row.get(8)?,
                    causation_id: row.get(9)?,
                    emitted_at: row.get(10)?,
                })
            })
            .map_err(|e| AppError::Internal(format!("query failed: {e}")))?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row.map_err(|e| AppError::Internal(format!("row read failed: {e}")))?);
        }
        Ok(results)
    }

    /// Return the minimum and maximum sequence numbers for a workspace.
    /// Used for gap detection. Returns (0, 0) when no events exist.
    pub fn get_event_log_range(&self, workspace_id: &str) -> Result<(u64, u64), AppError> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::Internal("db lock poisoned".into()))?;
        let (min_seq, max_seq): (i64, i64) = conn
            .query_row(
                "SELECT COALESCE(MIN(seq), 0), COALESCE(MAX(seq), 0) \
                 FROM event_persisted_log WHERE workspace_id = ?1",
                rusqlite::params![workspace_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .map_err(|e| AppError::Internal(format!("query range failed: {e}")))?;
        Ok((min_seq as u64, max_seq as u64))
    }

    /// Prune old events from the persisted log.
    /// Deletes events where:
    /// - emitted_at < before_timestamp
    /// - execution_id is NULL or not in retained_execution_ids
    /// - event_type does NOT start with 'merge.' or 'permission.'
    pub fn prune_event_log(
        &self,
        before_timestamp: &str,
        retained_execution_ids: &[String],
    ) -> Result<u64, AppError> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::Internal("db lock poisoned".into()))?;

        let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
        params.push(Box::new(before_timestamp.to_string()));

        let mut sql = String::from(
            "DELETE FROM event_persisted_log WHERE emitted_at < ?",
        );

        if retained_execution_ids.is_empty() {
            sql.push_str(" AND execution_id IS NULL");
        } else {
            let placeholders = vec!["?"; retained_execution_ids.len()].join(",");
            sql.push_str(&format!(
                " AND (execution_id IS NULL OR execution_id NOT IN ({placeholders}))"
            ));
            for eid in retained_execution_ids {
                params.push(Box::new(eid.clone()));
            }
        }

        sql.push_str(" AND event_type NOT LIKE 'merge.%'");
        sql.push_str(" AND event_type NOT LIKE 'permission.%'");

        let mut stmt = conn
            .prepare(&sql)
            .map_err(|e| AppError::Internal(format!("prepare prune failed: {e}")))?;

        let param_refs: Vec<&dyn rusqlite::types::ToSql> =
            params.iter().map(|p| p.as_ref()).collect();

        let affected = stmt
            .execute(param_refs.as_slice())
            .map_err(|e| AppError::Internal(format!("prune failed: {e}")))?;

        Ok(affected as u64)
    }

    /// Detect gaps in the event sequence for a workspace.
    /// Returns a GapReport with any missing sequence ranges.
    pub fn detect_log_gaps(&self, workspace_id: &str) -> Result<GapReport, AppError> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::Internal("db lock poisoned".into()))?;

        let mut stmt = conn
            .prepare(
                "SELECT seq FROM event_persisted_log WHERE workspace_id = ?1 ORDER BY seq ASC",
            )
            .map_err(|e| AppError::Internal(format!("prepare gap detection failed: {e}")))?;

        let rows = stmt
            .query_map(rusqlite::params![workspace_id], |row| {
                row.get::<_, i64>(0).map(|s| s as u64)
            })
            .map_err(|e| AppError::Internal(format!("query sequences failed: {e}")))?;

        let mut sequences: Vec<u64> = Vec::new();
        for row in rows {
            sequences.push(row.map_err(|e| AppError::Internal(format!("row read failed: {e}")))?);
        }

        let mut gaps = Vec::new();

        if sequences.is_empty() {
            return Ok(GapReport {
                complete: true,
                gaps,
            });
        }

        // Gap before the first retained sequence — likely pruned
        if sequences[0] > 1 {
            gaps.push(SeqGap {
                from_sequence: 1,
                to_sequence: sequences[0] - 1,
                likely_cause: GapCause::Pruned,
            });
        }

        // Gaps between consecutive retained sequences
        for window in sequences.windows(2) {
            let current = window[0];
            let next = window[1];
            if next != current + 1 {
                gaps.push(SeqGap {
                    from_sequence: current + 1,
                    to_sequence: next - 1,
                    likely_cause: GapCause::Unknown,
                });
            }
        }

        Ok(GapReport {
            complete: gaps.is_empty(),
            gaps,
        })
    }

    /// Look up a single event by its event_id (PRIMARY KEY).
    pub fn get_event_by_id(
        &self,
        event_id: &str,
    ) -> Result<Option<PersistedEventEnvelope>, AppError> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::Internal("db lock poisoned".into()))?;

        let mut stmt = conn
            .prepare(
                "SELECT seq, event_id, event_type, payload, service, workspace_id, \
                 session_id, execution_id, correlation_id, causation_id, emitted_at \
                 FROM event_persisted_log WHERE event_id = ?1",
            )
            .map_err(|e| AppError::Internal(format!("prepare get by id failed: {e}")))?;

        let result = stmt
            .query_row(rusqlite::params![event_id], |row| {
                Ok(PersistedEventEnvelope {
                    sequence: row.get::<_, i64>(0)? as u64,
                    event_id: row.get(1)?,
                    event_type: row.get(2)?,
                    payload: row.get(3)?,
                    service: row.get(4)?,
                    workspace_id: row.get(5)?,
                    session_id: row.get(6)?,
                    execution_id: row.get(7)?,
                    correlation_id: row.get(8)?,
                    causation_id: row.get(9)?,
                    emitted_at: row.get(10)?,
                })
            })
            .optional()
            .map_err(|e| AppError::Internal(format!("get by id failed: {e}")))?;

        Ok(result)
    }

    /// Return aggregate statistics about the persisted event log for a workspace.
    pub fn get_event_log_stats(&self, workspace_id: &str) -> Result<EventLogStats, AppError> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::Internal("db lock poisoned".into()))?;

        let (total, min_seq, max_seq): (i64, i64, i64) = conn
            .query_row(
                "SELECT COUNT(*), COALESCE(MIN(seq), 0), COALESCE(MAX(seq), 0) \
                 FROM event_persisted_log WHERE workspace_id = ?1",
                rusqlite::params![workspace_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .map_err(|e| AppError::Internal(format!("query stats failed: {e}")))?;

        let page_count: i64 = conn
            .pragma_query_value(None, "page_count", |row| row.get(0))
            .map_err(|e| AppError::Internal(format!("pragma page_count failed: {e}")))?;
        let page_size: i64 = conn
            .pragma_query_value(None, "page_size", |row| row.get(0))
            .map_err(|e| AppError::Internal(format!("pragma page_size failed: {e}")))?;

        let size_bytes = (page_count * page_size) as u64;

        Ok(EventLogStats {
            total_events: total as u64,
            min_sequence: min_seq as u64,
            max_sequence: max_seq as u64,
            size_bytes,
        })
    }

    fn validate_table(&self, table: &str) -> Result<(), AppError> {
        if !entity_tables().contains(&table) {
            return Err(AppError::InvalidInput(format!("unknown table: {table}")));
        }
        Ok(())
    }
}

/// A single operation inside `db_transaction`.
#[derive(Debug, Clone)]
pub struct DbStatement {
    pub table: String,
    pub action: String,
    pub data: Value,
}

fn now_iso() -> String {
    // rusqlite does not pull chrono; format current time manually.
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let millis = secs * 1000;
    format_iso8601(millis)
}

fn format_iso8601(millis: u64) -> String {
    let total_secs = millis / 1000;
    let ms = millis % 1000;
    let days = total_secs / 86400;
    // Days from 1970-01-01 to 1970-01-01 baseline; compute date via algorithm.
    let (year, month, day) = ymd_from_days(days as i64);
    let secs_of_day = total_secs % 86400;
    let hour = secs_of_day / 3600;
    let minute = (secs_of_day % 3600) / 60;
    let second = secs_of_day % 60;
    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}Z",
        year, month, day, hour, minute, second, ms
    )
}

fn ymd_from_days(days: i64) -> (i64, u32, u32) {
    // Algorithm adapted from Howard Hinnant's date library.
    let z = days + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = if mp < 10 {
        (mp + 3) as u32
    } else {
        (mp - 9) as u32
    };
    let y = if m <= 2 { y + 1 } else { y };
    (y, m, d)
}

fn extract_updated_at(obj: &serde_json::Map<String, Value>) -> &str {
    obj.get("updated_at").and_then(|v| v.as_str()).unwrap_or("")
}

fn merge_object(base: &mut Value, patch: &Value) {
    if let (Some(b), Some(p)) = (base.as_object_mut(), patch.as_object()) {
        for (k, v) in p {
            b.insert(k.clone(), v.clone());
        }
    }
}

fn json_equal(a: &Value, b: &Value) -> bool {
    match (a, b) {
        (Value::String(x), Value::String(y)) => x == y,
        (Value::Number(x), Value::Number(y)) => x == y,
        (Value::Bool(x), Value::Bool(y)) => x == y,
        (Value::Null, Value::Null) => true,
        _ => serde_json::to_string(a).ok() == serde_json::to_string(b).ok(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn opens_in_memory_and_creates_table() {
        let db = DbManager::open_memory().expect("open memory");
        let status = db.migrate().expect("migrate");
        assert_eq!(status, MigrationStatus::Open);

        let row = serde_json::json!({ "id": "ws_1", "name": "test" });
        db.insert("workspace", &row).expect("insert");

        let found = db.find_by_id("workspace", "ws_1").expect("find");
        assert!(found.is_some());

        let all = db.query("workspace", None).expect("query");
        assert_eq!(all.len(), 1);
    }

    #[test]
    fn refuses_newer_on_disk_version() {
        let db = DbManager::open_memory().expect("open");
        db.set_user_version(SCHEMA_VERSION + 1)
            .expect("set version");
        let status = db.migrate().expect("migrate");
        assert_eq!(status, MigrationStatus::Refused);
    }

    #[test]
    fn appends_history_events() {
        let db = DbManager::open_memory().expect("open");
        db.migrate().expect("migrate");
        db.insert("workspace", &serde_json::json!({ "id": "w1" }))
            .expect("insert");
        db.update("workspace", "w1", &serde_json::json!({ "name": "x" }))
            .expect("update");
        db.delete("workspace", "w1").expect("delete");

        let conn = db.conn.lock().unwrap();
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM event_log", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 3);
    }

    #[test]
    fn transaction_rolls_back_on_error() {
        let db = DbManager::open_memory().expect("open");
        db.migrate().expect("migrate");
        let stmts = vec![
            DbStatement {
                table: "workspace".into(),
                action: "insert".into(),
                data: serde_json::json!({ "id": "ok" }),
            },
            DbStatement {
                table: "workspace".into(),
                action: "update".into(),
                data: serde_json::json!({ "id": "missing" }),
            },
        ];
        let result = db.transaction(&stmts);
        assert!(result.is_err());

        let all = db.query("workspace", None).expect("query");
        assert_eq!(all.len(), 0, "nothing should be committed after rollback");
    }

    #[test]
    fn write_batch_and_query_back() {
        let db = DbManager::open_memory().expect("open");
        db.migrate().expect("migrate");

        let events = vec![
            PersistedEventEnvelope {
                sequence: 1,
                event_id: "evt_1".into(),
                event_type: "test.type".into(),
                payload: r#"{"key":"value"}"#.into(),
                service: "test-svc".into(),
                workspace_id: "ws_1".into(),
                session_id: Some("ses_1".into()),
                execution_id: Some("ex_1".into()),
                correlation_id: Some("corr_1".into()),
                causation_id: Some("caus_1".into()),
                emitted_at: "2026-01-01T00:00:00.000Z".into(),
            },
            PersistedEventEnvelope {
                sequence: 2,
                event_id: "evt_2".into(),
                event_type: "test.other".into(),
                payload: r#"{"n":42}"#.into(),
                service: "test-svc".into(),
                workspace_id: "ws_1".into(),
                session_id: None,
                execution_id: None,
                correlation_id: None,
                causation_id: None,
                emitted_at: "2026-01-02T00:00:00.000Z".into(),
            },
        ];

        let result = db.write_event_log_batch(&events).expect("write batch");
        assert_eq!(result.written, 2);
        assert_eq!(result.first_sequence, 1);
        assert_eq!(result.last_sequence, 2);

        let query = EventRangeQuery {
            workspace_id: "ws_1".into(),
            from_sequence: None,
            to_sequence: None,
            execution_id: None,
            correlation_id: None,
            event_types: None,
            limit: None,
        };
        let results = db.query_event_log(&query).expect("query");
        assert_eq!(results.len(), 2);
        assert_eq!(results[0].event_id, "evt_1");
        assert_eq!(results[1].event_id, "evt_2");
    }

    #[test]
    fn write_batch_deduplicates_event_id() {
        let db = DbManager::open_memory().expect("open");
        db.migrate().expect("migrate");

        let event = PersistedEventEnvelope {
            sequence: 1,
            event_id: "evt_dup".into(),
            event_type: "test.type".into(),
            payload: "{}".into(),
            service: "test".into(),
            workspace_id: "ws_1".into(),
            session_id: None,
            execution_id: None,
            correlation_id: None,
            causation_id: None,
            emitted_at: "2026-01-01T00:00:00.000Z".into(),
        };

        let r1 = db.write_event_log_batch(&[event.clone()]).expect("first write");
        assert_eq!(r1.written, 1);

        let r2 = db.write_event_log_batch(&[event.clone()]).expect("duplicate write");
        assert_eq!(r2.written, 0, "duplicate event_id should be ignored");
    }

    #[test]
    fn query_with_filters() {
        let db = DbManager::open_memory().expect("open");
        db.migrate().expect("migrate");

        let events = vec![
            PersistedEventEnvelope {
                sequence: 1,
                event_id: "e1".into(),
                event_type: "type.a".into(),
                payload: "{}".into(),
                service: "s1".into(),
                workspace_id: "ws_f".into(),
                session_id: None,
                execution_id: Some("ex_a".into()),
                correlation_id: Some("corr_x".into()),
                causation_id: None,
                emitted_at: "2026-01-01T00:00:00.000Z".into(),
            },
            PersistedEventEnvelope {
                sequence: 2,
                event_id: "e2".into(),
                event_type: "type.b".into(),
                payload: "{}".into(),
                service: "s1".into(),
                workspace_id: "ws_f".into(),
                session_id: None,
                execution_id: Some("ex_b".into()),
                correlation_id: Some("corr_y".into()),
                causation_id: None,
                emitted_at: "2026-01-02T00:00:00.000Z".into(),
            },
            PersistedEventEnvelope {
                sequence: 3,
                event_id: "e3".into(),
                event_type: "type.a".into(),
                payload: "{}".into(),
                service: "s1".into(),
                workspace_id: "ws_f".into(),
                session_id: None,
                execution_id: Some("ex_a".into()),
                correlation_id: Some("corr_x".into()),
                causation_id: None,
                emitted_at: "2026-01-03T00:00:00.000Z".into(),
            },
        ];
        db.write_event_log_batch(&events).expect("write batch");

        // Filter by execution_id
        let q = EventRangeQuery {
            workspace_id: "ws_f".into(),
            from_sequence: None,
            to_sequence: None,
            execution_id: Some("ex_a".into()),
            correlation_id: None,
            event_types: None,
            limit: None,
        };
        let results = db.query_event_log(&q).expect("query by execution");
        assert_eq!(results.len(), 2);

        // Filter by event_types
        let q = EventRangeQuery {
            workspace_id: "ws_f".into(),
            from_sequence: None,
            to_sequence: None,
            execution_id: None,
            correlation_id: None,
            event_types: Some(vec!["type.b".into()]),
            limit: None,
        };
        let results = db.query_event_log(&q).expect("query by type");
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].event_id, "e2");

        // Filter by sequence range
        let q = EventRangeQuery {
            workspace_id: "ws_f".into(),
            from_sequence: Some(2),
            to_sequence: Some(2),
            execution_id: None,
            correlation_id: None,
            event_types: None,
            limit: None,
        };
        let results = db.query_event_log(&q).expect("query by range");
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].event_id, "e2");

        // Filter by correlation_id
        let q = EventRangeQuery {
            workspace_id: "ws_f".into(),
            from_sequence: None,
            to_sequence: None,
            execution_id: None,
            correlation_id: Some("corr_y".into()),
            event_types: None,
            limit: None,
        };
        let results = db.query_event_log(&q).expect("query by correlation");
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].event_id, "e2");

        // Limit
        let q = EventRangeQuery {
            workspace_id: "ws_f".into(),
            from_sequence: None,
            to_sequence: None,
            execution_id: None,
            correlation_id: None,
            event_types: None,
            limit: Some(1),
        };
        let results = db.query_event_log(&q).expect("query with limit");
        assert_eq!(results.len(), 1);
    }

    #[test]
    fn range_detection() {
        let db = DbManager::open_memory().expect("open");
        db.migrate().expect("migrate");

        let (min, max) = db.get_event_log_range("ws_r").expect("empty range");
        assert_eq!(min, 0);
        assert_eq!(max, 0);

        let events = vec![
            PersistedEventEnvelope {
                sequence: 10,
                event_id: "r1".into(),
                event_type: "t".into(),
                payload: "{}".into(),
                service: "s".into(),
                workspace_id: "ws_r".into(),
                session_id: None,
                execution_id: None,
                correlation_id: None,
                causation_id: None,
                emitted_at: "2026-01-01T00:00:00.000Z".into(),
            },
            PersistedEventEnvelope {
                sequence: 20,
                event_id: "r2".into(),
                event_type: "t".into(),
                payload: "{}".into(),
                service: "s".into(),
                workspace_id: "ws_r".into(),
                session_id: None,
                execution_id: None,
                correlation_id: None,
                causation_id: None,
                emitted_at: "2026-01-02T00:00:00.000Z".into(),
            },
        ];
        db.write_event_log_batch(&events).expect("write batch");

        let (min, max) = db.get_event_log_range("ws_r").expect("range");
        assert_eq!(min, 10);
        assert_eq!(max, 20);
    }

    #[test]
    fn gap_detection() {
        let db = DbManager::open_memory().expect("open");
        db.migrate().expect("migrate");

        let report = db.detect_log_gaps("ws_g").expect("detect gaps empty");
        assert!(report.complete);
        assert!(report.gaps.is_empty());

        let events = vec![
            PersistedEventEnvelope {
                sequence: 2,
                event_id: "g1".into(),
                event_type: "t".into(),
                payload: "{}".into(),
                service: "s".into(),
                workspace_id: "ws_g".into(),
                session_id: None,
                execution_id: None,
                correlation_id: None,
                causation_id: None,
                emitted_at: "2026-01-01T00:00:00.000Z".into(),
            },
            PersistedEventEnvelope {
                sequence: 5,
                event_id: "g2".into(),
                event_type: "t".into(),
                payload: "{}".into(),
                service: "s".into(),
                workspace_id: "ws_g".into(),
                session_id: None,
                execution_id: None,
                correlation_id: None,
                causation_id: None,
                emitted_at: "2026-01-02T00:00:00.000Z".into(),
            },
        ];
        db.write_event_log_batch(&events).expect("write batch");

        let report = db.detect_log_gaps("ws_g").expect("detect gaps");
        assert!(!report.complete);
        assert_eq!(report.gaps.len(), 2);

        // Gap before first sequence: 1 (pruned)
        assert_eq!(report.gaps[0].from_sequence, 1);
        assert_eq!(report.gaps[0].to_sequence, 1);
        assert!(matches!(report.gaps[0].likely_cause, GapCause::Pruned));

        // Gap between 2 and 5: 3-4 (unknown)
        assert_eq!(report.gaps[1].from_sequence, 3);
        assert_eq!(report.gaps[1].to_sequence, 4);
        assert!(matches!(report.gaps[1].likely_cause, GapCause::Unknown));
    }

    #[test]
    fn event_by_id_lookup() {
        let db = DbManager::open_memory().expect("open");
        db.migrate().expect("migrate");

        let found = db.get_event_by_id("nonexistent").expect("lookup missing");
        assert!(found.is_none());

        let event = PersistedEventEnvelope {
            sequence: 1,
            event_id: "lookup_me".into(),
            event_type: "test.lookup".into(),
            payload: r#"{"found":true}"#.into(),
            service: "svc".into(),
            workspace_id: "ws_l".into(),
            session_id: None,
            execution_id: None,
            correlation_id: None,
            causation_id: None,
            emitted_at: "2026-01-01T00:00:00.000Z".into(),
        };
        db.write_event_log_batch(&[event]).expect("write batch");

        let found = db.get_event_by_id("lookup_me").expect("lookup exists");
        assert!(found.is_some());
        let env = found.unwrap();
        assert_eq!(env.event_type, "test.lookup");
        assert_eq!(env.payload, r#"{"found":true}"#);
    }

    #[test]
    fn prune_logic() {
        let db = DbManager::open_memory().expect("open");
        db.migrate().expect("migrate");

        let events = vec![
            // Old event, no execution - should be pruned
            PersistedEventEnvelope {
                sequence: 1,
                event_id: "old_no_exec".into(),
                event_type: "test.old".into(),
                payload: "{}".into(),
                service: "s".into(),
                workspace_id: "ws_p".into(),
                session_id: None,
                execution_id: None,
                correlation_id: None,
                causation_id: None,
                emitted_at: "2025-01-01T00:00:00.000Z".into(),
            },
            // Old event, retained execution - should be kept
            PersistedEventEnvelope {
                sequence: 2,
                event_id: "old_retained".into(),
                event_type: "test.old".into(),
                payload: "{}".into(),
                service: "s".into(),
                workspace_id: "ws_p".into(),
                session_id: None,
                execution_id: Some("keep_ex".into()),
                correlation_id: None,
                causation_id: None,
                emitted_at: "2025-01-01T00:00:00.000Z".into(),
            },
            // Old event, non-retained execution - should be pruned
            PersistedEventEnvelope {
                sequence: 3,
                event_id: "old_non_retained".into(),
                event_type: "test.old".into(),
                payload: "{}".into(),
                service: "s".into(),
                workspace_id: "ws_p".into(),
                session_id: None,
                execution_id: Some("prune_ex".into()),
                correlation_id: None,
                causation_id: None,
                emitted_at: "2025-01-01T00:00:00.000Z".into(),
            },
            // merge. event - should be kept regardless
            PersistedEventEnvelope {
                sequence: 4,
                event_id: "merge_event".into(),
                event_type: "merge.completed".into(),
                payload: "{}".into(),
                service: "s".into(),
                workspace_id: "ws_p".into(),
                session_id: None,
                execution_id: None,
                correlation_id: None,
                causation_id: None,
                emitted_at: "2025-01-01T00:00:00.000Z".into(),
            },
            // permission. event - should be kept regardless
            PersistedEventEnvelope {
                sequence: 5,
                event_id: "permission_event".into(),
                event_type: "permission.granted".into(),
                payload: "{}".into(),
                service: "s".into(),
                workspace_id: "ws_p".into(),
                session_id: None,
                execution_id: None,
                correlation_id: None,
                causation_id: None,
                emitted_at: "2025-01-01T00:00:00.000Z".into(),
            },
            // Recent event - should be kept (not before timestamp)
            PersistedEventEnvelope {
                sequence: 6,
                event_id: "recent_event".into(),
                event_type: "test.recent".into(),
                payload: "{}".into(),
                service: "s".into(),
                workspace_id: "ws_p".into(),
                session_id: None,
                execution_id: None,
                correlation_id: None,
                causation_id: None,
                emitted_at: "2026-06-01T00:00:00.000Z".into(),
            },
        ];
        db.write_event_log_batch(&events).expect("write batch");

        let deleted = db
            .prune_event_log("2026-01-01T00:00:00.000Z", &["keep_ex".to_string()])
            .expect("prune");
        assert_eq!(deleted, 2, "should prune old_no_exec and old_non_retained");

        // Verify remaining events
        let q = EventRangeQuery {
            workspace_id: "ws_p".into(),
            from_sequence: None,
            to_sequence: None,
            execution_id: None,
            correlation_id: None,
            event_types: None,
            limit: None,
        };
        let remaining = db.query_event_log(&q).expect("query after prune");
        let ids: Vec<&str> = remaining.iter().map(|e| e.event_id.as_str()).collect();
        assert!(ids.contains(&"old_retained"));
        assert!(ids.contains(&"merge_event"));
        assert!(ids.contains(&"permission_event"));
        assert!(ids.contains(&"recent_event"));
        assert!(!ids.contains(&"old_no_exec"));
        assert!(!ids.contains(&"old_non_retained"));
    }

    #[test]
    fn empty_workspace_returns_empty() {
        let db = DbManager::open_memory().expect("open");
        db.migrate().expect("migrate");

        let q = EventRangeQuery {
            workspace_id: "ws_empty".into(),
            from_sequence: None,
            to_sequence: None,
            execution_id: None,
            correlation_id: None,
            event_types: None,
            limit: None,
        };
        let results = db.query_event_log(&q).expect("query empty");
        assert!(results.is_empty());

        let (min, max) = db.get_event_log_range("ws_empty").expect("range empty");
        assert_eq!(min, 0);
        assert_eq!(max, 0);

        let report = db.detect_log_gaps("ws_empty").expect("gaps empty");
        assert!(report.complete);
        assert!(report.gaps.is_empty());

        let stats = db.get_event_log_stats("ws_empty").expect("stats empty");
        assert_eq!(stats.total_events, 0);
        assert_eq!(stats.min_sequence, 0);
        assert_eq!(stats.max_sequence, 0);
    }
}

use std::path::PathBuf;
use std::sync::Mutex;

use rusqlite::{Connection, OptionalExtension};
use serde_json::Value;

use crate::error::AppError;

/// Version of the on-disk SQLite schema. Bump this when migrations change.
/// Mirrors `SCHEMA_VERSION` in `src/database/schema.ts`.
pub const SCHEMA_VERSION: i32 = 1;

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
        let conn = self.conn.lock().map_err(|_| AppError::Internal("db lock poisoned".into()))?;
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
        let conn = self.conn.lock().map_err(|_| AppError::Internal("db lock poisoned".into()))?;
        let version: i32 = conn
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .map_err(|e| AppError::Internal(format!("read user_version failed: {e}")))?;
        Ok(version)
    }

    fn set_user_version(&self, version: i32) -> Result<(), AppError> {
        let conn = self.conn.lock().map_err(|_| AppError::Internal("db lock poisoned".into()))?;
        conn.pragma_update(None, "user_version", version)
            .map_err(|e| AppError::Internal(format!("set user_version failed: {e}")))?;
        Ok(())
    }

    fn create_core_tables(&self) -> Result<(), AppError> {
        let conn = self.conn.lock().map_err(|_| AppError::Internal("db lock poisoned".into()))?;

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

        Ok(())
    }

    fn apply_migration(&self, version: i32) -> Result<(), AppError> {
        match version {
            1 => {
                self.create_core_tables()?;
                let conn =
                    self.conn.lock().map_err(|_| AppError::Internal("db lock poisoned".into()))?;
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
        let conn = self.conn.lock().map_err(|_| AppError::Internal("db lock poisoned".into()))?;

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
        let conn = self.conn.lock().map_err(|_| AppError::Internal("db lock poisoned".into()))?;

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

        let conn = self.conn.lock().map_err(|_| AppError::Internal("db lock poisoned".into()))?;
        conn.execute(
            &format!("INSERT OR REPLACE INTO \"{table}\" (id, data, updated_at) VALUES (?1, ?2, ?3)"),
            rusqlite::params![id, raw, updated_at],
        )
        .map_err(|e| AppError::Internal(format!("insert failed: {e}")))?;
        Self::append_event(&conn, table, id, "insert", &raw)?;

        Ok(data.clone())
    }

    /// Update an existing row by merging `data` over the stored object.
    pub fn update(&self, table: &str, id: &str, data: &Value) -> Result<Value, AppError> {
        self.validate_table(table)?;
        let conn = self.conn.lock().map_err(|_| AppError::Internal("db lock poisoned".into()))?;

        let existing: Option<String> = {
            let mut stmt = conn
                .prepare(&format!("SELECT data FROM \"{table}\" WHERE id = ?1"))
                .map_err(|e| AppError::Internal(format!("prepare update failed: {e}")))?;
            stmt.query_row(rusqlite::params![id], |row| row.get::<usize, String>(0))
                .optional()
                .map_err(|e| AppError::Internal(format!("update find failed: {e}")))?
        };

        let existing = existing.ok_or_else(|| AppError::NotFound(format!("row {id} in {table}")))?;
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
        let conn = self.conn.lock().map_err(|_| AppError::Internal("db lock poisoned".into()))?;

        let affected = conn
            .execute(&format!("DELETE FROM \"{table}\" WHERE id = ?1"), rusqlite::params![id])
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
        let mut conn = self.conn.lock().map_err(|_| AppError::Internal("db lock poisoned".into()))?;
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
                    let updated_at =
                        extract_updated_at(stmt.data.as_object().unwrap_or(&serde_json::Map::new()))
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

fn is_leap(y: i64) -> bool {
    (y % 4 == 0 && y % 100 != 0) || y % 400 == 0
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
    let m = if mp < 10 { (mp + 3) as u32 } else { (mp - 9) as u32 };
    let y = if m <= 2 { y + 1 } else { y };
    (y, m, d)
}

fn extract_updated_at(obj: &serde_json::Map<String, Value>) -> &str {
    obj.get("updated_at")
        .and_then(|v| v.as_str())
        .unwrap_or("")
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
}


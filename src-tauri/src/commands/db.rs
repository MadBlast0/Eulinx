use serde::Deserialize;
use serde_json::Value;
use tauri::{AppHandle, Manager, State};

use crate::managers::db_manager::{DbManager, DbStatement};
use crate::state::AppState;

#[derive(Debug, Clone, Deserialize)]
pub struct TransactionStatement {
    pub table: String,
    pub action: String,
    pub data: Value,
}

#[tauri::command]
pub fn db_query(db: State<DbManager>, table: String, filter: Option<Value>) -> Result<Vec<Value>, String> {
    db.query(&table, filter.as_ref()).map_err(|e| e.to_string())
}

/// Coerce a JSON `id` value (string or integer) into the canonical string form
/// used by the storage layer. Extracted so it can be unit tested.
fn coerce_id(id: &Value) -> Result<String, String> {
    id.as_str()
        .map(|s| s.to_string())
        .or_else(|| id.as_i64().map(|n| n.to_string()))
        .ok_or_else(|| "id must be a string or number".to_string())
}

#[tauri::command]
pub fn db_find_by_id(db: State<DbManager>, table: String, id: Value) -> Result<Option<Value>, String> {
    let id_str = coerce_id(&id)?;
    db.find_by_id(&table, &id_str).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn db_insert(db: State<DbManager>, table: String, data: Value) -> Result<Value, String> {
    db.insert(&table, &data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn db_update(db: State<DbManager>, table: String, id: Value, data: Value) -> Result<Value, String> {
    let id_str = coerce_id(&id)?;
    db.update(&table, &id_str, &data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn db_delete(db: State<DbManager>, table: String, id: Value) -> Result<(), String> {
    let id_str = coerce_id(&id)?;
    db.delete(&table, &id_str).map_err(|e| e.to_string())
}

/// Write an event to the event log, auto-assigning a monotonic sequence number.
#[tauri::command]
pub async fn db_write_event_log(
    app: AppHandle,
    mut request: crate::ipc::EventLogWriteRequest,
) -> Result<(), String> {
    // Auto-assign sequence from AppState's monotonic counter.
    let state = app.state::<AppState>();
    let seq = {
        let mut counter = state.event_seq.write().await;
        *counter += 1;
        *counter
    };
    request.sequence = seq;

    let db = app.state::<DbManager>();
    db.write_event_log(request).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn db_transaction(db: State<DbManager>, statements: Vec<TransactionStatement>) -> Result<Vec<Value>, String> {
    let stmts: Vec<DbStatement> = statements
        .into_iter()
        .map(|s| DbStatement {
            table: s.table,
            action: s.action,
            data: s.data,
        })
        .collect();
    db.transaction(&stmts).map_err(|e| e.to_string())
}

/// Get the current event sequence counter value.
#[tauri::command]
pub async fn db_get_event_seq(app: AppHandle) -> Result<u64, String> {
    let state = app.state::<AppState>();
    let seq = state.event_seq.read().await;
    Ok(*seq)
}

/// Check if the app is running in native (Tauri) mode.
#[tauri::command]
pub fn db_is_native(app: AppHandle) -> Result<bool, String> {
    let state = app.state::<AppState>();
    Ok(state.is_native)
}

/// Get info about an active PTY session.
#[tauri::command]
pub async fn pty_get_session_info(
    app: AppHandle,
    id: String,
) -> Result<Option<serde_json::Value>, String> {
    let state = app.state::<AppState>();
    let sessions = state.pty_sessions.read().await;
    Ok(sessions.get(&id).map(|s| {
        serde_json::json!({
            "pid": s.pid,
            "started_at": s.started_at,
            "cmd": s.cmd,
        })
    }))
}

/// List all active PTY session IDs.
#[tauri::command]
pub async fn pty_list_sessions(app: AppHandle) -> Result<Vec<String>, String> {
    let state = app.state::<AppState>();
    let sessions = state.pty_sessions.read().await;
    Ok(sessions.keys().cloned().collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn coerce_id_accepts_string() {
        assert_eq!(coerce_id(&serde_json::json!("ws_1")).unwrap(), "ws_1");
    }

    #[test]
    fn coerce_id_accepts_integer() {
        assert_eq!(coerce_id(&serde_json::json!(42)).unwrap(), "42");
    }

    #[test]
    fn coerce_id_rejects_other_types() {
        assert!(coerce_id(&serde_json::json!(true)).is_err());
        assert!(coerce_id(&serde_json::json!(null)).is_err());
        assert!(coerce_id(&serde_json::json!({ "a": 1 })).is_err());
    }

    #[test]
    fn transaction_statements_map_into_db_statements() {
        let input = vec![TransactionStatement {
            table: "workspace".into(),
            action: "insert".into(),
            data: serde_json::json!({ "id": "w1" }),
        }];
        let stmts: Vec<DbStatement> = input
            .into_iter()
            .map(|s| DbStatement {
                table: s.table,
                action: s.action,
                data: s.data,
            })
            .collect();
        assert_eq!(stmts.len(), 1);
        assert_eq!(stmts[0].table, "workspace");
        assert_eq!(stmts[0].action, "insert");
    }

    /// Exercise the CRUD flow the commands delegate to, using an in-memory DB.
    #[test]
    fn crud_flow_via_db_manager() {
        let db = DbManager::open_memory().expect("open memory");

        let id = coerce_id(&serde_json::json!("t1")).unwrap();
        db.insert("task", &serde_json::json!({ "id": "t1", "title": "a" }))
            .expect("insert");

        assert!(db.find_by_id("task", &id).expect("find").is_some());

        db.update("task", &id, &serde_json::json!({ "title": "b" }))
            .expect("update");

        db.delete("task", &id).expect("delete");
        assert!(db.find_by_id("task", &id).expect("find").is_none());
    }
}

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersistedEventEnvelope {
    pub sequence: u64,
    pub event_id: String,
    pub event_type: String,
    pub payload: String,
    pub service: String,
    pub workspace_id: String,
    pub session_id: Option<String>,
    pub execution_id: Option<String>,
    pub correlation_id: Option<String>,
    pub causation_id: Option<String>,
    pub emitted_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventRangeQuery {
    pub workspace_id: String,
    pub from_sequence: Option<u64>,
    pub to_sequence: Option<u64>,
    pub execution_id: Option<String>,
    pub correlation_id: Option<String>,
    pub event_types: Option<Vec<String>>,
    pub limit: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GapReport {
    pub complete: bool,
    pub gaps: Vec<SeqGap>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SeqGap {
    pub from_sequence: u64,
    pub to_sequence: u64,
    pub likely_cause: GapCause,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum GapCause {
    Pruned,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventLogResult {
    pub written: u32,
    pub first_sequence: u64,
    pub last_sequence: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventLogStats {
    pub total_events: u64,
    pub min_sequence: u64,
    pub max_sequence: u64,
    pub size_bytes: u64,
}

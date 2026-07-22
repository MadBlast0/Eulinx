use crate::scheduler::types::{
    BlockerKind, FailureCategory, SchedulingPriority, SchedulingState, SchedulingUnit,
    SchedulingUnitKind,
};
use crossbeam_channel::{unbounded, Receiver, Sender};
use serde::{Deserialize, Serialize};

// ---------------------------------------------------------------------------
// Scheduler Event Payloads
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SchedulerStartedPayload {
    pub max_concurrency: u32,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SchedulerStoppedPayload {
    pub reason: String, // "user_request" | "shutdown" | "error"
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SchedulerPausedPayload {
    pub reason: String,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SchedulerResumedPayload {
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SchedulerUnitEventPayload {
    pub unit_id: String,
    pub kind: SchedulingUnitKind,
    pub priority: SchedulingPriority,
    pub state: SchedulingState,
    pub workspace_id: String,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SchedulerUnitBlockedPayload {
    pub unit_id: String,
    pub kind: SchedulingUnitKind,
    pub priority: SchedulingPriority,
    pub blocker_kind: BlockerKind,
    pub blocker_message: String,
    pub blocking_object_id: Option<String>,
    pub recoverable: bool,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SchedulerUnitUnblockedPayload {
    pub unit_id: String,
    pub kind: SchedulingUnitKind,
    pub priority: SchedulingPriority,
    pub resolved_blocker_kind: BlockerKind,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SchedulerUnitCompletedPayload {
    pub unit_id: String,
    pub kind: SchedulingUnitKind,
    pub priority: SchedulingPriority,
    pub duration_ms: u64,
    pub attempt: u32,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SchedulerUnitFailedPayload {
    pub unit_id: String,
    pub kind: SchedulingUnitKind,
    pub priority: SchedulingPriority,
    pub failure_category: FailureCategory,
    pub error: String,
    pub attempt: u32,
    pub will_retry: bool,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SchedulerUnitCancelledPayload {
    pub unit_id: String,
    pub kind: SchedulingUnitKind,
    pub priority: SchedulingPriority,
    pub reason: String,
    pub requested_by: String, // "user" | "scheduler" | "runtime"
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SchedulerUnitRetryScheduledPayload {
    pub unit_id: String,
    pub kind: SchedulingUnitKind,
    pub attempt: u32,
    pub max_attempts: u32,
    pub delay_ms: u64,
    pub next_eligible_at: String, // ISO timestamp
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SchedulerBudgetExhaustedPayload {
    pub unit_id: String,
    pub budget_kind: String,
    pub consumed: f64,
    pub limit: f64,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SchedulerLockWaitingPayload {
    pub unit_id: String,
    pub lock_id: String,
    pub resource: String,
    pub current_holder_id: String,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SchedulerPermissionWaitingPayload {
    pub unit_id: String,
    pub permission: String,
    pub timestamp: String,
}

// ---------------------------------------------------------------------------
// Scheduler Event Enum
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", content = "payload")]
pub enum SchedulerEvent {
    Started(SchedulerStartedPayload),
    Stopped(SchedulerStoppedPayload),
    Paused(SchedulerPausedPayload),
    Resumed(SchedulerResumedPayload),
    UnitEnqueued(SchedulerUnitEventPayload),
    UnitDispatched(SchedulerUnitEventPayload),
    UnitBlocked(SchedulerUnitBlockedPayload),
    UnitUnblocked(SchedulerUnitUnblockedPayload),
    UnitCompleted(SchedulerUnitCompletedPayload),
    UnitFailed(SchedulerUnitFailedPayload),
    UnitCancelled(SchedulerUnitCancelledPayload),
    RetryScheduled(SchedulerUnitRetryScheduledPayload),
    BudgetExhausted(SchedulerBudgetExhaustedPayload),
    LockWaiting(SchedulerLockWaitingPayload),
    PermissionWaiting(SchedulerPermissionWaitingPayload),
}

// ---------------------------------------------------------------------------
// Event Emitter
// ---------------------------------------------------------------------------

pub struct SchedulerEventEmitter {
    tx: Sender<SchedulerEvent>,
}

impl SchedulerEventEmitter {
    pub fn new() -> (Self, Receiver<SchedulerEvent>) {
        let (tx, rx) = unbounded();
        (Self { tx }, rx)
    }

    pub fn emit(&self, event: SchedulerEvent) {
        let _ = self.tx.send(event);
    }
}

impl Default for SchedulerEventEmitter {
    fn default() -> Self {
        Self::new().0
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::scheduler::types::{
        BlockerKind, FailureCategory, SchedulingPriority, SchedulingState, SchedulingUnitKind,
    };
    use crate::scheduler::time_utils::now_iso;

    fn ts() -> String {
        now_iso()
    }

    #[test]
    fn test_emit_receive() {
        let (emitter, rx) = SchedulerEventEmitter::new();
        let event = SchedulerEvent::Started(SchedulerStartedPayload {
            max_concurrency: 4,
            timestamp: ts(),
        });
        emitter.emit(event);
        let received = rx.recv().unwrap();
        assert!(matches!(received, SchedulerEvent::Started(_)));
    }

    #[test]
    fn test_all_variants_serde() {
        let events: Vec<SchedulerEvent> = vec![
            SchedulerEvent::Started(SchedulerStartedPayload {
                max_concurrency: 8,
                timestamp: ts(),
            }),
            SchedulerEvent::Stopped(SchedulerStoppedPayload {
                reason: "shutdown".to_string(),
                timestamp: ts(),
            }),
            SchedulerEvent::Paused(SchedulerPausedPayload {
                reason: "manual".to_string(),
                timestamp: ts(),
            }),
            SchedulerEvent::Resumed(SchedulerResumedPayload { timestamp: ts() }),
            SchedulerEvent::UnitEnqueued(SchedulerUnitEventPayload {
                unit_id: "u1".to_string(),
                kind: SchedulingUnitKind::Task,
                priority: SchedulingPriority::Normal,
                state: SchedulingState::Queued,
                workspace_id: "ws1".to_string(),
                timestamp: ts(),
            }),
            SchedulerEvent::UnitDispatched(SchedulerUnitEventPayload {
                unit_id: "u2".to_string(),
                kind: SchedulingUnitKind::ToolInvocation,
                priority: SchedulingPriority::High,
                state: SchedulingState::Running,
                workspace_id: "ws1".to_string(),
                timestamp: ts(),
            }),
            SchedulerEvent::UnitBlocked(SchedulerUnitBlockedPayload {
                unit_id: "u3".to_string(),
                kind: SchedulingUnitKind::Task,
                priority: SchedulingPriority::Low,
                blocker_kind: BlockerKind::Lock,
                blocker_message: "waiting".to_string(),
                blocking_object_id: Some("lock1".to_string()),
                recoverable: true,
                timestamp: ts(),
            }),
            SchedulerEvent::UnitUnblocked(SchedulerUnitUnblockedPayload {
                unit_id: "u3".to_string(),
                kind: SchedulingUnitKind::Task,
                priority: SchedulingPriority::Low,
                resolved_blocker_kind: BlockerKind::Lock,
                timestamp: ts(),
            }),
            SchedulerEvent::UnitCompleted(SchedulerUnitCompletedPayload {
                unit_id: "u4".to_string(),
                kind: SchedulingUnitKind::Task,
                priority: SchedulingPriority::Normal,
                duration_ms: 1234,
                attempt: 1,
                timestamp: ts(),
            }),
            SchedulerEvent::UnitFailed(SchedulerUnitFailedPayload {
                unit_id: "u5".to_string(),
                kind: SchedulingUnitKind::Task,
                priority: SchedulingPriority::Normal,
                failure_category: FailureCategory::Timeout,
                error: "boom".to_string(),
                attempt: 2,
                will_retry: true,
                timestamp: ts(),
            }),
            SchedulerEvent::UnitCancelled(SchedulerUnitCancelledPayload {
                unit_id: "u6".to_string(),
                kind: SchedulingUnitKind::Task,
                priority: SchedulingPriority::Low,
                reason: "user".to_string(),
                requested_by: "user".to_string(),
                timestamp: ts(),
            }),
            SchedulerEvent::RetryScheduled(SchedulerUnitRetryScheduledPayload {
                unit_id: "u5".to_string(),
                kind: SchedulingUnitKind::Task,
                attempt: 2,
                max_attempts: 3,
                delay_ms: 1000,
                next_eligible_at: ts(),
                timestamp: ts(),
            }),
            SchedulerEvent::BudgetExhausted(SchedulerBudgetExhaustedPayload {
                unit_id: "u7".to_string(),
                budget_kind: "cost".to_string(),
                consumed: 100.0,
                limit: 50.0,
                timestamp: ts(),
            }),
            SchedulerEvent::LockWaiting(SchedulerLockWaitingPayload {
                unit_id: "u8".to_string(),
                lock_id: "lock1".to_string(),
                resource: "res1".to_string(),
                current_holder_id: "u2".to_string(),
                timestamp: ts(),
            }),
            SchedulerEvent::PermissionWaiting(SchedulerPermissionWaitingPayload {
                unit_id: "u9".to_string(),
                permission: "write".to_string(),
                timestamp: ts(),
            }),
        ];

        assert_eq!(events.len(), 15);

        for event in &events {
            let json = serde_json::to_string(event).unwrap();
            let back: SchedulerEvent = serde_json::from_str(&json).unwrap();
            assert_eq!(event, &back);
        }
    }

    #[test]
    fn test_event_order_preserved() {
        let (emitter, rx) = SchedulerEventEmitter::new();
        emitter.emit(SchedulerEvent::Started(SchedulerStartedPayload {
            max_concurrency: 2,
            timestamp: ts(),
        }));
        emitter.emit(SchedulerEvent::Paused(SchedulerPausedPayload {
            reason: "x".to_string(),
            timestamp: ts(),
        }));
        emitter.emit(SchedulerEvent::Resumed(SchedulerResumedPayload {
            timestamp: ts(),
        }));

        assert!(matches!(rx.recv().unwrap(), SchedulerEvent::Started(_)));
        assert!(matches!(rx.recv().unwrap(), SchedulerEvent::Paused(_)));
        assert!(matches!(rx.recv().unwrap(), SchedulerEvent::Resumed(_)));
    }

    #[test]
    fn test_clone_events() {
        let event = SchedulerEvent::UnitCompleted(SchedulerUnitCompletedPayload {
            unit_id: "u4".to_string(),
            kind: SchedulingUnitKind::Task,
            priority: SchedulingPriority::Normal,
            duration_ms: 10,
            attempt: 1,
            timestamp: ts(),
        });
        let cloned = event.clone();
        assert_eq!(event, cloned);
        let json = serde_json::to_string(&cloned).unwrap();
        let back: SchedulerEvent = serde_json::from_str(&json).unwrap();
        assert_eq!(event, back);
    }

    #[test]
    fn test_payload_field_access() {
        let json = r#"{"type":"unit_blocked","payload":{"unit_id":"u3","kind":"task","priority":"low","blocker_kind":"lock","blocker_message":"waiting","blocking_object_id":"lock1","recoverable":true,"timestamp":"2024-01-01T00:00:00Z"}}"#;
        let event: SchedulerEvent = serde_json::from_str(json).unwrap();
        match event {
            SchedulerEvent::UnitBlocked(p) => {
                assert_eq!(p.unit_id, "u3");
                assert_eq!(p.kind, SchedulingUnitKind::Task);
                assert_eq!(p.priority, SchedulingPriority::Low);
                assert_eq!(p.blocker_kind, BlockerKind::Lock);
                assert_eq!(p.blocker_message, "waiting");
                assert_eq!(p.blocking_object_id, Some("lock1".to_string()));
                assert!(p.recoverable);
                assert_eq!(p.timestamp, "2024-01-01T00:00:00Z");
            }
            _ => panic!("expected UnitBlocked"),
        }
    }

    #[test]
    fn test_unused_type_import_compiles() {
        // Ensure SchedulingUnit import remains valid for downstream payload usage
        let _u = SchedulingUnit {
            id: "x".to_string(),
            kind: SchedulingUnitKind::Task,
            workspace_id: "ws".to_string(),
            session_id: None,
            execution_id: None,
            workflow_id: None,
            node_id: None,
            task_id: None,
            priority: SchedulingPriority::Normal,
            dependencies: vec![],
            required_permissions: vec![],
            required_locks: vec![],
            budget_estimate: None,
            state: SchedulingState::Created,
            created_at: ts(),
            updated_at: ts(),
        };
        let _ = _u;
    }
}

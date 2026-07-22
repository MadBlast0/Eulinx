use crate::scheduler::time_utils::now_iso;
use std::collections::{HashMap, HashSet};

use crate::scheduler::types::{
    BlockerKind, ReadinessBlocker, ReadinessContext, ReadinessResult, SchedulingUnit,
};

fn check_runtime_gate(unit: &SchedulingUnit, ctx: &ReadinessContext) -> Option<ReadinessBlocker> {
    if !ctx.runtime_ready {
        Some(ReadinessBlocker {
            kind: BlockerKind::RuntimeState,
            message: "Runtime is not in a state that accepts work".to_string(),
            blocking_object_id: Some(unit.id.clone()),
            recoverable: true,
        })
    } else {
        None
    }
}

fn check_dependency_gate(
    unit: &SchedulingUnit,
    ctx: &ReadinessContext,
) -> Option<ReadinessBlocker> {
    for dep_id in &unit.dependencies {
        if !ctx.completed_unit_ids.contains(dep_id) {
            return Some(ReadinessBlocker {
                kind: BlockerKind::Dependency,
                message: format!("Dependency {} has not completed", dep_id),
                blocking_object_id: Some(dep_id.clone()),
                recoverable: true,
            });
        }
    }
    None
}

fn check_permission_gate(
    unit: &SchedulingUnit,
    ctx: &ReadinessContext,
) -> Option<ReadinessBlocker> {
    for perm in &unit.required_permissions {
        if !ctx.approved_permissions.contains(perm) {
            return Some(ReadinessBlocker {
                kind: BlockerKind::Permission,
                message: format!("Permission \"{}\" not approved", perm),
                blocking_object_id: Some(perm.clone()),
                recoverable: true,
            });
        }
    }
    None
}

fn check_approval_gate(unit: &SchedulingUnit, ctx: &ReadinessContext) -> Option<ReadinessBlocker> {
    if !unit.required_permissions.is_empty() {
        let has_unapproved = unit
            .required_permissions
            .iter()
            .any(|p| !ctx.approved_permissions.contains(p));
        if has_unapproved && !ctx.approved_unit_ids.contains(&unit.id) {
            return Some(ReadinessBlocker {
                kind: BlockerKind::Approval,
                message: format!("Unit {} waiting for human approval", unit.id),
                blocking_object_id: Some(unit.id.clone()),
                recoverable: true,
            });
        }
    }
    None
}

fn check_lock_gate(unit: &SchedulingUnit, ctx: &ReadinessContext) -> Option<ReadinessBlocker> {
    for lock_id in &unit.required_locks {
        if ctx.held_lock_ids.contains(lock_id) {
            return Some(ReadinessBlocker {
                kind: BlockerKind::Lock,
                message: format!("Lock \"{}\" is held by another unit", lock_id),
                blocking_object_id: Some(lock_id.clone()),
                recoverable: true,
            });
        }
    }
    None
}

fn check_budget_gate(unit: &SchedulingUnit, ctx: &ReadinessContext) -> Option<ReadinessBlocker> {
    if let Some(ref estimate) = unit.budget_estimate {
        if let Some(cost) = estimate.estimated_cost_micro_usd {
            if ctx.max_budget_cost_micro_usd < f64::MAX {
                let projected = ctx.total_budget_cost_micro_usd + cost;
                if projected > ctx.max_budget_cost_micro_usd {
                    return Some(ReadinessBlocker {
                        kind: BlockerKind::Budget,
                        message: format!(
                            "Budget would be exceeded: projected {} > max {}",
                            projected, ctx.max_budget_cost_micro_usd
                        ),
                        blocking_object_id: Some(unit.id.clone()),
                        recoverable: true,
                    });
                }
            }
        }
    }
    None
}

fn check_resource_gate(unit: &SchedulingUnit, ctx: &ReadinessContext) -> Option<ReadinessBlocker> {
    if ctx.max_concurrency < u32::MAX && ctx.running_count >= ctx.max_concurrency {
        Some(ReadinessBlocker {
            kind: BlockerKind::Resource,
            message: format!(
                "Concurrency limit reached: {}/{}",
                ctx.running_count, ctx.max_concurrency
            ),
            blocking_object_id: Some(unit.id.clone()),
            recoverable: true,
        })
    } else {
        None
    }
}

pub fn evaluate_readiness(unit: &SchedulingUnit, ctx: &ReadinessContext) -> ReadinessResult {
    let gates: [fn(&SchedulingUnit, &ReadinessContext) -> Option<ReadinessBlocker>; 7] = [
        check_runtime_gate,
        check_dependency_gate,
        check_permission_gate,
        check_approval_gate,
        check_lock_gate,
        check_budget_gate,
        check_resource_gate,
    ];

    for gate in &gates {
        if let Some(blocker) = gate(unit, ctx) {
            return ReadinessResult {
                unit_id: unit.id.clone(),
                ready: false,
                blockers: vec![blocker],
                checked_at: now_iso(),
            };
        }
    }

    ReadinessResult {
        unit_id: unit.id.clone(),
        ready: true,
        blockers: vec![],
        checked_at: now_iso(),
    }
}

pub fn partition_by_readiness(
    units: &[SchedulingUnit],
    ctx: &ReadinessContext,
) -> (Vec<SchedulingUnit>, Vec<(SchedulingUnit, ReadinessResult)>) {
    let mut ready = Vec::new();
    let mut blocked = Vec::new();

    for unit in units {
        let result = evaluate_readiness(unit, ctx);
        if result.ready {
            ready.push(unit.clone());
        } else {
            blocked.push((unit.clone(), result));
        }
    }

    (ready, blocked)
}

pub fn blocker_to_wait_queue(kind: &BlockerKind) -> &'static str {
    match kind {
        BlockerKind::Dependency => "dependency_wait",
        BlockerKind::Permission => "permission_wait",
        BlockerKind::Approval => "approval_wait",
        BlockerKind::Lock => "lock_wait",
        BlockerKind::Budget => "budget_wait",
        BlockerKind::RuntimeState => "incoming",
        BlockerKind::Resource => "runnable",
        BlockerKind::ToolUnavailable => "dependency_wait",
        BlockerKind::WorkspaceUnavailable => "incoming",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::scheduler::types::{
        BudgetConfidence, BudgetEstimate, SchedulingPriority, SchedulingState, SchedulingUnitKind,
    };

    fn make_unit(
        id: &str,
        deps: Vec<&str>,
        perms: Vec<&str>,
        locks: Vec<&str>,
        budget: Option<f64>,
    ) -> SchedulingUnit {
        SchedulingUnit {
            id: id.to_string(),
            kind: SchedulingUnitKind::Task,
            workspace_id: "ws-1".to_string(),
            session_id: None,
            execution_id: None,
            workflow_id: None,
            node_id: None,
            task_id: None,
            priority: SchedulingPriority::Normal,
            dependencies: deps.into_iter().map(|s| s.to_string()).collect(),
            required_permissions: perms.into_iter().map(|s| s.to_string()).collect(),
            required_locks: locks.into_iter().map(|s| s.to_string()).collect(),
            budget_estimate: budget.map(|c| BudgetEstimate {
                estimated_runtime_ms: None,
                estimated_tokens: None,
                estimated_cost_micro_usd: Some(c),
                estimated_workers: None,
                estimated_tool_invocations: None,
                estimated_file_writes: None,
                confidence: BudgetConfidence::Medium,
            }),
            state: SchedulingState::Created,
            created_at: now_iso(),
            updated_at: now_iso(),
        }
    }

    fn default_ctx() -> ReadinessContext {
        ReadinessContext {
            runtime_ready: true,
            completed_unit_ids: HashSet::new(),
            held_lock_ids: HashSet::new(),
            approved_permissions: HashSet::new(),
            approved_unit_ids: HashSet::new(),
            running_count: 0,
            max_concurrency: u32::MAX,
            total_budget_cost_micro_usd: 0.0,
            max_budget_cost_micro_usd: f64::MAX,
        }
    }

    #[test]
    fn test_runtime_gate_blocks_when_not_ready() {
        let unit = make_unit("u1", vec![], vec![], vec![], None);
        let mut ctx = default_ctx();
        ctx.runtime_ready = false;

        let result = evaluate_readiness(&unit, &ctx);
        assert!(!result.ready);
        assert_eq!(result.blockers.len(), 1);
        assert_eq!(result.blockers[0].kind, BlockerKind::RuntimeState);
    }

    #[test]
    fn test_runtime_gate_passes_when_ready() {
        let unit = make_unit("u1", vec![], vec![], vec![], None);
        let ctx = default_ctx();

        let result = evaluate_readiness(&unit, &ctx);
        assert!(result.ready);
        assert!(result.blockers.is_empty());
    }

    #[test]
    fn test_dependency_gate_blocks_when_not_completed() {
        let unit = make_unit("u1", vec!["dep-1"], vec![], vec![], None);
        let ctx = default_ctx();

        let result = evaluate_readiness(&unit, &ctx);
        assert!(!result.ready);
        assert_eq!(result.blockers[0].kind, BlockerKind::Dependency);
        assert_eq!(
            result.blockers[0].blocking_object_id,
            Some("dep-1".to_string())
        );
    }

    #[test]
    fn test_dependency_gate_passes_when_completed() {
        let unit = make_unit("u1", vec!["dep-1"], vec![], vec![], None);
        let mut ctx = default_ctx();
        ctx.completed_unit_ids.insert("dep-1".to_string());

        let result = evaluate_readiness(&unit, &ctx);
        assert!(result.ready);
    }

    #[test]
    fn test_permission_gate_blocks_when_unapproved() {
        let unit = make_unit("u1", vec![], vec!["read"], vec![], None);
        let ctx = default_ctx();

        let result = evaluate_readiness(&unit, &ctx);
        assert!(!result.ready);
        assert_eq!(result.blockers[0].kind, BlockerKind::Permission);
        assert_eq!(
            result.blockers[0].blocking_object_id,
            Some("read".to_string())
        );
    }

    #[test]
    fn test_permission_gate_passes_when_approved() {
        let unit = make_unit("u1", vec![], vec!["read"], vec![], None);
        let mut ctx = default_ctx();
        ctx.approved_permissions.insert("read".to_string());

        let result = evaluate_readiness(&unit, &ctx);
        assert!(result.ready);
    }

    #[test]
    fn test_lock_gate_blocks_when_held() {
        let unit = make_unit("u1", vec![], vec![], vec!["lock-1"], None);
        let mut ctx = default_ctx();
        ctx.held_lock_ids.insert("lock-1".to_string());

        let result = evaluate_readiness(&unit, &ctx);
        assert!(!result.ready);
        assert_eq!(result.blockers[0].kind, BlockerKind::Lock);
        assert_eq!(
            result.blockers[0].blocking_object_id,
            Some("lock-1".to_string())
        );
    }

    #[test]
    fn test_lock_gate_passes_when_not_held() {
        let unit = make_unit("u1", vec![], vec![], vec!["lock-1"], None);
        let ctx = default_ctx();

        let result = evaluate_readiness(&unit, &ctx);
        assert!(result.ready);
    }

    #[test]
    fn test_budget_gate_blocks_when_exceeded() {
        let unit = make_unit("u1", vec![], vec![], vec![], Some(150.0));
        let mut ctx = default_ctx();
        ctx.total_budget_cost_micro_usd = 100.0;
        ctx.max_budget_cost_micro_usd = 200.0;

        let result = evaluate_readiness(&unit, &ctx);
        assert!(!result.ready);
        assert_eq!(result.blockers[0].kind, BlockerKind::Budget);
    }

    #[test]
    fn test_budget_gate_passes_when_within() {
        let unit = make_unit("u1", vec![], vec![], vec![], Some(50.0));
        let mut ctx = default_ctx();
        ctx.total_budget_cost_micro_usd = 100.0;
        ctx.max_budget_cost_micro_usd = 200.0;

        let result = evaluate_readiness(&unit, &ctx);
        assert!(result.ready);
    }

    #[test]
    fn test_resource_gate_blocks_at_max_concurrency() {
        let unit = make_unit("u1", vec![], vec![], vec![], None);
        let mut ctx = default_ctx();
        ctx.running_count = 5;
        ctx.max_concurrency = 5;

        let result = evaluate_readiness(&unit, &ctx);
        assert!(!result.ready);
        assert_eq!(result.blockers[0].kind, BlockerKind::Resource);
    }

    #[test]
    fn test_resource_gate_passes_when_under() {
        let unit = make_unit("u1", vec![], vec![], vec![], None);
        let mut ctx = default_ctx();
        ctx.running_count = 3;
        ctx.max_concurrency = 5;

        let result = evaluate_readiness(&unit, &ctx);
        assert!(result.ready);
    }

    #[test]
    fn test_all_gates_pass() {
        let unit = make_unit(
            "u1",
            vec!["dep-1"],
            vec!["read"],
            vec!["lock-1"],
            Some(50.0),
        );
        let mut ctx = default_ctx();
        ctx.completed_unit_ids.insert("dep-1".to_string());
        ctx.approved_permissions.insert("read".to_string());
        ctx.running_count = 3;
        ctx.max_concurrency = 5;
        ctx.total_budget_cost_micro_usd = 100.0;
        ctx.max_budget_cost_micro_usd = 200.0;

        let result = evaluate_readiness(&unit, &ctx);
        assert!(result.ready);
        assert!(result.blockers.is_empty());
    }

    #[test]
    fn test_first_blocker_wins() {
        let unit = make_unit("u1", vec!["dep-1"], vec!["read"], vec![], None);
        let mut ctx = default_ctx();
        ctx.runtime_ready = false;

        let result = evaluate_readiness(&unit, &ctx);
        assert!(!result.ready);
        assert_eq!(result.blockers[0].kind, BlockerKind::RuntimeState);
    }

    #[test]
    fn test_partition_by_readiness() {
        let unit_a = make_unit("ready", vec![], vec![], vec![], None);
        let unit_b = make_unit("blocked-dep", vec!["missing"], vec![], vec![], None);
        let unit_c = make_unit("blocked-perm", vec![], vec!["admin"], vec![], None);

        let mut ctx = default_ctx();
        ctx.approved_permissions.insert("admin".to_string());

        let (ready, blocked) = partition_by_readiness(&[unit_a, unit_b, unit_c], &ctx);

        assert_eq!(ready.len(), 2);
        assert_eq!(blocked.len(), 1);
        assert_eq!(ready[0].id, "ready");
        assert_eq!(blocked[0].0.id, "blocked-dep");
        assert_eq!(blocked[0].1.blockers[0].kind, BlockerKind::Dependency);
    }

    #[test]
    fn test_blocker_to_wait_queue() {
        assert_eq!(
            blocker_to_wait_queue(&BlockerKind::Dependency),
            "dependency_wait"
        );
        assert_eq!(
            blocker_to_wait_queue(&BlockerKind::Permission),
            "permission_wait"
        );
        assert_eq!(
            blocker_to_wait_queue(&BlockerKind::Approval),
            "approval_wait"
        );
        assert_eq!(blocker_to_wait_queue(&BlockerKind::Lock), "lock_wait");
        assert_eq!(blocker_to_wait_queue(&BlockerKind::Budget), "budget_wait");
        assert_eq!(
            blocker_to_wait_queue(&BlockerKind::RuntimeState),
            "incoming"
        );
        assert_eq!(blocker_to_wait_queue(&BlockerKind::Resource), "runnable");
        assert_eq!(
            blocker_to_wait_queue(&BlockerKind::ToolUnavailable),
            "dependency_wait"
        );
        assert_eq!(
            blocker_to_wait_queue(&BlockerKind::WorkspaceUnavailable),
            "incoming"
        );
    }
}

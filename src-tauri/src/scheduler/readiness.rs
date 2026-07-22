use crate::scheduler::time_utils::now_iso;

use crate::scheduler::types::{
    BlockerKind, DependencyType, ReadinessBlocker, ReadinessContext, ReadinessResult,
    SafetyGateKind, SafetyGateResult, SchedulingDependency, SchedulingUnit,
};

pub fn evaluate_readiness(unit: &SchedulingUnit, ctx: &ReadinessContext) -> ReadinessResult {
    // Use the safety gate system for evaluation
    if let Some(blocker) = evaluate_all_safety_gates(unit, ctx) {
        return ReadinessResult {
            unit_id: unit.id.clone(),
            ready: false,
            blockers: vec![blocker],
            checked_at: now_iso(),
        };
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

pub fn blocker_to_wait_state(kind: &BlockerKind) -> &'static str {
    match kind {
        BlockerKind::Dependency => "waiting_for_dependencies",
        BlockerKind::Permission => "waiting_for_permission",
        BlockerKind::Approval => "waiting_for_approval",
        BlockerKind::Lock => "waiting_for_lock",
        BlockerKind::Budget => "waiting_for_budget",
        BlockerKind::RuntimeState => "queued",
        BlockerKind::Resource => "ready",
        BlockerKind::ToolUnavailable => "waiting_for_dependencies",
        BlockerKind::WorkspaceUnavailable => "queued",
    }
}

/// Map a SafetyGateKind to the corresponding BlockerKind.
pub fn safety_gate_to_blocker_kind(gate: &SafetyGateKind) -> BlockerKind {
    match gate {
        SafetyGateKind::RuntimeState => BlockerKind::RuntimeState,
        SafetyGateKind::Dependency => BlockerKind::Dependency,
        SafetyGateKind::Permission => BlockerKind::Permission,
        SafetyGateKind::Approval => BlockerKind::Approval,
        SafetyGateKind::Lock => BlockerKind::Lock,
        SafetyGateKind::Budget => BlockerKind::Budget,
        SafetyGateKind::Resource => BlockerKind::Resource,
    }
}

/// Evaluate a single safety gate and return a blocker if the gate fails.
pub fn evaluate_safety_gate(
    gate: &SafetyGateKind,
    unit: &SchedulingUnit,
    ctx: &ReadinessContext,
) -> Option<ReadinessBlocker> {
    let blocker_kind = safety_gate_to_blocker_kind(gate);
    match gate {
        SafetyGateKind::RuntimeState => {
            if !ctx.runtime_ready {
                Some(ReadinessBlocker {
                    kind: blocker_kind,
                    message: "Runtime is not in a state that accepts work".to_string(),
                    blocking_object_id: Some(unit.id.clone()),
                    recoverable: true,
                })
            } else {
                None
            }
        }
        SafetyGateKind::Dependency => {
            for dep_id in &unit.dependencies {
                if !ctx.completed_unit_ids.contains(dep_id) {
                    return Some(ReadinessBlocker {
                        kind: blocker_kind,
                        message: format!("Dependency {} has not completed", dep_id),
                        blocking_object_id: Some(dep_id.clone()),
                        recoverable: true,
                    });
                }
            }
            None
        }
        SafetyGateKind::Permission => {
            for perm in &unit.required_permissions {
                if !ctx.approved_permissions.contains(perm) {
                    return Some(ReadinessBlocker {
                        kind: blocker_kind,
                        message: format!("Permission \"{}\" not approved", perm),
                        blocking_object_id: Some(perm.clone()),
                        recoverable: true,
                    });
                }
            }
            None
        }
        SafetyGateKind::Approval => {
            if !unit.required_permissions.is_empty()
                && !ctx.approved_unit_ids.contains(&unit.id)
            {
                Some(ReadinessBlocker {
                    kind: blocker_kind,
                    message: "Unit requires approval but has not been approved".to_string(),
                    blocking_object_id: Some(unit.id.clone()),
                    recoverable: true,
                })
            } else {
                None
            }
        }
        SafetyGateKind::Lock => {
            for lock in &unit.required_locks {
                if ctx.held_lock_ids.contains(lock) {
                    return Some(ReadinessBlocker {
                        kind: blocker_kind,
                        message: format!("Lock \"{}\" is currently held", lock),
                        blocking_object_id: Some(lock.clone()),
                        recoverable: true,
                    });
                }
            }
            None
        }
        SafetyGateKind::Budget => {
            if let Some(ref estimate) = unit.budget_estimate {
                if let Some(cost) = estimate.estimated_cost_micro_usd {
                    if ctx.total_budget_cost_micro_usd + cost > ctx.max_budget_cost_micro_usd {
                        return Some(ReadinessBlocker {
                            kind: blocker_kind,
                            message: "Budget would be exceeded".to_string(),
                            blocking_object_id: None,
                            recoverable: true,
                        });
                    }
                }
            }
            None
        }
        SafetyGateKind::Resource => {
            if ctx.running_count >= ctx.max_concurrency {
                Some(ReadinessBlocker {
                    kind: blocker_kind,
                    message: "Maximum concurrency reached".to_string(),
                    blocking_object_id: None,
                    recoverable: true,
                })
            } else {
                None
            }
        }
    }
}

/// Get all safety gates in evaluation order.
pub fn all_safety_gates() -> Vec<SafetyGateKind> {
    vec![
        SafetyGateKind::RuntimeState,
        SafetyGateKind::Dependency,
        SafetyGateKind::Permission,
        SafetyGateKind::Approval,
        SafetyGateKind::Lock,
        SafetyGateKind::Budget,
        SafetyGateKind::Resource,
    ]
}

/// Evaluate all safety gates for a unit and return the first blocker found.
pub fn evaluate_all_safety_gates(
    unit: &SchedulingUnit,
    ctx: &ReadinessContext,
) -> Option<ReadinessBlocker> {
    for gate in all_safety_gates() {
        if let Some(blocker) = evaluate_safety_gate(&gate, unit, ctx) {
            return Some(blocker);
        }
    }
    None
}

/// Evaluate a safety gate and return a SafetyGateResult.
pub fn evaluate_safety_gate_result(
    gate: &SafetyGateKind,
    unit: &SchedulingUnit,
    ctx: &ReadinessContext,
) -> SafetyGateResult {
    let blocker = evaluate_safety_gate(gate, unit, ctx);
    SafetyGateResult {
        unit_id: unit.id.clone(),
        gate: gate.clone(),
        passed: blocker.is_none(),
        blocker: blocker.map(|b| b.message),
        checked_at: now_iso(),
    }
}

/// Evaluate all safety gates and return results for each gate.
pub fn evaluate_all_safety_gate_results(
    unit: &SchedulingUnit,
    ctx: &ReadinessContext,
) -> Vec<SafetyGateResult> {
    all_safety_gates()
        .iter()
        .map(|gate| evaluate_safety_gate_result(gate, unit, ctx))
        .collect()
}

/// Build SchedulingDependency entries from a unit's dependency list.
pub fn build_unit_dependencies(unit: &SchedulingUnit) -> Vec<SchedulingDependency> {
    unit.dependencies
        .iter()
        .enumerate()
        .map(|(i, target_id)| SchedulingDependency {
            id: format!("dep-{}-{}", unit.id, i),
            unit_id: unit.id.clone(),
            dependency_type: DependencyType::UnitCompleted,
            target_id: target_id.clone(),
            required: true,
        })
        .collect()
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

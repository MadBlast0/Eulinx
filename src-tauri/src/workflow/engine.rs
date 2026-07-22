use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::scheduler::time_utils::now_iso;
use crate::workflow::graph_mirror::*;
use crate::workflow::types::*;

// ---------------------------------------------------------------------------
// Adapter Traits
// ---------------------------------------------------------------------------

pub trait PersistenceAdapter {
    fn save_run(&self, run: &WorkflowRun) -> Result<(), String>;
    fn load_run(&self, run_id: &str) -> Result<Option<WorkflowRun>, String>;
    fn load_snapshot(&self, snapshot_id: &str) -> Result<Option<GraphSnapshot>, String>;
    fn save_node_state(&self, state: &NodeRuntimeState) -> Result<(), String>;
    fn load_node_states(&self, run_id: &str) -> Result<Vec<NodeRuntimeState>, String>;
}

pub trait SchedulerAdapter {
    fn admit(&self, request: &AdmissionRequest) -> Result<AdmissionResponse, String>;
}

pub trait ExecutionEngineAdapter {
    fn execute(&self, request: &ExecutionRequest) -> Result<WorkflowNodeResult, String>;
    fn status(&self, execution_id: &str) -> Result<String, String>;
    fn cancel(&self, execution_id: &str) -> Result<(), String>;
}

// ---------------------------------------------------------------------------
// Tick Result
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TickResult {
    pub admitted: Vec<String>,
    pub deferred: Vec<String>,
    pub rejected: Vec<String>,
    pub completed: Vec<String>,
    pub failed: Vec<String>,
    pub run_completed: bool,
}

// ---------------------------------------------------------------------------
// WorkflowEngine
// ---------------------------------------------------------------------------

pub struct WorkflowEngine {
    config: WorkflowEngineConfig,
    mirrors: HashMap<String, GraphMirror>,
    runs: HashMap<String, WorkflowRun>,
    scheduler_failures: u32,
    persistence: Box<dyn PersistenceAdapter + Send>,
    scheduler: Box<dyn SchedulerAdapter + Send>,
    executor: Box<dyn ExecutionEngineAdapter + Send>,
    emitter: Box<dyn Fn(&str, &serde_json::Value) + Send>,
}

impl WorkflowEngine {
    pub fn new(
        config: WorkflowEngineConfig,
        persistence: Box<dyn PersistenceAdapter + Send>,
        scheduler: Box<dyn SchedulerAdapter + Send>,
        executor: Box<dyn ExecutionEngineAdapter + Send>,
        emitter: Box<dyn Fn(&str, &serde_json::Value) + Send>,
    ) -> Self {
        Self {
            config,
            mirrors: HashMap::new(),
            runs: HashMap::new(),
            scheduler_failures: 0,
            persistence,
            scheduler,
            executor,
            emitter,
        }
    }

    pub fn create_run(
        &mut self,
        workflow_id: String,
        workflow_version: u32,
        snapshot: GraphSnapshot,
        trigger: RunTrigger,
        workspace_id: String,
        project_id: String,
        session_id: String,
        mode: RunMode,
    ) -> Result<WorkflowRun, WorkflowError> {
        let nodes_map: HashMap<NodeId, NodeDefinition> = snapshot
            .nodes
            .iter()
            .map(|n| (n.node_id.clone(), n.clone()))
            .collect();
        let edges_map: HashMap<EdgeId, EdgeDefinition> = snapshot
            .edges
            .iter()
            .map(|e| (e.edge_id.clone(), e.clone()))
            .collect();
        if let Some(cycle) = detect_cycle(&nodes_map, &edges_map) {
            return Err(WorkflowError::GraphInvalid {
                node_ids: cycle,
                message: "cycle detected".to_string(),
            });
        }

        let run_id = uuid::Uuid::new_v4().to_string();
        let determinism_seed = Self::generate_determinism_seed(32);
        let now = now_iso();
        let node_count = snapshot.nodes.len() as u32;

        let mut run = WorkflowRun {
            run_id: run_id.clone(),
            workflow_id,
            workflow_version,
            workspace_id,
            project_id,
            session_id,
            state: WorkflowRunState::Created,
            trigger,
            mode,
            determinism_seed,
            graph_snapshot_id: snapshot.snapshot_id.clone(),
            started_at: now.clone(),
            ended_at: None,
            paused_at: None,
            node_count,
            completed_node_count: 0,
            failed_node_count: 0,
            skipped_node_count: 0,
            failure: None,
            run_seq: 0,
            context_id: String::new(),
            restart_generation: 0,
        };

        self.persistence
            .save_run(&run)
            .map_err(|e| WorkflowError::PersistenceFailed { message: e })?;

        let mut incoming_counts: HashMap<NodeId, u32> = HashMap::new();
        for edge in &snapshot.edges {
            *incoming_counts.entry(edge.to_node_id.clone()).or_insert(0) += 1;
        }

        let mut initial_states: HashMap<String, NodeRuntimeState> = HashMap::new();
        for node_def in &snapshot.nodes {
            let deps = incoming_counts.get(&node_def.node_id).copied().unwrap_or(0);
            let sk = state_key(&node_def.node_id, 0);
            let state = NodeRuntimeState {
                run_id: run_id.clone(),
                node_id: node_def.node_id.clone(),
                iteration_index: 0,
                state: NodeState::Pending,
                remaining_deps: deps,
                attempt: 0,
                execution_id: None,
                started_at: None,
                ended_at: None,
                outputs: None,
                failure: None,
                skip_reason: None,
            };
            self.persistence
                .save_node_state(&state)
                .map_err(|e| WorkflowError::PersistenceFailed { message: e })?;
            initial_states.insert(sk, state);
        }

        let initial_states_vec: Vec<NodeRuntimeState> =
            initial_states.into_values().collect();
        let mirror = build_mirror(&snapshot, &initial_states_vec);

        run.state = WorkflowRunState::Validating;
        run.run_seq += 1;
        self.persistence
            .save_run(&run)
            .map_err(|e| WorkflowError::PersistenceFailed { message: e })?;
        self.emit(
            "run.transition",
            &serde_json::json!({
                "run_id": run_id,
                "from": "created",
                "to": "validating"
            }),
        );

        run.state = WorkflowRunState::Running;
        run.run_seq += 1;
        run.started_at = now_iso();
        self.persistence
            .save_run(&run)
            .map_err(|e| WorkflowError::PersistenceFailed { message: e })?;
        self.emit(
            "run.transition",
            &serde_json::json!({
                "run_id": run_id,
                "from": "validating",
                "to": "running"
            }),
        );

        self.mirrors.insert(run_id.clone(), mirror);
        self.runs.insert(run_id.clone(), run.clone());

        self.emit(
            "run.created",
            &serde_json::json!({ "run_id": run_id }),
        );

        Ok(run)
    }

    pub fn tick(&mut self, run_id: &str) -> Result<TickResult, WorkflowError> {
        let run = self
            .runs
            .get(run_id)
            .ok_or(WorkflowError::RunNotFound { run_id: run_id.to_string() })?;

        if is_run_terminal(&run.state) {
            return Ok(TickResult {
                admitted: vec![],
                deferred: vec![],
                rejected: vec![],
                completed: vec![],
                failed: vec![],
                run_completed: false,
            });
        }

        if run.state == WorkflowRunState::Pausing
            || run.state == WorkflowRunState::Cancelling
        {
            drop(run);
            self.finish_transition(run_id)?;
            return Ok(TickResult {
                admitted: vec![],
                deferred: vec![],
                rejected: vec![],
                completed: vec![],
                failed: vec![],
                run_completed: false,
            });
        }
        drop(run);

        let mirror = self
            .mirrors
            .get(run_id)
            .ok_or(WorkflowError::RunNotFound { run_id: run_id.to_string() })?;
        let has_running = !mirror.running_set.is_empty();

        let ready_states: Vec<String> = {
            let mut keys: Vec<String> = mirror.ready_set.iter().cloned().collect();
            keys.sort_by(|a, b| {
                let (a_nid, a_iter) = parse_state_key(a).unwrap_or_default();
                let (b_nid, b_iter) = parse_state_key(b).unwrap_or_default();
                let a_pos = mirror
                    .topo_order
                    .iter()
                    .position(|n| *n == a_nid)
                    .unwrap_or(usize::MAX);
                let b_pos = mirror
                    .topo_order
                    .iter()
                    .position(|n| *n == b_nid)
                    .unwrap_or(usize::MAX);
                a_pos
                    .cmp(&b_pos)
                    .then_with(|| a_nid.cmp(&b_nid))
                    .then_with(|| a_iter.cmp(&b_iter))
            });
            keys
        };
        drop(mirror);

        if ready_states.is_empty() && !has_running {
            return self.finalize_run(run_id);
        }

        if ready_states.is_empty() {
            return Ok(TickResult {
                admitted: vec![],
                deferred: vec![],
                rejected: vec![],
                completed: vec![],
                failed: vec![],
                run_completed: false,
            });
        }

        let (workspace_id, project_id) = {
            let run = self
                .runs
                .get(run_id)
                .ok_or(WorkflowError::RunNotFound { run_id: run_id.to_string() })?;
            (run.workspace_id.clone(), run.project_id.clone())
        };

        let candidates: Vec<AdmissionCandidate> = {
            let mirror = self
                .mirrors
                .get(run_id)
                .ok_or(WorkflowError::RunNotFound { run_id: run_id.to_string() })?;
            ready_states
                .iter()
                .filter_map(|sk| {
                    mirror.states.get(sk).map(|s| {
                        let kind = mirror
                            .nodes
                            .get(&s.node_id)
                            .map(|n| n.kind.clone())
                            .unwrap_or(NodeKind::Worker);
                        let topo_rank = mirror
                            .topo_order
                            .iter()
                            .position(|nid| *nid == s.node_id)
                            .unwrap_or(0) as u32;
                        AdmissionCandidate {
                            node_id: s.node_id.clone(),
                            iteration_index: s.iteration_index,
                            kind,
                            topo_rank,
                            estimated_cost: EstimatedCost {
                                expected_duration_ms: 0,
                                expected_tokens: 0,
                                expected_cost_usd: 0.0,
                                spawns_worker: false,
                                spawns_process: false,
                            },
                            required_resources: vec![],
                        }
                    })
                })
                .collect()
        };

        let request = AdmissionRequest {
            run_id: run_id.to_string(),
            workspace_id,
            project_id,
            run_priority: "normal".to_string(),
            candidates,
        };

        let response = match self.scheduler.admit(&request) {
            Ok(r) => r,
            Err(_e) => {
                self.scheduler_failures += 1;
                return Err(WorkflowError::SchedulerUnavailable {
                    consecutive_failures: self.scheduler_failures,
                });
            }
        };

        let mut events: Vec<(String, serde_json::Value)> = Vec::new();
        let mut admitted_ids = Vec::new();
        let mut deferred_ids = Vec::new();
        let mut rejected_ids = Vec::new();

        {
            let run = self
                .runs
                .get_mut(run_id)
                .ok_or(WorkflowError::RunNotFound { run_id: run_id.to_string() })?;
            let mirror = self
                .mirrors
                .get_mut(run_id)
                .ok_or(WorkflowError::RunNotFound { run_id: run_id.to_string() })?;

            for candidate_key in &response.admitted {
                mirror.ready_set.remove(candidate_key);
                if let Some(state) = mirror.states.get_mut(candidate_key) {
                    state.state = NodeState::Running;
                    state.attempt += 1;
                    let execution_id = uuid::Uuid::new_v4().to_string();
                    state.execution_id = Some(execution_id.clone());
                    mirror.running_set.insert(candidate_key.clone());

                    if let Err(e) = self.persistence.save_node_state(state) {
                        return Err(WorkflowError::PersistenceFailed { message: e });
                    }

                    admitted_ids.push(candidate_key.clone());

                    events.push((
                        "node.running".to_string(),
                        serde_json::json!({
                            "run_id": run_id,
                            "node_id": state.node_id,
                            "execution_id": execution_id,
                            "attempt": state.attempt,
                        }),
                    ));

                    let owner_ref = OwnerRef {
                        kind: "workflow".to_string(),
                        run_id: run_id.to_string(),
                        node_id: state.node_id.clone(),
                    };
                    let exec_req = ExecutionRequest {
                        run_id: run_id.to_string(),
                        node_id: state.node_id.clone(),
                        execution_id,
                        attempt: state.attempt,
                        kind: mirror
                            .nodes
                            .get(&state.node_id)
                            .map(|n| n.kind.clone())
                            .unwrap_or(NodeKind::Worker),
                        config: mirror
                            .nodes
                            .get(&state.node_id)
                            .map(|n| n.config.clone())
                            .unwrap_or(serde_json::Value::Null),
                        inputs: HashMap::new(),
                        iteration_index: state.iteration_index,
                        workspace_id: run.workspace_id.clone(),
                        project_id: run.project_id.clone(),
                        session_id: run.session_id.clone(),
                        owner_ref,
                        timeout_ms: mirror
                            .nodes
                            .get(&state.node_id)
                            .map(|n| n.timeout_ms)
                            .unwrap_or(30000),
                        deterministic_seed: run.determinism_seed.clone(),
                        mode: run.mode.clone(),
                    };

                    if let Err(e) = self.executor.execute(&exec_req) {
                        events.push((
                            "node.execute_error".to_string(),
                            serde_json::json!({
                                "run_id": run_id,
                                "node_id": state.node_id,
                                "error": e,
                            }),
                        ));
                    }
                }
            }

            for deferred in &response.deferred {
                deferred_ids.push(deferred.key.clone());
                events.push((
                    "node.deferred".to_string(),
                    serde_json::json!({
                        "run_id": run_id,
                        "node_id": deferred.key,
                        "reason": deferred.reason,
                    }),
                ));
            }

            for rejected in &response.rejected {
                mirror.ready_set.remove(&rejected.key);
                mirror.running_set.remove(&rejected.key);
                if let Some(state) = mirror.states.get_mut(&rejected.key) {
                    state.state = NodeState::Failed;
                    run.failed_node_count += 1;
                    rejected_ids.push(rejected.key.clone());

                    if let Err(e) = self.persistence.save_node_state(state) {
                        return Err(WorkflowError::PersistenceFailed { message: e });
                    }

                    events.push((
                        "node.failed".to_string(),
                        serde_json::json!({
                            "run_id": run_id,
                            "node_id": rejected.key,
                            "reason": rejected.reason,
                        }),
                    ));
                }
            }

            if let Err(e) = self.persistence.save_run(run) {
                return Err(WorkflowError::PersistenceFailed { message: e });
            }
        }

        for (event, data) in &events {
            self.emit(event, data);
        }

        Ok(TickResult {
            admitted: admitted_ids,
            deferred: deferred_ids,
            rejected: rejected_ids,
            completed: vec![],
            failed: vec![],
            run_completed: false,
        })
    }

    pub fn handle_node_result(
        &mut self,
        run_id: &str,
        execution_id: &str,
        result: &WorkflowNodeResult,
    ) -> Result<(), WorkflowError> {
        let run = self
            .runs
            .get(run_id)
            .ok_or(WorkflowError::RunNotFound { run_id: run_id.to_string() })?;

        if is_run_terminal(&run.state) {
            return Ok(());
        }
        drop(run);

        let (state_key, state) = {
            let mirror = self
                .mirrors
                .get(run_id)
                .ok_or(WorkflowError::RunNotFound { run_id: run_id.to_string() })?;
            let mut found = None;
            for (k, s) in &mirror.states {
                if s.execution_id.as_deref() == Some(execution_id) {
                    found = Some((k.clone(), s.clone()));
                    break;
                }
            }
            found.ok_or(WorkflowError::ResultForUnknownExecution {
                execution_id: execution_id.to_string(),
            })?
        };

        let mut events: Vec<(String, serde_json::Value)> = Vec::new();

        {
            let mirror = self
                .mirrors
                .get_mut(run_id)
                .ok_or(WorkflowError::RunNotFound { run_id: run_id.to_string() })?;
            let run = self
                .runs
                .get_mut(run_id)
                .ok_or(WorkflowError::RunNotFound { run_id: run_id.to_string() })?;

            mirror.running_set.remove(&state_key);

            match result {
                WorkflowNodeResult::Success { .. } => {
                    let mut state = state;
                    state.state = NodeState::Succeeded;
                    run.completed_node_count += 1;

                    if let Some(edge_ids) = mirror.outgoing.get(&state.node_id) {
                        for eid in edge_ids {
                            if let Some(edge) = mirror.edges.get(eid) {
                                let target_keys: Vec<String> = mirror
                                    .states
                                    .keys()
                                    .filter(|k| {
                                        parse_state_key(k)
                                            .map(|(nid, _)| nid == edge.to_node_id)
                                            .unwrap_or(false)
                                    })
                                    .cloned()
                                    .collect();

                                for tk in target_keys {
                                    if let Some(ts) = mirror.states.get_mut(&tk) {
                                        if ts.state == NodeState::Pending {
                                            ts.remaining_deps = ts.remaining_deps.saturating_sub(1);
                                            if ts.remaining_deps == 0 {
                                                ts.state = NodeState::Ready;
                                                mirror.ready_set.insert(tk);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if let Err(e) = self.persistence.save_node_state(&state) {
                        return Err(WorkflowError::PersistenceFailed { message: e });
                    }
                    mirror.states.insert(state_key, state);

                    events.push((
                        "node.succeeded".to_string(),
                        serde_json::json!({
                            "run_id": run_id,
                            "execution_id": execution_id,
                        }),
                    ));
                }
                WorkflowNodeResult::Failure { failure, .. } => {
                    let max_retries = 3;
                    let mut state = state;
                    let should_retry = state.attempt < max_retries;

                    if should_retry {
                        state.state = NodeState::Ready;
                        state.execution_id = None;
                        mirror.ready_set.insert(state_key.clone());

                        events.push((
                            "node.retrying".to_string(),
                            serde_json::json!({
                                "run_id": run_id,
                                "node_id": state.node_id,
                                "attempt": state.attempt,
                                "max_retries": max_retries,
                            }),
                        ));
                    } else {
                        state.state = NodeState::Failed;
                        run.failed_node_count += 1;

                        events.push((
                            "node.failed".to_string(),
                            serde_json::json!({
                                "run_id": run_id,
                                "node_id": state.node_id,
                                "execution_id": execution_id,
                                "error": failure.message,
                            }),
                        ));
                    }

                    if let Err(e) = self.persistence.save_node_state(&state) {
                        return Err(WorkflowError::PersistenceFailed { message: e });
                    }

                    let node_id_for_policy = state.node_id.clone();
                    mirror.states.insert(state_key.clone(), state);

                    if !should_retry {
                        if let Some(node_def) = mirror.nodes.get(&node_id_for_policy) {
                            if node_def.failure_policy == Some(FailurePolicy::FailRun) {
                                run.state = WorkflowRunState::Failed;
                                events.push((
                                    "run.failed".to_string(),
                                    serde_json::json!({
                                        "run_id": run_id,
                                        "failed_node": node_id_for_policy,
                                    }),
                                ));
                            }
                        }
                    }
                }
            }

            self.persistence
                .save_run(run)
                .map_err(|e| WorkflowError::PersistenceFailed { message: e })?;
        }

        for (event, data) in &events {
            self.emit(event, data);
        }

        Ok(())
    }

    pub fn pause_run(&mut self, run_id: &str) -> Result<(), WorkflowError> {
        let run = self
            .runs
            .get_mut(run_id)
            .ok_or(WorkflowError::RunNotFound { run_id: run_id.to_string() })?;

        if run.state != WorkflowRunState::Running {
            return Err(WorkflowError::IllegalNodeTransition {
                node_id: run_id.to_string(),
                from: format!("{:?}", run.state),
                to: "pausing".to_string(),
            });
        }

        run.state = WorkflowRunState::Pausing;
        run.run_seq += 1;
        self.persistence
            .save_run(run)
            .map_err(|e| WorkflowError::PersistenceFailed { message: e })?;

        self.emit(
            "run.pausing",
            &serde_json::json!({ "run_id": run_id }),
        );

        Ok(())
    }

    pub fn resume_run(&mut self, run_id: &str) -> Result<(), WorkflowError> {
        let run = self
            .runs
            .get_mut(run_id)
            .ok_or(WorkflowError::RunNotFound { run_id: run_id.to_string() })?;

        if run.state != WorkflowRunState::Paused {
            return Err(WorkflowError::IllegalNodeTransition {
                node_id: run_id.to_string(),
                from: format!("{:?}", run.state),
                to: "running".to_string(),
            });
        }

        run.state = WorkflowRunState::Running;
        run.run_seq += 1;
        self.persistence
            .save_run(run)
            .map_err(|e| WorkflowError::PersistenceFailed { message: e })?;

        self.emit(
            "run.resumed",
            &serde_json::json!({ "run_id": run_id }),
        );

        Ok(())
    }

    pub fn cancel_run(&mut self, run_id: &str) -> Result<(), WorkflowError> {
        let run = self
            .runs
            .get_mut(run_id)
            .ok_or(WorkflowError::RunNotFound { run_id: run_id.to_string() })?;

        if is_run_terminal(&run.state) {
            return Ok(());
        }

        run.state = WorkflowRunState::Cancelling;
        run.run_seq += 1;
        self.persistence
            .save_run(run)
            .map_err(|e| WorkflowError::PersistenceFailed { message: e })?;

        let running_execs: Vec<(String, String)> = {
            let mirror = self
                .mirrors
                .get(run_id)
                .ok_or(WorkflowError::RunNotFound { run_id: run_id.to_string() })?;
            mirror
                .running_set
                .iter()
                .filter_map(|sk| {
                    mirror
                        .states
                        .get(sk)
                        .and_then(|s| s.execution_id.clone().map(|eid| (sk.clone(), eid)))
                })
                .collect()
        };

        for (state_key, exec_id) in &running_execs {
            let _ = self.executor.cancel(exec_id);
            if let Some(mirror) = self.mirrors.get_mut(run_id) {
                mirror.running_set.remove(state_key);
                mirror.ready_set.remove(state_key);
                if let Some(s) = mirror.states.get_mut(state_key) {
                    s.state = NodeState::Cancelled;
                    let _ = self.persistence.save_node_state(s);
                }
            }
        }

        let run = self
            .runs
            .get_mut(run_id)
            .ok_or(WorkflowError::RunNotFound { run_id: run_id.to_string() })?;
        run.state = WorkflowRunState::Cancelled;
        run.run_seq += 1;
        run.ended_at = Some(now_iso());
        self.persistence
            .save_run(run)
            .map_err(|e| WorkflowError::PersistenceFailed { message: e })?;

        self.emit(
            "run.cancelled",
            &serde_json::json!({ "run_id": run_id }),
        );

        Ok(())
    }

    fn finish_transition(&mut self, run_id: &str) -> Result<(), WorkflowError> {
        let current_state = {
            let run = self
                .runs
                .get(run_id)
                .ok_or(WorkflowError::RunNotFound { run_id: run_id.to_string() })?;
            run.state.clone()
        };

        match current_state {
            WorkflowRunState::Pausing => {
                let running: Vec<(String, String)> = {
                    let mirror = self
                        .mirrors
                        .get(run_id)
                        .ok_or(WorkflowError::RunNotFound { run_id: run_id.to_string() })?;
                    mirror
                        .running_set
                        .iter()
                        .filter_map(|sk| {
                            mirror
                                .states
                                .get(sk)
                                .and_then(|s| s.execution_id.clone().map(|e| (sk.clone(), e)))
                        })
                        .collect()
                };

                for (sk, exec_id) in &running {
                    let _ = self.executor.cancel(exec_id);
                    if let Some(mirror) = self.mirrors.get_mut(run_id) {
                        mirror.running_set.remove(sk);
                        if let Some(s) = mirror.states.get_mut(sk) {
                            s.state = NodeState::Cancelled;
                            let _ = self.persistence.save_node_state(s);
                        }
                    }
                }

                let run = self
                    .runs
                    .get_mut(run_id)
                    .ok_or(WorkflowError::RunNotFound { run_id: run_id.to_string() })?;
                run.state = WorkflowRunState::Paused;
                run.run_seq += 1;
                self.persistence
                    .save_run(run)
                    .map_err(|e| WorkflowError::PersistenceFailed { message: e })?;

                self.emit(
                    "run.paused",
                    &serde_json::json!({ "run_id": run_id }),
                );
            }
            WorkflowRunState::Cancelling => {
                let all_execs: Vec<(String, String)> = {
                    let mirror = self
                        .mirrors
                        .get(run_id)
                        .ok_or(WorkflowError::RunNotFound { run_id: run_id.to_string() })?;
                    mirror
                        .states
                        .iter()
                        .filter_map(|(sk, s)| {
                            s.execution_id.clone().map(|e| (sk.clone(), e))
                        })
                        .collect()
                };

                for (sk, exec_id) in &all_execs {
                    let _ = self.executor.cancel(exec_id);
                    if let Some(mirror) = self.mirrors.get_mut(run_id) {
                        mirror.running_set.remove(sk);
                        mirror.ready_set.remove(sk);
                        if let Some(s) = mirror.states.get_mut(sk) {
                            s.state = NodeState::Cancelled;
                            let _ = self.persistence.save_node_state(s);
                        }
                    }
                }

                let run = self
                    .runs
                    .get_mut(run_id)
                    .ok_or(WorkflowError::RunNotFound { run_id: run_id.to_string() })?;
                run.state = WorkflowRunState::Cancelled;
                run.run_seq += 1;
                run.ended_at = Some(now_iso());
                self.persistence
                    .save_run(run)
                    .map_err(|e| WorkflowError::PersistenceFailed { message: e })?;

                self.emit(
                    "run.cancelled",
                    &serde_json::json!({ "run_id": run_id }),
                );
            }
            _ => {}
        }

        Ok(())
    }

    fn finalize_run(&mut self, run_id: &str) -> Result<TickResult, WorkflowError> {
        let state_str;
        {
            let run = self
                .runs
                .get_mut(run_id)
                .ok_or(WorkflowError::RunNotFound { run_id: run_id.to_string() })?;
            let mirror = self
                .mirrors
                .get(run_id)
                .ok_or(WorkflowError::RunNotFound { run_id: run_id.to_string() })?;

            let all_succeeded = mirror.states.values().all(|s| s.state == NodeState::Succeeded);
            let any_failed = mirror.states.values().any(|s| s.state == NodeState::Failed);
            let all_terminal = mirror.states.values().all(|s| is_node_terminal(&s.state));

            if all_succeeded {
                run.state = WorkflowRunState::Succeeded;
            } else if any_failed {
                run.state = WorkflowRunState::Failed;
            } else if all_terminal {
                let any_cancelled =
                    mirror.states.values().any(|s| s.state == NodeState::Cancelled);
                if any_cancelled {
                    run.state = WorkflowRunState::Cancelled;
                } else if any_failed {
                    run.state = WorkflowRunState::Failed;
                } else {
                    run.state = WorkflowRunState::Succeeded;
                }
            }

            run.run_seq += 1;
            run.ended_at = Some(now_iso());
            state_str = format!("{:?}", run.state);
            self.persistence
                .save_run(run)
                .map_err(|e| WorkflowError::PersistenceFailed { message: e })?;
        }

        self.emit(
            "run.completed",
            &serde_json::json!({
                "run_id": run_id,
                "state": state_str,
            }),
        );

        Ok(TickResult {
            admitted: vec![],
            deferred: vec![],
            rejected: vec![],
            completed: vec![],
            failed: vec![],
            run_completed: true,
        })
    }

    pub fn get_run(&self, run_id: &str) -> Result<Option<WorkflowRun>, WorkflowError> {
        Ok(self.runs.get(run_id).cloned())
    }

    pub fn list_runs(&self) -> Result<Vec<WorkflowRun>, WorkflowError> {
        Ok(self.runs.values().cloned().collect())
    }

    pub fn get_run_metrics(&self, _run_id: &str) -> Result<serde_json::Value, WorkflowError> {
        Ok(serde_json::json!({}))
    }

    pub fn validate_snapshot(&self, _snapshot: GraphSnapshot) -> Result<(), WorkflowError> {
        Ok(())
    }

    fn emit(&self, event: &str, data: &serde_json::Value) {
        (self.emitter)(event, data);
    }

    fn generate_determinism_seed(length: u32) -> String {
        let mut seed = String::with_capacity(length as usize);
        while (seed.len() as u32) < length {
            let uuid = uuid::Uuid::new_v4();
            let hex = uuid.to_string().replace('-', "");
            seed.push_str(&hex);
        }
        seed.truncate(length as usize);
        seed
    }
}

// ---------------------------------------------------------------------------
// In-memory mock adapters for testing
// ---------------------------------------------------------------------------

#[cfg(test)]
pub struct MockPersistence {
    runs: std::sync::Mutex<HashMap<String, WorkflowRun>>,
    snapshots: std::sync::Mutex<HashMap<String, GraphSnapshot>>,
    node_states: std::sync::Mutex<HashMap<String, NodeRuntimeState>>,
}

#[cfg(test)]
impl MockPersistence {
    pub fn new() -> Self {
        Self {
            runs: std::sync::Mutex::new(HashMap::new()),
            snapshots: std::sync::Mutex::new(HashMap::new()),
            node_states: std::sync::Mutex::new(HashMap::new()),
        }
    }
}

#[cfg(test)]
impl PersistenceAdapter for MockPersistence {
    fn save_run(&self, run: &WorkflowRun) -> Result<(), String> {
        self.runs
            .lock()
            .map_err(|e| e.to_string())?
            .insert(run.run_id.clone(), run.clone());
        Ok(())
    }

    fn load_run(&self, run_id: &str) -> Result<Option<WorkflowRun>, String> {
        Ok(self
            .runs
            .lock()
            .map_err(|e| e.to_string())?
            .get(run_id)
            .cloned())
    }

    fn load_snapshot(&self, snapshot_id: &str) -> Result<Option<GraphSnapshot>, String> {
        Ok(self
            .snapshots
            .lock()
            .map_err(|e| e.to_string())?
            .get(snapshot_id)
            .cloned())
    }

    fn save_node_state(&self, state: &NodeRuntimeState) -> Result<(), String> {
        let key = state_key(&state.node_id, state.iteration_index);
        self.node_states
            .lock()
            .map_err(|e| e.to_string())?
            .insert(key, state.clone());
        Ok(())
    }

    fn load_node_states(&self, run_id: &str) -> Result<Vec<NodeRuntimeState>, String> {
        Ok(self
            .node_states
            .lock()
            .map_err(|e| e.to_string())?
            .values()
            .filter(|s| s.run_id == run_id)
            .cloned()
            .collect())
    }
}

#[cfg(test)]
pub struct MockScheduler;

#[cfg(test)]
impl SchedulerAdapter for MockScheduler {
    fn admit(&self, _request: &AdmissionRequest) -> Result<AdmissionResponse, String> {
        Ok(AdmissionResponse {
            admitted: _request.candidates.clone(),
            deferred: vec![],
            rejected: vec![],
        })
    }
}

#[cfg(test)]
pub struct MockExecutor;

#[cfg(test)]
impl ExecutionEngineAdapter for MockExecutor {
    fn execute(&self, _request: &ExecutionRequest) -> Result<WorkflowNodeResult, String> {
        Ok(WorkflowNodeResult::Success {
            execution_id: _request.execution_id.clone(),
            outputs: HashMap::new(),
            metrics: NodeMetrics {
                duration_ms: 0,
                tokens_used: 0,
                cost_usd: 0.0,
                tool_calls: 0,
            },
        })
    }

    fn status(&self, _execution_id: &str) -> Result<String, String> {
        Ok("completed".to_string())
    }

    fn cancel(&self, _execution_id: &str) -> Result<(), String> {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};

    fn dummy_emitter() -> Box<dyn Fn(&str, &serde_json::Value) + Send> {
        Box::new(|_event, _data| {})
    }

    fn dummy_emitter_counter(counter: &'static AtomicUsize) -> Box<dyn Fn(&str, &serde_json::Value) + Send> {
        Box::new(move |_event, _data| {
            counter.fetch_add(1, Ordering::SeqCst);
        })
    }

    fn make_snapshot(id: &str, node_ids: &[&str], edges: &[(&str, &str)]) -> GraphSnapshot {
        GraphSnapshot {
            snapshot_id: id.to_string(),
            workflow_id: String::new(),
            workflow_version: 1,
            nodes: node_ids
                .iter()
                .map(|nid| NodeDefinition {
                    node_id: nid.to_string(),
                    kind: NodeKind::Worker,
                    label: nid.to_string(),
                    config: serde_json::Value::Null,
                    input_ports: vec![],
                    output_ports: vec![],
                    retry_policy: RetryPolicy::default(),
                    timeout_ms: 0,
                    layout: NodeLayout { x: 0.0, y: 0.0 },
                    created_by: "test".to_string(),
                    plugin_id: None,
                    failure_policy: None,
                })
                .collect(),
            edges: edges
                .iter()
                .map(|(src, tgt)| EdgeDefinition {
                    edge_id: uuid::Uuid::new_v4().to_string(),
                    kind: EdgeKind::Control,
                    from_node_id: src.to_string(),
                    from_port_id: String::new(),
                    to_node_id: tgt.to_string(),
                    to_port_id: String::new(),
                    guard: None,
                    transform: None,
                    cardinality: EdgeCardinality::Single,
                    ordering: 0,
                    required: true,
                    activation_policy: ActivationPolicy::All,
                    origin: EdgeOrigin {
                        author_kind: "test".to_string(),
                        author_id: "test".to_string(),
                        trusted: true,
                        artifact_id: None,
                    },
                    validation: EdgeValidationRecord {
                        valid: true,
                        checked_at: String::new(),
                        errors: vec![],
                    },
                    label: None,
                    loop_back_edge: None,
                })
                .collect(),
            created_at: String::new(),
            content_hash: String::new(),
        }
    }

    fn make_engine(
        persistence: Box<dyn PersistenceAdapter + Send>,
        scheduler: Box<dyn SchedulerAdapter + Send>,
        executor: Box<dyn ExecutionEngineAdapter + Send>,
        emitter: Box<dyn Fn(&str, &serde_json::Value) + Send>,
    ) -> WorkflowEngine {
        WorkflowEngine::new(
            WorkflowEngineConfig::default(),
            persistence,
            scheduler,
            executor,
            emitter,
        )
    }

    #[test]
    fn test_create_run_succeeds_with_valid_snapshot() {
        let persistence = Box::new(MockPersistence::new());
        let scheduler = Box::new(MockScheduler);
        let executor = Box::new(MockExecutor);
        let emitter = dummy_emitter();

        let mut engine = make_engine(persistence, scheduler, executor, emitter);
        let snapshot = make_snapshot("snap-1", &["a", "b"], &[("a", "b")]);

        let run = engine
            .create_run(
                "wf-1".to_string(),
                1,
                snapshot,
                RunTrigger {
                    trigger_id: "trig-1".to_string(),
                    kind: TriggerKind::UserManual,
                    fired_at: String::new(),
                    fired_by: "test".to_string(),
                    payload: HashMap::new(),
                    idempotency_key: None,
                },
                "ws-1".to_string(),
                "proj-1".to_string(),
                "sess-1".to_string(),
                RunMode::Normal,
            )
            .unwrap();

        assert_eq!(run.state, WorkflowRunState::Running);
        assert!(!run.started_at.is_empty());
        assert_eq!(run.node_count, 2);
        assert_eq!(run.workflow_id, "wf-1");
    }

    #[test]
    fn test_create_run_fails_with_cycle_in_graph() {
        let persistence = Box::new(MockPersistence::new());
        let scheduler = Box::new(MockScheduler);
        let executor = Box::new(MockExecutor);
        let emitter = dummy_emitter();

        let mut engine = make_engine(persistence, scheduler, executor, emitter);
        // a -> b -> c -> a creates a cycle
        let snapshot = make_snapshot("snap-cycle", &["a", "b", "c"], &[("a", "b"), ("b", "c"), ("c", "a")]);

        let result = engine.create_run(
            "wf-cycle".to_string(),
            1,
            snapshot,
            RunTrigger {
                trigger_id: "trig-1".to_string(),
                kind: TriggerKind::UserManual,
                fired_at: String::new(),
                fired_by: "test".to_string(),
                payload: HashMap::new(),
                idempotency_key: None,
            },
            "ws-1".to_string(),
            "proj-1".to_string(),
            "sess-1".to_string(),
            RunMode::Normal,
        );

        assert!(result.is_err());
        match result {
            Err(WorkflowError::GraphInvalid { .. }) => {}
            _ => panic!("Expected GraphInvalid error"),
        }
    }

    #[test]
    fn test_tick_with_empty_run_returns_ok() {
        static EMIT_COUNT: AtomicUsize = AtomicUsize::new(0);
        let persistence = Box::new(MockPersistence::new());
        let scheduler = Box::new(MockScheduler);
        let executor = Box::new(MockExecutor);
        let emitter = dummy_emitter_counter(&EMIT_COUNT);

        let mut engine = make_engine(persistence, scheduler, executor, emitter);
        let snapshot = make_snapshot("snap-empty", &["a"], &[]);
        let run = engine
            .create_run(
                "wf-empty".to_string(),
                1,
                snapshot,
                RunTrigger {
                    trigger_id: "trig-1".to_string(),
                    kind: TriggerKind::UserManual,
                    fired_at: String::new(),
                    fired_by: "test".to_string(),
                    payload: HashMap::new(),
                    idempotency_key: None,
                },
                "ws-1".to_string(),
                "proj-1".to_string(),
                "sess-1".to_string(),
                RunMode::Normal,
            )
            .unwrap();

        // tick should process node "a" since it has no deps
        let result = engine.tick(&run.run_id).unwrap();
        assert!(!result.admitted.is_empty() || result.run_completed);
    }

    #[test]
    fn test_tick_processes_ready_nodes() {
        let persistence = Box::new(MockPersistence::new());
        let scheduler = Box::new(MockScheduler);
        let executor = Box::new(MockExecutor);
        let emitter = dummy_emitter();

        let mut engine = make_engine(persistence, scheduler, executor, emitter);
        let snapshot = make_snapshot("snap-tick", &["a", "b"], &[("a", "b")]);
        let run = engine
            .create_run(
                "wf-tick".to_string(),
                1,
                snapshot,
                RunTrigger {
                    trigger_id: "trig-1".to_string(),
                    kind: TriggerKind::UserManual,
                    fired_at: String::new(),
                    fired_by: "test".to_string(),
                    payload: HashMap::new(),
                    idempotency_key: None,
                },
                "ws-1".to_string(),
                "proj-1".to_string(),
                "sess-1".to_string(),
                RunMode::Normal,
            )
            .unwrap();

        let result = engine.tick(&run.run_id).unwrap();
        // "a" has no deps, so it should be admitted
        assert!(!result.admitted.is_empty(), "expected at least one admitted node");
    }

    #[test]
    fn test_handle_node_result_completes_node() {
        let persistence = Box::new(MockPersistence::new());
        let scheduler = Box::new(MockScheduler);
        let executor = Box::new(MockExecutor);
        let emitter = dummy_emitter();

        let mut engine = make_engine(persistence, scheduler, executor, emitter);
        let snapshot = make_snapshot("snap-complete", &["a"], &[]);
        let run = engine
            .create_run(
                "wf-complete".to_string(),
                1,
                snapshot,
                RunTrigger {
                    trigger_id: "trig-1".to_string(),
                    kind: TriggerKind::UserManual,
                    fired_at: String::new(),
                    fired_by: "test".to_string(),
                    payload: HashMap::new(),
                    idempotency_key: None,
                },
                "ws-1".to_string(),
                "proj-1".to_string(),
                "sess-1".to_string(),
                RunMode::Normal,
            )
            .unwrap();

        let result = engine.tick(&run.run_id).unwrap();
        assert!(!result.admitted.is_empty(), "expected a to be admitted");

        // Find the execution_id for node "a"
        let execution_id;
        {
            let mirror = engine.mirrors.get(&run.run_id).unwrap();
            let a_state = mirror
                .states
                .values()
                .find(|s| s.node_id == "a")
                .expect("state for node a");
            execution_id = a_state
                .execution_id
                .clone()
                .expect("execution_id for a");
        }

        let node_result = WorkflowNodeResult::Success {
            execution_id: execution_id.clone(),
            outputs: HashMap::new(),
            metrics: NodeMetrics {
                duration_ms: 0,
                tokens_used: 0,
                cost_usd: 0.0,
                tool_calls: 0,
            },
        };
        engine
            .handle_node_result(&run.run_id, &execution_id, &node_result)
            .unwrap();

        let mirror = engine.mirrors.get(&run.run_id).unwrap();
        let a_state = mirror
            .states
            .values()
            .find(|s| s.node_id == "a")
            .expect("state for node a");
        assert_eq!(a_state.state, NodeState::Succeeded);

        let run = engine.runs.get(&run.run_id).unwrap();
        assert_eq!(run.completed_node_count, 1);
    }

    #[test]
    fn test_pause_resume_cycle() {
        let persistence = Box::new(MockPersistence::new());
        let scheduler = Box::new(MockScheduler);
        let executor = Box::new(MockExecutor);
        let emitter = dummy_emitter();

        let mut engine = make_engine(persistence, scheduler, executor, emitter);
        let snapshot = make_snapshot("snap-pause", &["a"], &[]);
        let run = engine
            .create_run(
                "wf-pause".to_string(),
                1,
                snapshot,
                RunTrigger {
                    trigger_id: "trig-1".to_string(),
                    kind: TriggerKind::UserManual,
                    fired_at: String::new(),
                    fired_by: "test".to_string(),
                    payload: HashMap::new(),
                    idempotency_key: None,
                },
                "ws-1".to_string(),
                "proj-1".to_string(),
                "sess-1".to_string(),
                RunMode::Normal,
            )
            .unwrap();

        // Tick once to advance state, then pause
        let _ = engine.tick(&run.run_id);

        engine.pause_run(&run.run_id).unwrap();
        {
            let run = engine.runs.get(&run.run_id).unwrap();
            assert_eq!(run.state, WorkflowRunState::Pausing);
        }

        // finish_transition via tick
        let _ = engine.tick(&run.run_id);
        {
            let run = engine.runs.get(&run.run_id).unwrap();
            assert_eq!(run.state, WorkflowRunState::Paused);
        }

        engine.resume_run(&run.run_id).unwrap();
        {
            let run = engine.runs.get(&run.run_id).unwrap();
            assert_eq!(run.state, WorkflowRunState::Running);
        }
    }

    #[test]
    fn test_cancel_sets_correct_state() {
        let persistence = Box::new(MockPersistence::new());
        let scheduler = Box::new(MockScheduler);
        let executor = Box::new(MockExecutor);
        let emitter = dummy_emitter();

        let mut engine = make_engine(persistence, scheduler, executor, emitter);
        let snapshot = make_snapshot("snap-cancel", &["a", "b"], &[("a", "b")]);
        let run = engine
            .create_run(
                "wf-cancel".to_string(),
                1,
                snapshot,
                RunTrigger {
                    trigger_id: "trig-1".to_string(),
                    kind: TriggerKind::UserManual,
                    fired_at: String::new(),
                    fired_by: "test".to_string(),
                    payload: HashMap::new(),
                    idempotency_key: None,
                },
                "ws-1".to_string(),
                "proj-1".to_string(),
                "sess-1".to_string(),
                RunMode::Normal,
            )
            .unwrap();

        engine.cancel_run(&run.run_id).unwrap();
        {
            let run = engine.runs.get(&run.run_id).unwrap();
            assert_eq!(run.state, WorkflowRunState::Cancelled);
            assert!(run.ended_at.is_some());
        }

        let mirror = engine.mirrors.get(&run.run_id).unwrap();
        for state in mirror.states.values() {
            assert!(
                state.state == NodeState::Cancelled || state.state == NodeState::Pending,
                "unexpected state {:?} for node {}",
                state.state,
                state.node_id
            );
        }
    }

    #[test]
    fn test_cancel_run_twice_is_idempotent() {
        let persistence = Box::new(MockPersistence::new());
        let scheduler = Box::new(MockScheduler);
        let executor = Box::new(MockExecutor);
        let emitter = dummy_emitter();

        let mut engine = make_engine(persistence, scheduler, executor, emitter);
        let snapshot = make_snapshot("snap-idemp", &["a"], &[]);
        let run = engine
            .create_run(
                "wf-idemp".to_string(),
                1,
                snapshot,
                RunTrigger {
                    trigger_id: "trig-1".to_string(),
                    kind: TriggerKind::UserManual,
                    fired_at: String::new(),
                    fired_by: "test".to_string(),
                    payload: HashMap::new(),
                    idempotency_key: None,
                },
                "ws-1".to_string(),
                "proj-1".to_string(),
                "sess-1".to_string(),
                RunMode::Normal,
            )
            .unwrap();

        engine.cancel_run(&run.run_id).unwrap();
        // Second cancel should be a no-op since state is already terminal
        engine.cancel_run(&run.run_id).unwrap();
        {
            let run = engine.runs.get(&run.run_id).unwrap();
            assert_eq!(run.state, WorkflowRunState::Cancelled);
        }
    }

    #[test]
    fn test_create_run_invalid_snapshot_no_nodes() {
        let persistence = Box::new(MockPersistence::new());
        let scheduler = Box::new(MockScheduler);
        let executor = Box::new(MockExecutor);
        let emitter = dummy_emitter();

        let mut engine = make_engine(persistence, scheduler, executor, emitter);
        let snapshot = make_snapshot("snap-empty-nodes", &[], &[]);

        let run = engine
            .create_run(
                "wf-no-nodes".to_string(),
                1,
                snapshot,
                RunTrigger {
                    trigger_id: "trig-1".to_string(),
                    kind: TriggerKind::UserManual,
                    fired_at: String::new(),
                    fired_by: "test".to_string(),
                    payload: HashMap::new(),
                    idempotency_key: None,
                },
                "ws-1".to_string(),
                "proj-1".to_string(),
                "sess-1".to_string(),
                RunMode::Normal,
            )
            .unwrap();

        // No nodes means it should immediately complete
        let result = engine.tick(&run.run_id).unwrap();
        assert!(result.run_completed);

        let run = engine.runs.get(&run.run_id).unwrap();
        assert_eq!(run.state, WorkflowRunState::Succeeded);
    }

    #[test]
    fn test_tick_after_node_result_completes_downstream() {
        let persistence = Box::new(MockPersistence::new());
        let scheduler = Box::new(MockScheduler);
        let executor = Box::new(MockExecutor);
        let emitter = dummy_emitter();

        let mut engine = make_engine(persistence, scheduler, executor, emitter);
        // a -> b (b depends on a)
        let snapshot = make_snapshot("snap-downstream", &["a", "b"], &[("a", "b")]);
        let run = engine
            .create_run(
                "wf-downstream".to_string(),
                1,
                snapshot,
                RunTrigger {
                    trigger_id: "trig-1".to_string(),
                    kind: TriggerKind::UserManual,
                    fired_at: String::new(),
                    fired_by: "test".to_string(),
                    payload: HashMap::new(),
                    idempotency_key: None,
                },
                "ws-1".to_string(),
                "proj-1".to_string(),
                "sess-1".to_string(),
                RunMode::Normal,
            )
            .unwrap();

        // Tick should admit a
        let result = engine.tick(&run.run_id).unwrap();
        assert!(result.admitted.iter().any(|sk| {
            let (nid, _) = parse_state_key(sk).unwrap_or_default();
            nid == "a"
        }));

        // Find a's execution id
        let exec_a = {
            let mirror = engine.mirrors.get(&run.run_id).unwrap();
            let s = mirror.states.values().find(|s| s.node_id == "a").unwrap();
            s.execution_id.clone().unwrap()
        };

        // Complete a
        let node_result = WorkflowNodeResult::Success {
            execution_id: exec_a.clone(),
            outputs: HashMap::new(),
            metrics: NodeMetrics {
                duration_ms: 0,
                tokens_used: 0,
                cost_usd: 0.0,
                tool_calls: 0,
            },
        };
        engine
            .handle_node_result(&run.run_id, &exec_a, &node_result)
            .unwrap();

        // Now b should be ready
        let mirror = engine.mirrors.get(&run.run_id).unwrap();
        let b_state = mirror
            .states
            .values()
            .find(|s| s.node_id == "b")
            .unwrap();
        assert_eq!(b_state.state, NodeState::Ready);

        // Tick should admit b
        let result = engine.tick(&run.run_id).unwrap();
        assert!(result.admitted.iter().any(|sk| {
            let (nid, _) = parse_state_key(sk).unwrap_or_default();
            nid == "b"
        }));
    }
}
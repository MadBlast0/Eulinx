use std::collections::{HashMap, HashSet};

use crate::workflow::types::*;

// ---------------------------------------------------------------------------
// Node state update — opaque patch for update_node_state
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Default)]
pub struct NodeStateUpdate {
    pub state: Option<NodeState>,
    pub remaining_deps: Option<u32>,
    pub attempt: Option<u32>,
    pub execution_id: Option<Option<String>>,
    pub started_at: Option<Option<String>>,
    pub ended_at: Option<Option<String>>,
    pub skip_reason: Option<Option<SkipReason>>,
    pub failure: Option<Option<NodeFailure>>,
}

// ---------------------------------------------------------------------------
// Graph Mirror (WorkflowEngine-Part02 §The In-Memory Mirror)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct GraphMirror {
    pub snapshot_id: SnapshotId,
    pub nodes: HashMap<NodeId, NodeDefinition>,
    pub edges: HashMap<EdgeId, EdgeDefinition>,
    pub outgoing: HashMap<NodeId, Vec<EdgeId>>,
    pub incoming: HashMap<NodeId, Vec<EdgeId>>,
    pub states: HashMap<String, NodeRuntimeState>,
    pub ready_set: HashSet<String>,
    pub running_set: HashSet<String>,
    pub topo_order: Vec<NodeId>,
}

// ---------------------------------------------------------------------------
// Composite state key (WorkflowEngine-Part02 §stateKey)
// ---------------------------------------------------------------------------

pub fn state_key(node_id: &str, iteration_index: u32) -> String {
    format!("{}#{}", node_id, iteration_index)
}

pub fn parse_state_key(key: &str) -> Result<(String, u32), String> {
    let idx = key.rfind('#').ok_or_else(|| format!("Invalid state key: {}", key))?;
    let node_id = key[..idx].to_string();
    let iteration_index: u32 = key[idx + 1..]
        .parse()
        .map_err(|_| format!("Invalid state key: {}", key))?;
    Ok((node_id, iteration_index))
}

// ---------------------------------------------------------------------------
// Node state transition guard (NodeArchitecture-Part03 §Transition Rules)
// ---------------------------------------------------------------------------

pub fn is_legal_transition(from: &NodeState, to: &NodeState) -> bool {
    matches!(
        (from, to),
        (NodeState::Pending, NodeState::Ready)
            | (NodeState::Pending, NodeState::Skipped)
            | (NodeState::Pending, NodeState::Cancelled)
            | (NodeState::Ready, NodeState::Running)
            | (NodeState::Ready, NodeState::Skipped)
            | (NodeState::Ready, NodeState::Cancelled)
            | (NodeState::Running, NodeState::Succeeded)
            | (NodeState::Running, NodeState::Failed)
            | (NodeState::Running, NodeState::Cancelled)
    )
}

// ---------------------------------------------------------------------------
// Topological sort (Kahn's algorithm)
// WorkflowEngine-Part02 §Building the Mirror step 7
// ---------------------------------------------------------------------------

pub fn compute_topological_order(
    nodes: &HashMap<NodeId, NodeDefinition>,
    edges: &HashMap<EdgeId, EdgeDefinition>,
) -> Vec<NodeId> {
    let mut in_degree: HashMap<&str, usize> = HashMap::new();
    let mut adj: HashMap<&str, Vec<&str>> = HashMap::new();

    for node_id in nodes.keys() {
        in_degree.insert(node_id.as_str(), 0);
        adj.insert(node_id.as_str(), Vec::new());
    }

    for edge in edges.values() {
        if edge.loop_back_edge.is_some() {
            continue;
        }
        if edge.kind == EdgeKind::LoopBack {
            continue;
        }
        if let Some(degree) = in_degree.get_mut(edge.to_node_id.as_str()) {
            *degree += 1;
        }
        if let Some(neighbors) = adj.get_mut(edge.from_node_id.as_str()) {
            neighbors.push(edge.to_node_id.as_str());
        }
    }

    // Kahn's with stable tie-break by nodeId
    let mut queue: Vec<&str> = in_degree
        .iter()
        .filter(|(_, &deg)| deg == 0)
        .map(|(id, _)| *id)
        .collect();
    queue.sort_unstable();

    let mut result = Vec::with_capacity(nodes.len());
    while !queue.is_empty() {
        let node_id = queue.remove(0);
        result.push(node_id.to_string());

        if let Some(neighbors) = adj.get(node_id) {
            for &neighbor in neighbors {
                if let Some(degree) = in_degree.get_mut(neighbor) {
                    *degree -= 1;
                    if *degree == 0 {
                        let insert_idx = queue
                            .iter()
                            .position(|&q| q > neighbor)
                            .unwrap_or(queue.len());
                        queue.insert(insert_idx, neighbor);
                    }
                }
            }
        }
    }

    result
}

// ---------------------------------------------------------------------------
// Detect illegal cycles (for validation)
// Uses DFS with WHITE / GRAY / BLACK coloring
// ---------------------------------------------------------------------------

pub fn detect_cycle(
    nodes: &HashMap<NodeId, NodeDefinition>,
    edges: &HashMap<EdgeId, EdgeDefinition>,
) -> Option<Vec<NodeId>> {
    #[derive(Clone, Copy, PartialEq)]
    enum Color {
        White,
        Gray,
        Black,
    }

    let mut color: HashMap<String, Color> = HashMap::new();
    let mut parent: HashMap<String, String> = HashMap::new();

    for node_id in nodes.keys() {
        color.insert(node_id.clone(), Color::White);
    }

    // Build adjacency (excluding loop-back edges)
    let mut adj: HashMap<String, Vec<String>> = HashMap::new();
    for node_id in nodes.keys() {
        adj.insert(node_id.clone(), Vec::new());
    }
    for edge in edges.values() {
        if edge.loop_back_edge.is_some() {
            continue;
        }
        if edge.kind == EdgeKind::LoopBack {
            continue;
        }
        if let Some(neighbors) = adj.get_mut(&edge.from_node_id) {
            neighbors.push(edge.to_node_id.clone());
        }
    }

    fn dfs(
        node: &str,
        color: &mut HashMap<String, Color>,
        parent: &mut HashMap<String, String>,
        adj: &HashMap<String, Vec<String>>,
    ) -> Option<Vec<String>> {
        color.insert(node.to_string(), Color::Gray);

        if let Some(neighbors) = adj.get(node) {
            for next in neighbors {
                match color.get(next) {
                    Some(Color::Gray) => {
                        // Back edge found — reconstruct cycle
                        let mut cycle = vec![next.clone(), node.to_string()];
                        let mut cur = node.to_string();
                        while cur != *next {
                            cur = parent.get(&cur)?.clone();
                            cycle.push(cur.clone());
                        }
                        cycle.reverse();
                        return Some(cycle);
                    }
                    Some(Color::White) => {
                        parent.insert(next.clone(), node.to_string());
                        if let Some(result) = dfs(next, color, parent, adj) {
                            return Some(result);
                        }
                    }
                    _ => {}
                }
            }
        }

        color.insert(node.to_string(), Color::Black);
        None
    }

    let keys: Vec<String> = color.keys().cloned().collect();
    for node_id in keys {
        if color.get(&node_id) == Some(&Color::White) {
            if let Some(cycle) = dfs(&node_id, &mut color, &mut parent, &adj) {
                return Some(cycle);
            }
        }
    }

    None
}

// ---------------------------------------------------------------------------
// Build adjacency maps (edges sorted by edgeId for determinism)
// ---------------------------------------------------------------------------

fn build_adjacency(
    edges: &HashMap<EdgeId, EdgeDefinition>,
) -> (HashMap<NodeId, Vec<EdgeId>>, HashMap<NodeId, Vec<EdgeId>>) {
    let mut outgoing: HashMap<NodeId, Vec<EdgeId>> = HashMap::new();
    let mut incoming: HashMap<NodeId, Vec<EdgeId>> = HashMap::new();

    // Sort edges by edgeId for deterministic ordering
    let mut sorted: Vec<&EdgeDefinition> = edges.values().collect();
    sorted.sort_by(|a, b| a.edge_id.cmp(&b.edge_id));

    for edge in &sorted {
        outgoing
            .entry(edge.from_node_id.clone())
            .or_default()
            .push(edge.edge_id.clone());

        incoming
            .entry(edge.to_node_id.clone())
            .or_default()
            .push(edge.edge_id.clone());
    }

    (outgoing, incoming)
}

// ---------------------------------------------------------------------------
// Compute initial remaining deps
// WorkflowEngine-Part02 §Building the Mirror step 9
// ---------------------------------------------------------------------------

fn compute_initial_remaining_deps(
    node_id: &str,
    incoming: &HashMap<NodeId, Vec<EdgeId>>,
    edges: &HashMap<EdgeId, EdgeDefinition>,
) -> u32 {
    let mut count = 0u32;
    if let Some(in_edges) = incoming.get(node_id) {
        for edge_id in in_edges {
            if let Some(edge) = edges.get(edge_id) {
                if edge.loop_back_edge.is_some() {
                    continue;
                }
                if edge.kind == EdgeKind::LoopBack {
                    continue;
                }
                count += 1;
            }
        }
    }
    count
}

// ---------------------------------------------------------------------------
// Build GraphMirror from snapshot + persisted state
// WorkflowEngine-Part02 §Building the Mirror
// ---------------------------------------------------------------------------

pub fn build_mirror(
    snapshot: &GraphSnapshot,
    persisted_states: &[NodeRuntimeState],
) -> GraphMirror {
    let mut nodes = HashMap::with_capacity(snapshot.nodes.len());
    for node in &snapshot.nodes {
        nodes.insert(node.node_id.clone(), node.clone());
    }

    let mut edges = HashMap::with_capacity(snapshot.edges.len());
    for edge in &snapshot.edges {
        edges.insert(edge.edge_id.clone(), edge.clone());
    }

    let (outgoing, incoming) = build_adjacency(&edges);
    let topo_order = compute_topological_order(&nodes, &edges);

    // Build states map from persisted data
    let mut states: HashMap<String, NodeRuntimeState> = HashMap::new();
    for state in persisted_states {
        let key = state_key(&state.node_id, state.iteration_index);
        states.insert(key, state.clone());
    }

    // Default run_id from first persisted state (or empty string)
    let default_run_id = persisted_states
        .first()
        .map(|s| s.run_id.clone())
        .unwrap_or_default();

    // Insert missing states for nodes at iteration 0
    for node_id in nodes.keys() {
        let key = state_key(node_id, 0);
        if !states.contains_key(&key) {
            let remaining_deps = compute_initial_remaining_deps(node_id, &incoming, &edges);
            states.insert(
                key,
                NodeRuntimeState {
                    run_id: default_run_id.clone(),
                    node_id: node_id.clone(),
                    iteration_index: 0,
                    state: NodeState::Pending,
                    remaining_deps,
                    attempt: 0,
                    execution_id: None,
                    started_at: None,
                    ended_at: None,
                    outputs: None,
                    failure: None,
                    skip_reason: None,
                },
            );
        }
    }

    // Rebuild ready_set and running_set
    let mut ready_set = HashSet::new();
    let mut running_set = HashSet::new();
    for (key, state) in &states {
        if state.state == NodeState::Ready {
            ready_set.insert(key.clone());
        }
        if state.state == NodeState::Running {
            running_set.insert(key.clone());
        }
    }

    GraphMirror {
        snapshot_id: snapshot.snapshot_id.clone(),
        nodes,
        edges,
        outgoing,
        incoming,
        states,
        ready_set,
        running_set,
        topo_order,
    }
}

// ---------------------------------------------------------------------------
// Update node state in the mirror and manage readySet / runningSet
// ---------------------------------------------------------------------------

pub fn update_node_state(
    mirror: &mut GraphMirror,
    node_id: &str,
    iteration_index: u32,
    updates: &NodeStateUpdate,
) -> Result<(), String> {
    let key = state_key(node_id, iteration_index);

    let current = mirror
        .states
        .get_mut(&key)
        .ok_or_else(|| format!("Node state not found: {}", key))?;

    // If a new state is provided, validate and apply the transition
    if let Some(ref new_state) = updates.state {
        if !is_legal_transition(&current.state, new_state) {
            return Err(format!(
                "Illegal transition: {:?} -> {:?}",
                current.state, new_state
            ));
        }
        if current.state == *new_state {
            return Err(format!("Node already in state {:?}", new_state));
        }

        // Remove from old set
        if current.state == NodeState::Ready {
            mirror.ready_set.remove(&key);
        }
        if current.state == NodeState::Running {
            mirror.running_set.remove(&key);
        }

        current.state = new_state.clone();

        // Add to new set
        if *new_state == NodeState::Ready {
            mirror.ready_set.insert(key.clone());
        }
        if *new_state == NodeState::Running {
            mirror.running_set.insert(key.clone());
        }
    }

    // Apply remaining patches
    if let Some(v) = updates.remaining_deps {
        current.remaining_deps = v;
    }
    if let Some(v) = updates.attempt {
        current.attempt = v;
    }
    if let Some(ref v) = updates.execution_id {
        current.execution_id = v.clone();
    }
    if let Some(ref v) = updates.started_at {
        current.started_at = v.clone();
    }
    if let Some(ref v) = updates.ended_at {
        current.ended_at = v.clone();
    }
    if let Some(ref v) = updates.skip_reason {
        current.skip_reason = v.clone();
    }
    if let Some(ref v) = updates.failure {
        current.failure = v.clone();
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    // -----------------------------------------------------------------------
    // Helpers — construct minimal instances of the workflow types.
    // Field names follow the snake_case convention expected from
    // crate::workflow::types.
    // -----------------------------------------------------------------------

    fn nid(id: &str) -> NodeId {
        id.to_string()
    }

    fn eid(id: &str) -> EdgeId {
        id.to_string()
    }

    fn make_node(id: &str) -> NodeDefinition {
        NodeDefinition {
            node_id: id.to_string(),
            kind: NodeKind::Worker,
            label: id.to_string(),
            config: serde_json::Value::Null,
            input_ports: Vec::new(),
            output_ports: Vec::new(),
            retry_policy: RetryPolicy::default(),
            timeout_ms: 30_000,
            layout: NodeLayout { x: 0.0, y: 0.0 },
            created_by: "user".to_string(),
            plugin_id: None,
            failure_policy: None,
        }
    }

    fn make_edge(id: &str, from: &str, to: &str) -> EdgeDefinition {
        EdgeDefinition {
            edge_id: id.to_string(),
            kind: EdgeKind::Control,
            from_node_id: from.to_string(),
            from_port_id: "out".to_string(),
            to_node_id: to.to_string(),
            to_port_id: "in".to_string(),
            guard: None,
            transform: None,
            cardinality: EdgeCardinality::Single,
            ordering: 0,
            required: true,
            activation_policy: ActivationPolicy::All,
            origin: EdgeOrigin {
                author_kind: "user".to_string(),
                author_id: "test".to_string(),
                trusted: true,
                artifact_id: None,
            },
            validation: EdgeValidationRecord {
                valid: true,
                checked_at: "2025-01-01T00:00:00Z".to_string(),
                errors: vec![],
            },
            label: None,
            loop_back_edge: None,
        }
    }

    fn make_loop_back_edge(id: &str, from: &str, to: &str, loop_node_id: &str) -> EdgeDefinition {
        let mut edge = make_edge(id, from, to);
        edge.kind = EdgeKind::LoopBack;
        edge.loop_back_edge = Some(LoopBackEdge {
            loop_node_id: loop_node_id.to_string(),
        });
        edge
    }

    fn make_snapshot(nodes: Vec<NodeDefinition>, edges: Vec<EdgeDefinition>) -> GraphSnapshot {
        GraphSnapshot {
            snapshot_id: "snap_test".to_string(),
            workflow_id: "wf_test".to_string(),
            workflow_version: 1,
            nodes,
            edges,
            created_at: "2025-01-01T00:00:00Z".to_string(),
            content_hash: "hash_test".to_string(),
        }
    }

    fn make_state(
        run_id: &str,
        node_id: &str,
        iteration_index: u32,
        state: NodeState,
        remaining_deps: u32,
    ) -> NodeRuntimeState {
        NodeRuntimeState {
            run_id: run_id.to_string(),
            node_id: node_id.to_string(),
            iteration_index,
            state,
            remaining_deps,
            attempt: 0,
            execution_id: None,
            started_at: None,
            ended_at: None,
            outputs: None,
            failure: None,
            skip_reason: None,
        }
    }

    // -----------------------------------------------------------------------
    // state_key / parse_state_key
    // -----------------------------------------------------------------------

    #[test]
    fn test_state_key_roundtrip() {
        let key = state_key(&nid("node1"), 0);
        assert_eq!(key, "node1#0");
        let (node_id, iter) = parse_state_key(&key).unwrap();
        assert_eq!(node_id, "node1");
        assert_eq!(iter, 0);
    }

    #[test]
    fn test_state_key_non_zero_iteration() {
        let key = state_key(&nid("node1"), 3);
        let (_, iter) = parse_state_key(&key).unwrap();
        assert_eq!(iter, 3);
    }

    #[test]
    fn test_state_key_node_id_with_hash() {
        let key = state_key(&nid("ns#42"), 1);
        let (node_id, iter) = parse_state_key(&key).unwrap();
        assert_eq!(node_id, "ns#42");
        assert_eq!(iter, 1);
    }

    #[test]
    fn test_parse_state_key_invalid() {
        assert!(parse_state_key("no_hash").is_err());
    }

    #[test]
    fn test_parse_state_key_empty_after_hash() {
        assert!(parse_state_key("node#").is_err());
    }

    // -----------------------------------------------------------------------
    // compute_topological_order
    // -----------------------------------------------------------------------

    #[test]
    fn test_topo_empty_graph() {
        let nodes = HashMap::new();
        let edges = HashMap::new();
        let order = compute_topological_order(&nodes, &edges);
        assert!(order.is_empty());
    }

    #[test]
    fn test_topo_linear_chain() {
        let mut nodes = HashMap::new();
        nodes.insert(nid("A"), make_node("A"));
        nodes.insert(nid("B"), make_node("B"));
        nodes.insert(nid("C"), make_node("C"));

        let mut edges = HashMap::new();
        edges.insert(eid("e1"), make_edge("e1", "A", "B"));
        edges.insert(eid("e2"), make_edge("e2", "B", "C"));

        let order = compute_topological_order(&nodes, &edges);
        assert_eq!(order.len(), 3);
        assert!(
            order.iter().position(|id| id == "A").unwrap()
                < order.iter().position(|id| id == "B").unwrap()
        );
        assert!(
            order.iter().position(|id| id == "B").unwrap()
                < order.iter().position(|id| id == "C").unwrap()
        );
    }

    #[test]
    fn test_topo_diamond_graph() {
        let mut nodes = HashMap::new();
        for id in ["A", "B", "C", "D"] {
            nodes.insert(nid(id), make_node(id));
        }

        let mut edges = HashMap::new();
        edges.insert(eid("e1"), make_edge("e1", "A", "B"));
        edges.insert(eid("e2"), make_edge("e2", "A", "C"));
        edges.insert(eid("e3"), make_edge("e3", "B", "D"));
        edges.insert(eid("e4"), make_edge("e4", "C", "D"));

        let order = compute_topological_order(&nodes, &edges);
        assert_eq!(order.len(), 4);
        // A must be first
        assert_eq!(order[0], "A");
        // D must be last
        assert_eq!(order[3], "D");
        // B before D, C before D
        assert!(
            order.iter().position(|id| id == "B").unwrap()
                < order.iter().position(|id| id == "D").unwrap()
        );
        assert!(
            order.iter().position(|id| id == "C").unwrap()
                < order.iter().position(|id| id == "D").unwrap()
        );
    }

    #[test]
    fn test_topo_excludes_loop_back_edges() {
        let mut nodes = HashMap::new();
        nodes.insert(nid("A"), make_node("A"));
        nodes.insert(nid("B"), make_node("B"));

        let mut edges = HashMap::new();
        edges.insert(eid("e1"), make_edge("e1", "A", "B"));
        edges.insert(eid("e2"), make_loop_back_edge("e2", "B", "A", "loop"));

        let order = compute_topological_order(&nodes, &edges);
        assert_eq!(order.len(), 2);
        assert!(
            order.iter().position(|id| id == "A").unwrap()
                < order.iter().position(|id| id == "B").unwrap()
        );
    }

    #[test]
    fn test_topo_independent_nodes() {
        let mut nodes = HashMap::new();
        for id in ["A", "B", "C"] {
            nodes.insert(nid(id), make_node(id));
        }
        let edges = HashMap::new();

        let order = compute_topological_order(&nodes, &edges);
        assert_eq!(order.len(), 3);
    }

    #[test]
    fn test_topo_deterministic_tie_break() {
        let mut nodes = HashMap::new();
        for id in ["B", "A", "C"] {
            nodes.insert(nid(id), make_node(id));
        }
        let edges = HashMap::new();

        let order = compute_topological_order(&nodes, &edges);
        // Sources should appear in sorted order: A, B, C
        assert_eq!(order[0], "A");
        assert_eq!(order[1], "B");
        assert_eq!(order[2], "C");
    }

    // -----------------------------------------------------------------------
    // detect_cycle
    // -----------------------------------------------------------------------

    #[test]
    fn test_detect_cycle_dag() {
        let mut nodes = HashMap::new();
        nodes.insert(nid("A"), make_node("A"));
        nodes.insert(nid("B"), make_node("B"));

        let mut edges = HashMap::new();
        edges.insert(eid("e1"), make_edge("e1", "A", "B"));

        assert!(detect_cycle(&nodes, &edges).is_none());
    }

    #[test]
    fn test_detect_cycle_simple_cycle() {
        let mut nodes = HashMap::new();
        nodes.insert(nid("A"), make_node("A"));
        nodes.insert(nid("B"), make_node("B"));

        let mut edges = HashMap::new();
        edges.insert(eid("e1"), make_edge("e1", "A", "B"));
        edges.insert(eid("e2"), make_edge("e2", "B", "A"));

        let cycle = detect_cycle(&nodes, &edges);
        assert!(cycle.is_some());
        let cycle = cycle.unwrap();
        assert!(cycle.contains(&"A".to_string()));
        assert!(cycle.contains(&"B".to_string()));
    }

    #[test]
    fn test_detect_cycle_allows_loop_back_edge() {
        let mut nodes = HashMap::new();
        nodes.insert(nid("A"), make_node("A"));
        nodes.insert(nid("B"), make_node("B"));

        let mut edges = HashMap::new();
        edges.insert(eid("e1"), make_edge("e1", "A", "B"));
        edges.insert(eid("e2"), make_loop_back_edge("e2", "B", "A", "loop"));

        assert!(detect_cycle(&nodes, &edges).is_none());
    }

    #[test]
    fn test_detect_cycle_three_node_cycle() {
        let mut nodes = HashMap::new();
        for id in ["A", "B", "C"] {
            nodes.insert(nid(id), make_node(id));
        }

        let mut edges = HashMap::new();
        edges.insert(eid("e1"), make_edge("e1", "A", "B"));
        edges.insert(eid("e2"), make_edge("e2", "B", "C"));
        edges.insert(eid("e3"), make_edge("e3", "C", "A"));

        let cycle = detect_cycle(&nodes, &edges);
        assert!(cycle.is_some());
        let cycle = cycle.unwrap();
        assert!(cycle.contains(&"A".to_string()));
        assert!(cycle.contains(&"B".to_string()));
        assert!(cycle.contains(&"C".to_string()));
    }

    // -----------------------------------------------------------------------
    // build_mirror
    // -----------------------------------------------------------------------

    #[test]
    fn test_build_mirror_creates_correct_structure() {
        let snapshot = make_snapshot(
            vec![make_node("A"), make_node("B"), make_node("C")],
            vec![make_edge("e1", "A", "B"), make_edge("e2", "B", "C")],
        );
        let states = vec![
            make_state("run1", "A", 0, NodeState::Pending, 0),
            make_state("run1", "B", 0, NodeState::Pending, 1),
            make_state("run1", "C", 0, NodeState::Pending, 1),
        ];

        let mirror = build_mirror(&snapshot, &states);

        assert_eq!(mirror.nodes.len(), 3);
        assert_eq!(mirror.edges.len(), 2);
        assert_eq!(mirror.topo_order.len(), 3);
        assert_eq!(mirror.topo_order[0], "A");
        assert_eq!(mirror.topo_order[1], "B");
        assert_eq!(mirror.topo_order[2], "C");
        assert_eq!(mirror.snapshot_id, "snap_test");
    }

    #[test]
    fn test_build_mirror_computes_remaining_deps() {
        let snapshot = make_snapshot(
            vec![make_node("A"), make_node("B"), make_node("C")],
            vec![make_edge("e1", "A", "C"), make_edge("e2", "B", "C")],
        );
        let states = vec![];

        let mirror = build_mirror(&snapshot, &states);

        assert_eq!(
            mirror.states.get(&state_key("A", 0)).unwrap().remaining_deps,
            0
        );
        assert_eq!(
            mirror.states.get(&state_key("B", 0)).unwrap().remaining_deps,
            0
        );
        assert_eq!(
            mirror.states.get(&state_key("C", 0)).unwrap().remaining_deps,
            2
        );
    }

    #[test]
    fn test_build_mirror_populates_ready_set() {
        let snapshot = make_snapshot(
            vec![make_node("A"), make_node("B")],
            vec![make_edge("e1", "A", "B")],
        );

        let mut state_b = make_state("run1", "B", 0, NodeState::Pending, 1);
        state_b.state = NodeState::Ready;

        let states = vec![
            make_state("run1", "A", 0, NodeState::Pending, 0),
            state_b,
        ];

        let mirror = build_mirror(&snapshot, &states);

        // Only B is ready
        assert!(mirror.ready_set.contains(&state_key("B", 0)));
        assert!(!mirror.ready_set.contains(&state_key("A", 0)));
    }

    #[test]
    fn test_build_mirror_populates_running_set() {
        let snapshot = make_snapshot(
            vec![make_node("A")],
            vec![],
        );

        let mut state_a = make_state("run1", "A", 0, NodeState::Pending, 0);
        state_a.state = NodeState::Running;

        let states = vec![state_a];
        let mirror = build_mirror(&snapshot, &states);

        assert!(mirror.running_set.contains(&state_key("A", 0)));
    }

    #[test]
    fn test_build_mirror_missing_states_inserted() {
        let snapshot = make_snapshot(
            vec![make_node("A")],
            vec![],
        );
        let states = vec![];

        let mirror = build_mirror(&snapshot, &states);

        // Node A should get a default state at iteration 0
        let key = state_key("A", 0);
        assert!(mirror.states.contains_key(&key));
        assert_eq!(mirror.states.get(&key).unwrap().state, NodeState::Pending);
        assert_eq!(mirror.states.get(&key).unwrap().iteration_index, 0);
    }

    // -----------------------------------------------------------------------
    // update_node_state
    // -----------------------------------------------------------------------

    #[test]
    fn test_update_node_state_pending_to_ready() {
        let snapshot = make_snapshot(
            vec![make_node("A")],
            vec![],
        );
        let states = vec![make_state("run1", "A", 0, NodeState::Pending, 0)];
        let mut mirror = build_mirror(&snapshot, &states);

        let update = NodeStateUpdate {
            state: Some(NodeState::Ready),
            ..Default::default()
        };
        assert!(update_node_state(&mut mirror, "A", 0, &update).is_ok());

        let key = state_key("A", 0);
        assert_eq!(mirror.states.get(&key).unwrap().state, NodeState::Ready);
        assert!(mirror.ready_set.contains(&key));
    }

    #[test]
    fn test_update_node_state_ready_to_running_updates_sets() {
        let snapshot = make_snapshot(
            vec![make_node("A")],
            vec![],
        );
        let states = vec![make_state("run1", "A", 0, NodeState::Pending, 0)];
        let mut mirror = build_mirror(&snapshot, &states);

        // pending -> ready
        let update1 = NodeStateUpdate {
            state: Some(NodeState::Ready),
            ..Default::default()
        };
        update_node_state(&mut mirror, "A", 0, &update1).ok();

        // ready -> running
        let update2 = NodeStateUpdate {
            state: Some(NodeState::Running),
            ..Default::default()
        };
        assert!(update_node_state(&mut mirror, "A", 0, &update2).is_ok());

        let key = state_key("A", 0);
        assert_eq!(mirror.states.get(&key).unwrap().state, NodeState::Running);
        assert!(!mirror.ready_set.contains(&key));
        assert!(mirror.running_set.contains(&key));
    }

    #[test]
    fn test_update_node_state_rejects_illegal_transition() {
        let snapshot = make_snapshot(
            vec![make_node("A")],
            vec![],
        );
        let states = vec![make_state("run1", "A", 0, NodeState::Pending, 0)];
        let mut mirror = build_mirror(&snapshot, &states);

        // pending -> running is illegal
        let update = NodeStateUpdate {
            state: Some(NodeState::Running),
            ..Default::default()
        };
        assert!(update_node_state(&mut mirror, "A", 0, &update).is_err());
    }

    #[test]
    fn test_update_node_state_missing_key() {
        let snapshot = make_snapshot(
            vec![make_node("A")],
            vec![],
        );
        let states = vec![];
        let mut mirror = build_mirror(&snapshot, &states);

        let update = NodeStateUpdate {
            state: Some(NodeState::Ready),
            ..Default::default()
        };
        // Node A exists but with key "A#0"; trying "B#0" should fail
        assert!(update_node_state(&mut mirror, "B", 0, &update).is_err());
    }

    #[test]
    fn test_update_node_state_patches_fields() {
        let snapshot = make_snapshot(
            vec![make_node("A")],
            vec![],
        );
        let states = vec![make_state("run1", "A", 0, NodeState::Running, 2)];
        let mut mirror = build_mirror(&snapshot, &states);

        let update = NodeStateUpdate {
            state: Some(NodeState::Succeeded),
            remaining_deps: Some(0),
            attempt: Some(1),
            execution_id: Some(Some("exec-1".to_string())),
            ..Default::default()
        };
        assert!(update_node_state(&mut mirror, "A", 0, &update).is_ok());

        let key = state_key("A", 0);
        let state = mirror.states.get(&key).unwrap();
        assert_eq!(state.state, NodeState::Succeeded);
        assert_eq!(state.remaining_deps, 0);
        assert_eq!(state.attempt, 1);
        assert_eq!(state.execution_id, Some("exec-1".to_string()));
    }

    // -----------------------------------------------------------------------
    // is_legal_transition
    // -----------------------------------------------------------------------

    #[test]
    fn test_legal_transitions() {
        assert!(is_legal_transition(&NodeState::Pending, &NodeState::Ready));
        assert!(is_legal_transition(&NodeState::Pending, &NodeState::Skipped));
        assert!(is_legal_transition(&NodeState::Pending, &NodeState::Cancelled));
        assert!(is_legal_transition(&NodeState::Ready, &NodeState::Running));
        assert!(is_legal_transition(&NodeState::Ready, &NodeState::Skipped));
        assert!(is_legal_transition(&NodeState::Ready, &NodeState::Cancelled));
        assert!(is_legal_transition(&NodeState::Running, &NodeState::Succeeded));
        assert!(is_legal_transition(&NodeState::Running, &NodeState::Failed));
        assert!(is_legal_transition(&NodeState::Running, &NodeState::Cancelled));
    }

    #[test]
    fn test_illegal_transitions() {
        assert!(!is_legal_transition(&NodeState::Pending, &NodeState::Running));
        assert!(!is_legal_transition(&NodeState::Succeeded, &NodeState::Running));
        assert!(!is_legal_transition(&NodeState::Failed, &NodeState::Ready));
        assert!(!is_legal_transition(&NodeState::Skipped, &NodeState::Ready));
        assert!(!is_legal_transition(&NodeState::Skipped, &NodeState::Running));
        assert!(!is_legal_transition(&NodeState::Skipped, &NodeState::Succeeded));
        assert!(!is_legal_transition(&NodeState::Cancelled, &NodeState::Pending));
    }
}

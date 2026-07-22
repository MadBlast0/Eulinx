use std::collections::HashMap;

use indexmap::IndexMap;

use crate::scheduler::types::{
    priority_numeric, FairnessConfig, SchedulingPriority, SchedulingUnit,
};

// ---------------------------------------------------------------------------
// Priority Aging
// ---------------------------------------------------------------------------

/// Ordering from lowest to highest priority. Aging promotes a unit one step up
/// this list per elapsed aging interval.
const AGING_ORDER: [SchedulingPriority; 5] = [
    SchedulingPriority::Background,
    SchedulingPriority::Low,
    SchedulingPriority::Normal,
    SchedulingPriority::High,
    SchedulingPriority::Critical,
];

/// Compute the effective priority after aging.
///
/// A unit that has waited at least `config.aging_interval_ms` per level gains
/// one promotion. Promotions are capped at `config.max_aging_levels` and never
/// exceed `Critical`.
pub fn compute_aged_priority(
    priority: &SchedulingPriority,
    wait_ms: u64,
    config: &FairnessConfig,
) -> SchedulingPriority {
    if config.aging_interval_ms == 0 {
        return priority.clone();
    }
    let raw_levels = wait_ms / config.aging_interval_ms;
    let levels = (raw_levels as u64).min(config.max_aging_levels as u64) as usize;

    let current_idx = AGING_ORDER.iter().position(|p| p == priority).unwrap_or(0);
    let new_idx = (current_idx + levels).min(AGING_ORDER.len() - 1);
    AGING_ORDER[new_idx].clone()
}

/// Number of aging levels a unit has gained given its wait time.
fn aging_levels(wait_ms: u64, config: &FairnessConfig) -> u64 {
    if config.aging_interval_ms == 0 {
        return 0;
    }
    let raw = wait_ms / config.aging_interval_ms;
    raw.min(config.max_aging_levels as u64)
}

/// Compute the effective fairness score for a unit, accounting for aging.
///
/// Lower score = higher priority (suitable for min-heap ordering).
/// `score = priority_numeric * 1000 - aging_levels`.
pub fn compute_fairness_score(unit: &SchedulingUnit, now_ms: u64, config: &FairnessConfig) -> f64 {
    let wait_ms = wait_ms_of(unit, now_ms);
    let levels = aging_levels(wait_ms, config);
    let base = priority_numeric(&unit.priority) as f64;
    base * 1000.0 - levels as f64
}

/// Milliseconds the unit has waited relative to `now_ms`, derived from its
/// `created_at` timestamp.
fn wait_ms_of(unit: &SchedulingUnit, now_ms: u64) -> u64 {
    let created_ms =
        crate::scheduler::time_utils::rfc3339_to_millis(&unit.created_at).unwrap_or(0);
    now_ms.saturating_sub(created_ms as u64)
}

// ---------------------------------------------------------------------------
// Round-Robin Distributor
// ---------------------------------------------------------------------------

/// Distributes items fairly across registered groups using round-robin.
///
/// `cursor` tracks the current group; within each group items are rotated so
/// every item gets an equal turn. `counts` tracks the number of active items
/// per group (advanced via `increment`/`decrement`).
pub struct RoundRobinDistributor<T: Clone> {
    groups: IndexMap<String, Vec<T>>,
    counts: IndexMap<String, u32>,
    cursor: usize,
}

impl<T: Clone> Default for RoundRobinDistributor<T> {
    fn default() -> Self {
        Self::new()
    }
}

impl<T: Clone> RoundRobinDistributor<T> {
    pub fn new() -> Self {
        Self {
            groups: IndexMap::new(),
            counts: IndexMap::new(),
            cursor: 0,
        }
    }

    /// Add (or replace) a group with its items.
    pub fn register(&mut self, group: String, items: Vec<T>) {
        self.groups.insert(group.clone(), items);
        self.counts.entry(group).or_insert(0);
    }

    /// Remove a group, adjusting the cursor so iteration stays consistent.
    pub fn unregister(&mut self, group: &str) {
        if let Some(idx) = self.groups.get_index_of(group) {
            self.groups.shift_remove(group);
            self.counts.shift_remove(group);
            if idx < self.cursor {
                self.cursor -= 1;
            } else if idx == self.cursor && self.groups.is_empty() {
                self.cursor = 0;
            }
            let len = self.groups.len();
            if len > 0 {
                self.cursor %= len;
            } else {
                self.cursor = 0;
            }
        }
    }

    /// Return the next item, cycling through groups and their items.
    pub fn next(&mut self) -> Option<&T> {
        if self.groups.is_empty() {
            return None;
        }
        let idx = self.cursor % self.groups.len();
        self.cursor = (self.cursor + 1) % self.groups.len();
        let items = self.groups.get_index_mut(idx)?.1;
        if items.is_empty() {
            return None;
        }
        let first = items.remove(0);
        items.push(first);
        Some(&items[items.len() - 1])
    }

    pub fn get_active_groups(&self) -> Vec<&String> {
        self.groups.keys().collect()
    }

    pub fn get_count(&self, group: &str) -> usize {
        *self.counts.get(group).unwrap_or(&0) as usize
    }

    /// Add a single item to a group, creating the group if it doesn't exist.
    pub fn add_item(&mut self, group: String, item: T) {
        self.groups.entry(group.clone()).or_default().push(item);
        *self.counts.entry(group).or_insert(0) += 1;
    }

    /// Remove a specific item from a group by predicate. Returns true if removed.
    pub fn remove_item<F>(&mut self, group: &str, predicate: F) -> bool
    where
        F: Fn(&T) -> bool,
    {
        if let Some(items) = self.groups.get_mut(group) {
            if let Some(pos) = items.iter().position(predicate) {
                items.remove(pos);
                if let Some(c) = self.counts.get_mut(group) {
                    *c = c.saturating_sub(1);
                }
                if items.is_empty() {
                    self.unregister(group);
                }
                return true;
            }
        }
        false
    }
}

// ---------------------------------------------------------------------------
// Concurrency Tracker
// ---------------------------------------------------------------------------

/// Tracks per-group and per-workspace concurrency to enforce fairness caps.
pub struct ConcurrencyTracker {
    group_counts: HashMap<String, u32>,
    workspace_counts: HashMap<String, u32>,
}

impl Default for ConcurrencyTracker {
    fn default() -> Self {
        Self::new()
    }
}

impl ConcurrencyTracker {
    pub fn new() -> Self {
        Self {
            group_counts: HashMap::new(),
            workspace_counts: HashMap::new(),
        }
    }

    /// Whether scheduling is allowed under both per-group and per-workspace
    /// limits.
    pub fn can_schedule(
        &self,
        group: Option<&str>,
        workspace_id: Option<&str>,
        config: &FairnessConfig,
    ) -> bool {
        if let Some(g) = group {
            let count = *self.group_counts.get(g).unwrap_or(&0);
            if count >= config.max_per_group {
                return false;
            }
        }
        if let Some(ws) = workspace_id {
            let count = *self.workspace_counts.get(ws).unwrap_or(&0);
            if count >= config.max_per_workspace {
                return false;
            }
        }
        true
    }

    /// Increment the relevant counts.
    pub fn acquire(&mut self, group: Option<&str>, workspace_id: Option<&str>) {
        if let Some(g) = group {
            *self.group_counts.entry(g.to_string()).or_insert(0) += 1;
        }
        if let Some(ws) = workspace_id {
            *self.workspace_counts.entry(ws.to_string()).or_insert(0) += 1;
        }
    }

    /// Decrement the relevant counts, never below zero.
    pub fn release(&mut self, group: Option<&str>, workspace_id: Option<&str>) {
        if let Some(g) = group {
            let c = self.group_counts.entry(g.to_string()).or_insert(0);
            *c = c.saturating_sub(1);
        }
        if let Some(ws) = workspace_id {
            let c = self.workspace_counts.entry(ws.to_string()).or_insert(0);
            *c = c.saturating_sub(1);
        }
    }

    pub fn get_group_count(&self, group: &str) -> u32 {
        *self.group_counts.get(group).unwrap_or(&0)
    }

    pub fn get_workspace_count(&self, workspace_id: &str) -> u32 {
        *self.workspace_counts.get(workspace_id).unwrap_or(&0)
    }

    pub fn reset(&mut self) {
        self.group_counts.clear();
        self.workspace_counts.clear();
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::scheduler::types::{
        SchedulingPriority, SchedulingState, SchedulingUnit, SchedulingUnitKind,
    };

    fn make_unit(priority: SchedulingPriority, created_at_ms: i64) -> SchedulingUnit {
        let created = crate::scheduler::time_utils::millis_to_rfc3339(created_at_ms);
        SchedulingUnit {
            id: "u".to_string(),
            kind: SchedulingUnitKind::Task,
            workspace_id: "ws".to_string(),
            session_id: None,
            execution_id: None,
            workflow_id: None,
            node_id: None,
            task_id: None,
            priority,
            dependencies: vec![],
            required_permissions: vec![],
            required_locks: vec![],
            budget_estimate: None,
            state: SchedulingState::Queued,
            created_at: created.clone(),
            updated_at: created,
        }
    }

    fn config() -> FairnessConfig {
        FairnessConfig {
            max_per_group: 2,
            max_per_workspace: 3,
            aging_interval_ms: 30_000,
            max_aging_levels: 3,
        }
    }

    // 1. no wait returns same priority
    #[test]
    fn test_aged_priority_no_wait() {
        let c = config();
        assert_eq!(
            compute_aged_priority(&SchedulingPriority::Low, 0, &c),
            SchedulingPriority::Low
        );
    }

    // 2. wait >= aging_interval promotes one level
    #[test]
    fn test_aged_priority_one_level() {
        let c = config();
        assert_eq!(
            compute_aged_priority(&SchedulingPriority::Background, 30_000, &c),
            SchedulingPriority::Low
        );
        assert_eq!(
            compute_aged_priority(&SchedulingPriority::Normal, 30_000, &c),
            SchedulingPriority::High
        );
    }

    // 3. wait >= 2*aging_interval promotes two levels
    #[test]
    fn test_aged_priority_two_levels() {
        let c = config();
        assert_eq!(
            compute_aged_priority(&SchedulingPriority::Background, 60_000, &c),
            SchedulingPriority::Normal
        );
    }

    // 4. Background cannot age above Critical
    #[test]
    fn test_aged_priority_capped_at_critical() {
        let c = config();
        assert_eq!(
            compute_aged_priority(&SchedulingPriority::Background, 1_000_000_000, &c),
            SchedulingPriority::Critical
        );
        assert_eq!(
            compute_aged_priority(&SchedulingPriority::Critical, 1_000_000_000, &c),
            SchedulingPriority::Critical
        );
    }

    // 5. capped at max_aging_levels
    #[test]
    fn test_aged_priority_max_levels() {
        let c = FairnessConfig {
            max_per_group: 2,
            max_per_workspace: 3,
            aging_interval_ms: 30_000,
            max_aging_levels: 2,
        };
        // Background + 2 levels = Normal, even though wait would allow more.
        assert_eq!(
            compute_aged_priority(&SchedulingPriority::Background, 600_000, &c),
            SchedulingPriority::Normal
        );
    }

    // 6. higher base priority => lower (better) score
    #[test]
    fn test_fairness_score_priority_ordering() {
        let c = config();
        let now = 1_000_000i64;
        let critical = compute_fairness_score(
            &make_unit(SchedulingPriority::Critical, now),
            now as u64,
            &c,
        );
        let background = compute_fairness_score(
            &make_unit(SchedulingPriority::Background, now),
            now as u64,
            &c,
        );
        assert!(critical < background);
    }

    // 7. aging improves (lowers) score
    #[test]
    fn test_fairness_score_aging_improves() {
        let c = config();
        let base = 1_000_000i64;
        let fresh = compute_fairness_score(
            &make_unit(SchedulingPriority::Background, base),
            base as u64,
            &c,
        );
        let aged = compute_fairness_score(
            &make_unit(SchedulingPriority::Background, base),
            (base + 90_000) as u64,
            &c,
        );
        assert!(aged < fresh);
    }

    // 8. registers groups and cycles through them
    #[test]
    fn test_rr_register_and_cycle() {
        let mut d: RoundRobinDistributor<u32> = RoundRobinDistributor::new();
        d.register("a".to_string(), vec![1, 2]);
        d.register("b".to_string(), vec![3, 4]);
        d.register("c".to_string(), vec![5, 6]);

        let mut seen = Vec::new();
        for _ in 0..6 {
            seen.push(*d.next().unwrap());
        }
        // Round-robin across groups yields a, b, c, a, b, c ordering of groups.
        // Items within each group rotate, so group a yields 1 then 2, etc.
        assert_eq!(seen, vec![1, 3, 5, 2, 4, 6]);
        assert_eq!(d.get_active_groups(), vec!["a", "b", "c"]);
    }

    // 9. unregister removes group, adjusts cursor
    #[test]
    fn test_rr_unregister() {
        let mut d: RoundRobinDistributor<u32> = RoundRobinDistributor::new();
        d.register("a".to_string(), vec![1]);
        d.register("b".to_string(), vec![2]);
        d.register("c".to_string(), vec![3]);
        // advance cursor to point at "b"
        let _ = d.next(); // a
        let _ = d.next(); // b -> cursor now at c
        d.unregister("b");
        let groups = d.get_active_groups();
        assert!(!groups.contains(&&"b".to_string()));
        // cycling should only visit a and c
        let mut seen = Vec::new();
        for _ in 0..4 {
            seen.push(*d.next().unwrap());
        }
        assert_eq!(seen, vec![3, 1, 3, 1]);
    }

    // 10. allow within limits, block at limit
    #[test]
    fn test_concurrency_limits() {
        let c = config();
        let mut t = ConcurrencyTracker::new();
        assert!(t.can_schedule(Some("g"), Some("ws"), &c));
        t.acquire(Some("g"), Some("ws"));
        t.acquire(Some("g"), Some("ws"));
        // group limit is 2 -> blocked
        assert!(!t.can_schedule(Some("g"), Some("ws"), &c));
        t.release(Some("g"), Some("ws"));
        assert!(t.can_schedule(Some("g"), Some("ws"), &c));
    }

    // 11. acquire/release updates counts
    #[test]
    fn test_concurrency_counts() {
        let mut t = ConcurrencyTracker::new();
        t.acquire(Some("g"), Some("ws"));
        t.acquire(Some("g"), Some("ws"));
        t.acquire(None, Some("ws"));
        assert_eq!(t.get_group_count("g"), 2);
        assert_eq!(t.get_workspace_count("ws"), 3);
        t.release(Some("g"), Some("ws"));
        assert_eq!(t.get_group_count("g"), 1);
        assert_eq!(t.get_workspace_count("ws"), 2);
    }

    // 12. reset clears everything
    #[test]
    fn test_concurrency_reset() {
        let mut t = ConcurrencyTracker::new();
        t.acquire(Some("g"), Some("ws"));
        t.acquire(None, Some("ws"));
        t.reset();
        assert_eq!(t.get_group_count("g"), 0);
        assert_eq!(t.get_workspace_count("ws"), 0);
    }
}

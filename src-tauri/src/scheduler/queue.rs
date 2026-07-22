use std::cmp::Ordering;
use std::collections::HashMap;

use crate::scheduler::types::{
    priority_numeric, SchedulingPriority, SchedulingUnit, SchedulingUnitKind,
};

// ---------------------------------------------------------------------------
// Heap Entry
// ---------------------------------------------------------------------------

/// Internal node stored in the binary min-heap.
///
/// Ordering is determined by priority (ascending numeric) then insertion order
/// (ascending), so the heap root is always the highest-priority, earliest unit.
struct HeapEntry {
    unit: SchedulingUnit,
    order: u64,
}

impl PartialEq for HeapEntry {
    fn eq(&self, other: &Self) -> bool {
        self.cmp(other) == Ordering::Equal
    }
}

impl Eq for HeapEntry {}

impl PartialOrd for HeapEntry {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for HeapEntry {
    fn cmp(&self, other: &Self) -> Ordering {
        let pa = priority_numeric(&self.unit.priority);
        let pb = priority_numeric(&other.unit.priority);
        match pa.cmp(&pb) {
            Ordering::Equal => self.order.cmp(&other.order),
            o => o,
        }
    }
}

// ---------------------------------------------------------------------------
// MinHeap — array-based binary min-heap
// ---------------------------------------------------------------------------

/// A binary min-heap ordered by [`SchedulingPriority`] (highest priority first)
/// and then by insertion order (FIFO tiebreak).
///
/// Removal by `unit_id` is O(log n) thanks to the internal index map.
pub struct MinHeap {
    entries: Vec<HeapEntry>,
    insertion_counter: u64,
    index_map: HashMap<String, usize>,
}

impl MinHeap {
    /// Create an empty min-heap.
    pub fn new() -> Self {
        Self {
            entries: Vec::new(),
            insertion_counter: 0,
            index_map: HashMap::new(),
        }
    }

    /// Insert a scheduling unit, assigning it the next insertion order.
    pub fn insert(&mut self, unit: SchedulingUnit) {
        let order = self.insertion_counter;
        self.insertion_counter += 1;
        let idx = self.entries.len();
        self.index_map.insert(unit.id.clone(), idx);
        self.entries.push(HeapEntry { unit, order });
        self.bubble_up(idx);
    }

    /// Remove and return the root (highest-priority, earliest) unit.
    pub fn extract_min(&mut self) -> Option<SchedulingUnit> {
        if self.entries.is_empty() {
            return None;
        }
        let root = self.entries.swap_remove(0);
        self.index_map.remove(&root.unit.id);
        if !self.entries.is_empty() {
            self.index_map.insert(self.entries[0].unit.id.clone(), 0);
            self.bubble_down(0);
        }
        Some(root.unit)
    }

    /// Return a reference to the root unit without removing it.
    pub fn peek(&self) -> Option<&SchedulingUnit> {
        self.entries.first().map(|e| &e.unit)
    }

    /// Remove the unit with the given `unit_id`, returning it if present.
    ///
    /// Runs in O(log n) via an index-map lookup followed by a sift up/down.
    pub fn remove(&mut self, unit_id: &str) -> Option<SchedulingUnit> {
        let idx = *self.index_map.get(unit_id)?;
        let removed = self.entries.swap_remove(idx);
        self.index_map.remove(&removed.unit.id);
        if idx < self.entries.len() {
            self.index_map
                .insert(self.entries[idx].unit.id.clone(), idx);
            self.bubble_up(idx);
            self.bubble_down(idx);
        }
        Some(removed.unit)
    }

    /// Number of units currently in the heap.
    pub fn size(&self) -> usize {
        self.entries.len()
    }

    /// Whether the heap contains no units.
    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }

    /// Return all units in the heap (heap order, not sorted).
    pub fn to_vec(&self) -> Vec<SchedulingUnit> {
        self.entries.iter().map(|e| e.unit.clone()).collect()
    }

    /// Whether the heap contains a unit with the given `unit_id`.
    pub fn contains(&self, unit_id: &str) -> bool {
        self.index_map.contains_key(unit_id)
    }

    /// Remove all units from the heap.
    pub fn clear(&mut self) {
        self.entries.clear();
        self.index_map.clear();
        self.insertion_counter = 0;
    }

    fn bubble_up(&mut self, mut idx: usize) {
        while idx > 0 {
            let parent = (idx - 1) / 2;
            if self.entries[idx].cmp(&self.entries[parent]) == Ordering::Less {
                self.swap(idx, parent);
                idx = parent;
            } else {
                break;
            }
        }
    }

    fn bubble_down(&mut self, mut idx: usize) {
        let len = self.entries.len();
        loop {
            let left = 2 * idx + 1;
            let right = 2 * idx + 2;
            let mut smallest = idx;

            if left < len && self.entries[left].cmp(&self.entries[smallest]) == Ordering::Less {
                smallest = left;
            }
            if right < len && self.entries[right].cmp(&self.entries[smallest]) == Ordering::Less {
                smallest = right;
            }
            if smallest == idx {
                break;
            }
            self.swap(idx, smallest);
            idx = smallest;
        }
    }

    fn swap(&mut self, a: usize, b: usize) {
        self.entries.swap(a, b);
        self.index_map.insert(self.entries[a].unit.id.clone(), a);
        self.index_map.insert(self.entries[b].unit.id.clone(), b);
    }
}

impl Default for MinHeap {
    fn default() -> Self {
        Self::new()
    }
}

// ---------------------------------------------------------------------------
// JobQueue — wraps MinHeap with scheduling-aware operations
// ---------------------------------------------------------------------------

/// A job queue wrapping [`MinHeap`] with additional lookup helpers used by the
/// scheduler.
pub struct JobQueue {
    heap: MinHeap,
}

impl JobQueue {
    /// Create an empty job queue.
    pub fn new() -> Self {
        Self {
            heap: MinHeap::new(),
        }
    }

    /// Enqueue a scheduling unit.
    pub fn enqueue(&mut self, unit: SchedulingUnit) {
        self.heap.insert(unit);
    }

    /// Dequeue and return the highest-priority, earliest unit.
    pub fn dequeue(&mut self) -> Option<SchedulingUnit> {
        self.heap.extract_min()
    }

    /// Remove the unit with the given `unit_id`, returning it if present.
    pub fn remove(&mut self, unit_id: &str) -> Option<SchedulingUnit> {
        self.heap.remove(unit_id)
    }

    /// Whether the queue contains a unit with the given `unit_id`.
    pub fn contains(&self, unit_id: &str) -> bool {
        self.heap.contains(unit_id)
    }

    /// Return a reference to the next unit to be dequeued without removing it.
    pub fn peek(&self) -> Option<&SchedulingUnit> {
        self.heap.peek()
    }

    /// Return a reference to a unit by ID, if present.
    pub fn get(&self, unit_id: &str) -> Option<&SchedulingUnit> {
        self.heap
            .entries
            .iter()
            .find(|e| e.unit.id == unit_id)
            .map(|e| &e.unit)
    }

    /// Number of units currently in the queue.
    pub fn size(&self) -> usize {
        self.heap.size()
    }

    /// Number of units currently in the queue (alias for `size`).
    pub fn len(&self) -> usize {
        self.heap.size()
    }

    /// Whether the queue contains no units.
    pub fn is_empty(&self) -> bool {
        self.heap.is_empty()
    }

    /// Return all units in the queue (heap order, not sorted).
    pub fn to_vec(&self) -> Vec<SchedulingUnit> {
        self.heap.to_vec()
    }

    /// Return references to all units whose kind matches `kind`.
    pub fn find_by_kind(&self, kind: &SchedulingUnitKind) -> Vec<&SchedulingUnit> {
        self.heap
            .entries
            .iter()
            .filter(|e| &e.unit.kind == kind)
            .map(|e| &e.unit)
            .collect()
    }

    /// Return references to all units whose priority matches `priority`.
    pub fn find_by_priority(&self, priority: &SchedulingPriority) -> Vec<&SchedulingUnit> {
        self.heap
            .entries
            .iter()
            .filter(|e| &e.unit.priority == priority)
            .map(|e| &e.unit)
            .collect()
    }

    /// Return a reference to the highest-priority unit (equivalent to [`peek`]).
    ///
    /// [`peek`]: JobQueue::peek
    pub fn find_highest_priority(&self) -> Option<&SchedulingUnit> {
        self.heap.peek()
    }

    /// Remove all units from the queue.
    pub fn clear(&mut self) {
        self.heap.clear();
    }
}

impl Default for JobQueue {
    fn default() -> Self {
        Self::new()
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::scheduler::time_utils::now_iso;

    fn unit(id: &str, kind: SchedulingUnitKind, priority: SchedulingPriority) -> SchedulingUnit {
        SchedulingUnit {
            id: id.to_string(),
            kind,
            workspace_id: "ws-1".to_string(),
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
            state: crate::scheduler::types::SchedulingState::Created,
            created_at: now_iso(),
            updated_at: now_iso(),
        }
    }

    #[test]
    fn test_empty_heap_extract_min() {
        let mut heap = MinHeap::new();
        assert!(heap.extract_min().is_none());
        assert!(heap.is_empty());
    }

    #[test]
    fn test_insert_single_extract() {
        let mut heap = MinHeap::new();
        heap.insert(unit(
            "a",
            SchedulingUnitKind::Task,
            SchedulingPriority::Normal,
        ));
        assert_eq!(heap.size(), 1);
        let popped = heap.extract_min().unwrap();
        assert_eq!(popped.id, "a");
        assert!(heap.is_empty());
    }

    #[test]
    fn test_priority_ordering() {
        let mut heap = MinHeap::new();
        heap.insert(unit(
            "low",
            SchedulingUnitKind::Task,
            SchedulingPriority::Low,
        ));
        heap.insert(unit(
            "crit",
            SchedulingUnitKind::Task,
            SchedulingPriority::Critical,
        ));
        let first = heap.extract_min().unwrap();
        assert_eq!(first.id, "crit");
        let second = heap.extract_min().unwrap();
        assert_eq!(second.id, "low");
    }

    #[test]
    fn test_fifo_tiebreak() {
        let mut heap = MinHeap::new();
        heap.insert(unit(
            "a",
            SchedulingUnitKind::Task,
            SchedulingPriority::Normal,
        ));
        heap.insert(unit(
            "b",
            SchedulingUnitKind::Task,
            SchedulingPriority::Normal,
        ));
        assert_eq!(heap.extract_min().unwrap().id, "a");
        assert_eq!(heap.extract_min().unwrap().id, "b");
    }

    #[test]
    fn test_reverse_fifo() {
        let mut heap = MinHeap::new();
        heap.insert(unit(
            "bg",
            SchedulingUnitKind::Task,
            SchedulingPriority::Background,
        ));
        heap.insert(unit(
            "low",
            SchedulingUnitKind::Task,
            SchedulingPriority::Low,
        ));
        heap.insert(unit(
            "norm",
            SchedulingUnitKind::Task,
            SchedulingPriority::Normal,
        ));
        heap.insert(unit(
            "high",
            SchedulingUnitKind::Task,
            SchedulingPriority::High,
        ));
        heap.insert(unit(
            "crit",
            SchedulingUnitKind::Task,
            SchedulingPriority::Critical,
        ));
        assert_eq!(heap.extract_min().unwrap().id, "crit");
        assert_eq!(heap.extract_min().unwrap().id, "high");
        assert_eq!(heap.extract_min().unwrap().id, "norm");
        assert_eq!(heap.extract_min().unwrap().id, "low");
        assert_eq!(heap.extract_min().unwrap().id, "bg");
    }

    #[test]
    fn test_remove_from_middle() {
        let mut heap = MinHeap::new();
        heap.insert(unit(
            "a",
            SchedulingUnitKind::Task,
            SchedulingPriority::Normal,
        ));
        heap.insert(unit(
            "b",
            SchedulingUnitKind::Task,
            SchedulingPriority::Normal,
        ));
        heap.insert(unit(
            "c",
            SchedulingUnitKind::Task,
            SchedulingPriority::Normal,
        ));
        let removed = heap.remove("b").unwrap();
        assert_eq!(removed.id, "b");
        assert_eq!(heap.size(), 2);
        assert_eq!(heap.extract_min().unwrap().id, "a");
        assert_eq!(heap.extract_min().unwrap().id, "c");
        assert!(heap.is_empty());
    }

    #[test]
    fn test_remove_nonexistent() {
        let mut heap = MinHeap::new();
        heap.insert(unit(
            "a",
            SchedulingUnitKind::Task,
            SchedulingPriority::Normal,
        ));
        assert!(heap.remove("missing").is_none());
        assert_eq!(heap.size(), 1);
    }

    #[test]
    fn test_jobqueue_enqueue_dequeue() {
        let mut q = JobQueue::new();
        assert!(q.is_empty());
        q.enqueue(unit(
            "a",
            SchedulingUnitKind::Task,
            SchedulingPriority::High,
        ));
        q.enqueue(unit("b", SchedulingUnitKind::Task, SchedulingPriority::Low));
        assert_eq!(q.size(), 2);
        assert_eq!(q.dequeue().unwrap().id, "a");
        assert_eq!(q.dequeue().unwrap().id, "b");
        assert!(q.is_empty());
    }

    #[test]
    fn test_jobqueue_find_by_kind() {
        let mut q = JobQueue::new();
        q.enqueue(unit(
            "a",
            SchedulingUnitKind::Task,
            SchedulingPriority::Normal,
        ));
        q.enqueue(unit(
            "b",
            SchedulingUnitKind::Verification,
            SchedulingPriority::Normal,
        ));
        q.enqueue(unit(
            "c",
            SchedulingUnitKind::Task,
            SchedulingPriority::High,
        ));
        let tasks = q.find_by_kind(&SchedulingUnitKind::Task);
        let ids: Vec<&str> = tasks.iter().map(|u| u.id.as_str()).collect();
        assert_eq!(ids.len(), 2);
        assert!(ids.contains(&"a"));
        assert!(ids.contains(&"c"));
        assert!(!ids.contains(&"b"));
    }

    #[test]
    fn test_jobqueue_clear() {
        let mut q = JobQueue::new();
        q.enqueue(unit(
            "a",
            SchedulingUnitKind::Task,
            SchedulingPriority::Normal,
        ));
        q.enqueue(unit("b", SchedulingUnitKind::Task, SchedulingPriority::Low));
        q.clear();
        assert_eq!(q.size(), 0);
        assert!(q.is_empty());
        assert!(q.dequeue().is_none());
    }
}

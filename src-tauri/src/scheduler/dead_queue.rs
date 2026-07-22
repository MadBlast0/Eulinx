use std::collections::{HashMap, VecDeque};

use crate::scheduler::types::{DeadEntry, FailureCategory};

const MAX_DEAD_QUEUE_SIZE: usize = 1000;

pub struct DeadQueue {
    entries: VecDeque<DeadEntry>,
    lookup: HashMap<String, usize>,
}

impl DeadQueue {
    pub fn new() -> Self {
        Self {
            entries: VecDeque::new(),
            lookup: HashMap::new(),
        }
    }

    pub fn add(&mut self, entry: DeadEntry) {
        if let Some(&index) = self.lookup.get(&entry.unit_id) {
            self.entries[index] = entry;
            return;
        }

        if self.entries.len() >= MAX_DEAD_QUEUE_SIZE {
            if let Some(evicted) = self.entries.pop_front() {
                self.lookup.remove(&evicted.unit_id);
                for (_, idx) in self.lookup.iter_mut() {
                    *idx -= 1;
                }
            }
        }

        let new_index = self.entries.len();
        self.lookup.insert(entry.unit_id.clone(), new_index);
        self.entries.push_back(entry);
    }

    pub fn get(&self, unit_id: &str) -> Option<&DeadEntry> {
        let index = self.lookup.get(unit_id)?;
        self.entries.get(*index)
    }

    pub fn remove(&mut self, unit_id: &str) -> Option<DeadEntry> {
        let index = self.lookup.remove(unit_id)?;
        let entry = self.entries.remove(index)?;
        for (_, idx) in self.lookup.iter_mut() {
            if *idx > index {
                *idx -= 1;
            }
        }
        Some(entry)
    }

    pub fn contains(&self, unit_id: &str) -> bool {
        self.lookup.contains_key(unit_id)
    }

    pub fn get_all(&self) -> Vec<&DeadEntry> {
        self.entries.iter().collect()
    }

    pub fn get_by_category(&self, category: &FailureCategory) -> Vec<&DeadEntry> {
        self.entries
            .iter()
            .filter(|e| e.failure_category == *category)
            .collect()
    }

    pub fn len(&self) -> usize {
        self.entries.len()
    }

    pub fn clear(&mut self) {
        self.entries.clear();
        self.lookup.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::scheduler::types::{
        DeadEntry, FailureCategory, SchedulingPriority, SchedulingUnitKind,
    };

    fn make_entry(unit_id: &str, category: FailureCategory, index: u32) -> DeadEntry {
        DeadEntry {
            unit_id: unit_id.to_string(),
            kind: SchedulingUnitKind::Task,
            priority: SchedulingPriority::Normal,
            last_error: format!("error {}", index),
            failure_category: category,
            attempt_count: index,
            entered_at: format!("2024-01-01T00:00:{:02}Z", index),
            created_at: format!("2024-01-01T00:00:{:02}Z", index),
        }
    }

    fn default_entry(unit_id: &str) -> DeadEntry {
        make_entry(unit_id, FailureCategory::UnknownError, 1)
    }

    #[test]
    fn test_add_and_retrieve() {
        let mut q = DeadQueue::new();
        q.add(default_entry("u1"));
        let entry = q.get("u1").unwrap();
        assert_eq!(entry.unit_id, "u1");
    }

    #[test]
    fn test_contains() {
        let mut q = DeadQueue::new();
        q.add(default_entry("u1"));
        assert!(q.contains("u1"));
        assert!(!q.contains("u2"));
    }

    #[test]
    fn test_remove() {
        let mut q = DeadQueue::new();
        q.add(default_entry("u1"));
        q.add(default_entry("u2"));
        let removed = q.remove("u1").unwrap();
        assert_eq!(removed.unit_id, "u1");
        assert!(!q.contains("u1"));
        assert!(q.contains("u2"));
        assert_eq!(q.len(), 1);
    }

    #[test]
    fn test_get_all_insertion_order() {
        let mut q = DeadQueue::new();
        q.add(default_entry("u1"));
        q.add(default_entry("u2"));
        q.add(default_entry("u3"));
        let all = q.get_all();
        assert_eq!(all.len(), 3);
        assert_eq!(all[0].unit_id, "u1");
        assert_eq!(all[1].unit_id, "u2");
        assert_eq!(all[2].unit_id, "u3");
    }

    #[test]
    fn test_get_by_category() {
        let mut q = DeadQueue::new();
        q.add(make_entry("u1", FailureCategory::Timeout, 1));
        q.add(make_entry("u2", FailureCategory::BudgetExhausted, 2));
        q.add(make_entry("u3", FailureCategory::Timeout, 3));

        let timeouts = q.get_by_category(&FailureCategory::Timeout);
        assert_eq!(timeouts.len(), 2);
        assert!(timeouts
            .iter()
            .all(|e| e.failure_category == FailureCategory::Timeout));

        let budget = q.get_by_category(&FailureCategory::BudgetExhausted);
        assert_eq!(budget.len(), 1);
        assert_eq!(budget[0].unit_id, "u2");
    }

    #[test]
    fn test_clear() {
        let mut q = DeadQueue::new();
        q.add(default_entry("u1"));
        q.add(default_entry("u2"));
        q.clear();
        assert_eq!(q.len(), 0);
        assert!(!q.contains("u1"));
    }

    #[test]
    fn test_max_size_enforcement() {
        let mut q = DeadQueue::new();
        for i in 0..1001 {
            q.add(make_entry(
                &format!("u{}", i),
                FailureCategory::UnknownError,
                i,
            ));
        }
        assert_eq!(q.len(), 1000);
        assert!(!q.contains("u0"));
        assert!(q.contains("u1000"));
    }

    #[test]
    fn test_overwrite_existing() {
        let mut q = DeadQueue::new();
        q.add(DeadEntry {
            unit_id: "u1".to_string(),
            kind: SchedulingUnitKind::Task,
            priority: SchedulingPriority::Normal,
            last_error: "first".to_string(),
            failure_category: FailureCategory::Timeout,
            attempt_count: 1,
            entered_at: "2024-01-01T00:00:00Z".to_string(),
            created_at: "2024-01-01T00:00:00Z".to_string(),
        });

        q.add(DeadEntry {
            unit_id: "u1".to_string(),
            kind: SchedulingUnitKind::Task,
            priority: SchedulingPriority::High,
            last_error: "second".to_string(),
            failure_category: FailureCategory::BudgetExhausted,
            attempt_count: 2,
            entered_at: "2024-01-01T00:00:01Z".to_string(),
            created_at: "2024-01-01T00:00:01Z".to_string(),
        });

        assert_eq!(q.len(), 1);
        let entry = q.get("u1").unwrap();
        assert_eq!(entry.last_error, "second");
        assert_eq!(entry.failure_category, FailureCategory::BudgetExhausted);
        assert_eq!(entry.attempt_count, 2);
    }
}

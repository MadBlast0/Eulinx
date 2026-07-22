use std::collections::HashMap;

use crate::scheduler::types::{ConcurrencyConfig, SchedulingUnitKind};

pub struct ConcurrencyLimiter {
    config: ConcurrencyConfig,
    running: HashMap<String, String>,
    kind_counts: HashMap<String, u32>,
}

impl ConcurrencyLimiter {
    pub fn new(config: ConcurrencyConfig) -> Self {
        Self {
            config,
            running: HashMap::new(),
            kind_counts: HashMap::new(),
        }
    }

    pub fn can_acquire(&self, kind: &SchedulingUnitKind) -> bool {
        if self.running.len() as u32 >= self.config.max_concurrent {
            return false;
        }

        if let Some(max_per_kind) = &self.config.max_per_kind {
            let kind_str = kind.as_str();
            if let Some(&max) = max_per_kind.get(kind_str) {
                if self.kind_counts.get(kind_str).copied().unwrap_or(0) >= max {
                    return false;
                }
            }
        }

        true
    }

    pub fn acquire(&mut self, unit_id: String, kind: SchedulingUnitKind) -> bool {
        if !self.can_acquire(&kind) {
            return false;
        }

        let kind_str = kind.as_str().to_string();
        self.running.insert(unit_id, kind_str.clone());
        *self.kind_counts.entry(kind_str).or_insert(0) += 1;
        true
    }

    pub fn release(&mut self, unit_id: &str) {
        if let Some(kind) = self.running.remove(unit_id) {
            if let Some(count) = self.kind_counts.get_mut(&kind) {
                *count -= 1;
                if *count == 0 {
                    self.kind_counts.remove(&kind);
                }
            }
        }
    }

    pub fn is_running(&self, unit_id: &str) -> bool {
        self.running.contains_key(unit_id)
    }

    pub fn get_kind(&self, unit_id: &str) -> Option<String> {
        self.running.get(unit_id).cloned()
    }

    pub fn running_count(&self) -> usize {
        self.running.len()
    }

    pub fn get_kind_count(&self, kind: &SchedulingUnitKind) -> usize {
        self.kind_counts.get(kind.as_str()).copied().unwrap_or(0) as usize
    }

    pub fn get_running_unit_ids(&self) -> Vec<String> {
        self.running.keys().cloned().collect()
    }

    pub fn remaining_capacity(&self) -> u32 {
        self.config
            .max_concurrent
            .saturating_sub(self.running.len() as u32)
    }

    pub fn reset(&mut self) {
        self.running.clear();
        self.kind_counts.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn default_config() -> ConcurrencyConfig {
        ConcurrencyConfig {
            max_concurrent: 3,
            max_per_kind: None,
        }
    }

    fn limited_config() -> ConcurrencyConfig {
        let mut max_per_kind = HashMap::new();
        max_per_kind.insert("task".to_string(), 2);
        ConcurrencyConfig {
            max_concurrent: 10,
            max_per_kind: Some(max_per_kind),
        }
    }

    #[test]
    fn test_acquire_within_limit_returns_true() {
        let mut limiter = ConcurrencyLimiter::new(default_config());
        assert!(limiter.acquire("unit-1".to_string(), SchedulingUnitKind::Task));
        assert_eq!(limiter.running_count(), 1);
    }

    #[test]
    fn test_reject_when_at_global_max_concurrent() {
        let mut limiter = ConcurrencyLimiter::new(default_config());
        assert!(limiter.acquire("unit-1".to_string(), SchedulingUnitKind::Task));
        assert!(limiter.acquire("unit-2".to_string(), SchedulingUnitKind::Merge));
        assert!(limiter.acquire("unit-3".to_string(), SchedulingUnitKind::Verification));
        assert!(!limiter.acquire("unit-4".to_string(), SchedulingUnitKind::WorkerSpawn));
        assert_eq!(limiter.running_count(), 3);
    }

    #[test]
    fn test_release_makes_slot_available_again() {
        let mut limiter = ConcurrencyLimiter::new(default_config());
        assert!(limiter.acquire("unit-1".to_string(), SchedulingUnitKind::Task));
        assert!(limiter.acquire("unit-2".to_string(), SchedulingUnitKind::Task));
        assert!(limiter.acquire("unit-3".to_string(), SchedulingUnitKind::Task));
        assert!(!limiter.acquire("unit-4".to_string(), SchedulingUnitKind::Task));

        limiter.release("unit-1");
        assert_eq!(limiter.running_count(), 2);
        assert!(limiter.acquire("unit-4".to_string(), SchedulingUnitKind::Task));
        assert_eq!(limiter.running_count(), 3);
    }

    #[test]
    fn test_per_kind_limit() {
        let mut limiter = ConcurrencyLimiter::new(limited_config());
        assert!(limiter.acquire("unit-1".to_string(), SchedulingUnitKind::Task));
        assert!(limiter.acquire("unit-2".to_string(), SchedulingUnitKind::Task));
        assert!(!limiter.acquire("unit-3".to_string(), SchedulingUnitKind::Task));
        assert_eq!(limiter.get_kind_count(&SchedulingUnitKind::Task), 2);
    }

    #[test]
    fn test_is_running() {
        let mut limiter = ConcurrencyLimiter::new(default_config());
        assert!(!limiter.is_running("unit-1"));
        limiter.acquire("unit-1".to_string(), SchedulingUnitKind::Task);
        assert!(limiter.is_running("unit-1"));
        limiter.release("unit-1");
        assert!(!limiter.is_running("unit-1"));
    }

    #[test]
    fn test_get_kind() {
        let mut limiter = ConcurrencyLimiter::new(default_config());
        limiter.acquire("unit-1".to_string(), SchedulingUnitKind::WorkflowNode);
        assert_eq!(
            limiter.get_kind("unit-1"),
            Some("workflow_node".to_string())
        );
        assert_eq!(limiter.get_kind("nonexistent"), None);
        limiter.release("unit-1");
        assert_eq!(limiter.get_kind("unit-1"), None);
    }

    #[test]
    fn test_get_kind_count() {
        let mut limiter = ConcurrencyLimiter::new(default_config());
        assert_eq!(limiter.get_kind_count(&SchedulingUnitKind::Task), 0);
        limiter.acquire("unit-1".to_string(), SchedulingUnitKind::Task);
        assert_eq!(limiter.get_kind_count(&SchedulingUnitKind::Task), 1);
        limiter.acquire("unit-2".to_string(), SchedulingUnitKind::Task);
        assert_eq!(limiter.get_kind_count(&SchedulingUnitKind::Task), 2);
        limiter.acquire("unit-3".to_string(), SchedulingUnitKind::Merge);
        assert_eq!(limiter.get_kind_count(&SchedulingUnitKind::Merge), 1);
        limiter.release("unit-1");
        assert_eq!(limiter.get_kind_count(&SchedulingUnitKind::Task), 1);
        limiter.release("unit-2");
        assert_eq!(limiter.get_kind_count(&SchedulingUnitKind::Task), 0);
    }

    #[test]
    fn test_get_running_unit_ids() {
        let mut limiter = ConcurrencyLimiter::new(default_config());
        assert!(limiter.get_running_unit_ids().is_empty());
        limiter.acquire("unit-1".to_string(), SchedulingUnitKind::Task);
        limiter.acquire("unit-2".to_string(), SchedulingUnitKind::Merge);
        let mut ids = limiter.get_running_unit_ids();
        ids.sort();
        assert_eq!(ids, vec!["unit-1".to_string(), "unit-2".to_string()]);
    }

    #[test]
    fn test_remaining_capacity() {
        let mut limiter = ConcurrencyLimiter::new(default_config());
        assert_eq!(limiter.remaining_capacity(), 3);
        limiter.acquire("unit-1".to_string(), SchedulingUnitKind::Task);
        assert_eq!(limiter.remaining_capacity(), 2);
        limiter.acquire("unit-2".to_string(), SchedulingUnitKind::Task);
        assert_eq!(limiter.remaining_capacity(), 1);
        limiter.release("unit-1");
        assert_eq!(limiter.remaining_capacity(), 2);
    }

    #[test]
    fn test_reset_clears_all() {
        let mut limiter = ConcurrencyLimiter::new(default_config());
        limiter.acquire("unit-1".to_string(), SchedulingUnitKind::Task);
        limiter.acquire("unit-2".to_string(), SchedulingUnitKind::Merge);
        assert_eq!(limiter.running_count(), 2);
        limiter.reset();
        assert_eq!(limiter.running_count(), 0);
        assert!(limiter.get_running_unit_ids().is_empty());
        assert_eq!(limiter.get_kind_count(&SchedulingUnitKind::Task), 0);
        assert_eq!(limiter.remaining_capacity(), 3);
    }

    #[test]
    fn test_unlimited_allows_many_acquires() {
        let config = ConcurrencyConfig {
            max_concurrent: u32::MAX,
            max_per_kind: None,
        };
        let mut limiter = ConcurrencyLimiter::new(config);
        for i in 0..1000 {
            assert!(limiter.acquire(format!("unit-{i}"), SchedulingUnitKind::Task));
        }
        assert_eq!(limiter.running_count(), 1000);
    }
}

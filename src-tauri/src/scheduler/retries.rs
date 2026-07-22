use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::scheduler::types::{BackoffStrategy, FailureCategory, RetryPolicy};

fn failure_category_as_str(category: &FailureCategory) -> &'static str {
    match category {
        FailureCategory::DependencyFailed => "dependency_failed",
        FailureCategory::PermissionDenied => "permission_denied",
        FailureCategory::ApprovalRejected => "approval_rejected",
        FailureCategory::LockTimeout => "lock_timeout",
        FailureCategory::BudgetExhausted => "budget_exhausted",
        FailureCategory::ToolUnavailable => "tool_unavailable",
        FailureCategory::WorkerFailed => "worker_failed",
        FailureCategory::RuntimeUnsafe => "runtime_unsafe",
        FailureCategory::Timeout => "timeout",
        FailureCategory::UnknownError => "unknown_error",
    }
}

fn now_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards")
        .as_millis() as u64
}

#[derive(Debug, Clone)]
pub struct RetryEntry {
    pub unit_id: String,
    pub attempt: u32,
    pub last_error: String,
    pub failure_category: FailureCategory,
    pub next_eligible_at: u64,
    pub graph_changed: bool,
    pub context_refresh_required: bool,
}

pub struct RetryQueue {
    policy: RetryPolicy,
    entries: HashMap<String, RetryEntry>,
}

impl RetryQueue {
    pub fn new(policy: RetryPolicy) -> Self {
        Self {
            policy,
            entries: HashMap::new(),
        }
    }

    pub fn new_with_default() -> Self {
        Self::new(RetryPolicy::default())
    }

    pub fn is_retryable(&self, category: &FailureCategory) -> bool {
        let s = failure_category_as_str(category);
        self.policy.retry_on.contains(&s.to_string())
    }

    pub fn compute_delay(&self, attempt: u32) -> u64 {
        match self.policy.backoff {
            BackoffStrategy::None => 0,
            BackoffStrategy::Fixed => self.policy.delay_ms.unwrap_or(0),
            BackoffStrategy::Exponential => {
                let base = self.policy.delay_ms.unwrap_or(0);
                let exp = attempt.saturating_sub(1);
                base * 2u64.pow(exp)
            }
        }
    }

    pub fn schedule_retry(
        &mut self,
        unit_id: &str,
        attempt: u32,
        last_error: &str,
        category: FailureCategory,
        graph_changed: bool,
        context_refresh_required: bool,
    ) -> Option<RetryEntry> {
        if !self.is_retryable(&category) {
            return None;
        }
        if attempt >= self.policy.max_attempts {
            return None;
        }

        let next_attempt = attempt + 1;
        let delay = self.compute_delay(next_attempt);
        let next_eligible_at = now_millis() + delay;

        let entry = RetryEntry {
            unit_id: unit_id.to_string(),
            attempt: next_attempt,
            last_error: last_error.to_string(),
            failure_category: category,
            next_eligible_at,
            graph_changed,
            context_refresh_required,
        };

        self.entries.insert(unit_id.to_string(), entry.clone());
        Some(entry)
    }

    pub fn get_entry(&self, unit_id: &str) -> Option<&RetryEntry> {
        self.entries.get(unit_id)
    }

    pub fn is_eligible(&self, unit_id: &str, now: u64) -> bool {
        self.entries
            .get(unit_id)
            .map_or(false, |entry| now >= entry.next_eligible_at)
    }

    pub fn remove(&mut self, unit_id: &str) -> Option<RetryEntry> {
        self.entries.remove(unit_id)
    }

    pub fn get_eligible(&self, now: u64) -> Vec<RetryEntry> {
        self.entries
            .values()
            .filter(|entry| now >= entry.next_eligible_at)
            .cloned()
            .collect()
    }

    pub fn len(&self) -> usize {
        self.entries.len()
    }

    pub fn get_all(&self) -> Vec<&RetryEntry> {
        self.entries.values().collect()
    }

    pub fn clear(&mut self) {
        self.entries.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn retryable_policy() -> RetryPolicy {
        RetryPolicy {
            max_attempts: 3,
            backoff: BackoffStrategy::Exponential,
            delay_ms: Some(1000),
            retry_on: vec!["tool_unavailable".to_string(), "timeout".to_string()],
            require_revalidation: false,
        }
    }

    #[test]
    fn test_schedule_retry_succeeds_for_retryable_category() {
        let mut queue = RetryQueue::new(retryable_policy());
        let entry = queue.schedule_retry(
            "unit-1",
            1,
            "tool not found",
            FailureCategory::ToolUnavailable,
            false,
            false,
        );
        assert!(entry.is_some());
        let entry = entry.unwrap();
        assert_eq!(entry.unit_id, "unit-1");
        assert_eq!(entry.attempt, 2);
        assert_eq!(entry.last_error, "tool not found");
        assert_eq!(entry.failure_category, FailureCategory::ToolUnavailable);
    }

    #[test]
    fn test_non_retryable_category_returns_none() {
        let mut queue = RetryQueue::new(retryable_policy());
        let entry = queue.schedule_retry(
            "unit-1",
            1,
            "unknown error",
            FailureCategory::UnknownError,
            false,
            false,
        );
        assert!(entry.is_none());
    }

    #[test]
    fn test_max_attempts_reached_returns_none() {
        let mut queue = RetryQueue::new(retryable_policy());
        let entry = queue.schedule_retry(
            "unit-1",
            3,
            "tool not found",
            FailureCategory::ToolUnavailable,
            false,
            false,
        );
        assert!(entry.is_none());
    }

    #[test]
    fn test_exponential_backoff_doubles() {
        let queue = RetryQueue::new(RetryPolicy {
            max_attempts: 5,
            backoff: BackoffStrategy::Exponential,
            delay_ms: Some(1000),
            retry_on: vec!["tool_unavailable".to_string()],
            require_revalidation: false,
        });
        assert_eq!(queue.compute_delay(1), 1000);
        assert_eq!(queue.compute_delay(2), 2000);
    }

    #[test]
    fn test_fixed_backoff_same_delay() {
        let queue = RetryQueue::new(RetryPolicy {
            max_attempts: 5,
            backoff: BackoffStrategy::Fixed,
            delay_ms: Some(500),
            retry_on: vec!["tool_unavailable".to_string()],
            require_revalidation: false,
        });
        assert_eq!(queue.compute_delay(1), 500);
        assert_eq!(queue.compute_delay(10), 500);
    }

    #[test]
    fn test_no_backoff_delay_is_zero() {
        let queue = RetryQueue::new(RetryPolicy {
            max_attempts: 5,
            backoff: BackoffStrategy::None,
            delay_ms: Some(1000),
            retry_on: vec!["tool_unavailable".to_string()],
            require_revalidation: false,
        });
        assert_eq!(queue.compute_delay(1), 0);
        assert_eq!(queue.compute_delay(42), 0);
    }

    #[test]
    fn test_eligibility_before_and_after() {
        let mut queue = RetryQueue::new(RetryPolicy {
            max_attempts: 3,
            backoff: BackoffStrategy::Fixed,
            delay_ms: Some(10_000),
            retry_on: vec!["tool_unavailable".to_string()],
            require_revalidation: false,
        });

        let entry = queue
            .schedule_retry(
                "unit-1",
                0,
                "err",
                FailureCategory::ToolUnavailable,
                false,
                false,
            )
            .unwrap();
        let next = entry.next_eligible_at;

        assert!(!queue.is_eligible("unit-1", next - 1));
        assert!(queue.is_eligible("unit-1", next));
        assert!(queue.is_eligible("unit-1", next + 1));
    }

    #[test]
    fn test_remove_returns_entry_and_removes() {
        let mut queue = RetryQueue::new(retryable_policy());
        queue.schedule_retry(
            "unit-1",
            0,
            "err",
            FailureCategory::ToolUnavailable,
            false,
            false,
        );

        let removed = queue.remove("unit-1");
        assert!(removed.is_some());
        assert_eq!(removed.unwrap().unit_id, "unit-1");

        assert!(queue.get_entry("unit-1").is_none());
    }

    #[test]
    fn test_get_eligible_returns_only_ready_entries() {
        let mut queue = RetryQueue::new(RetryPolicy {
            max_attempts: 5,
            backoff: BackoffStrategy::Fixed,
            delay_ms: Some(10_000),
            retry_on: vec!["tool_unavailable".to_string()],
            require_revalidation: false,
        });

        queue.schedule_retry(
            "unit-1",
            0,
            "err",
            FailureCategory::ToolUnavailable,
            false,
            false,
        );
        queue.schedule_retry(
            "unit-2",
            0,
            "err",
            FailureCategory::ToolUnavailable,
            false,
            false,
        );

        let e1 = queue.get_entry("unit-1").unwrap();
        let e2 = queue.get_entry("unit-2").unwrap();

        let early = std::cmp::min(e1.next_eligible_at, e2.next_eligible_at) - 1;
        assert!(queue.get_eligible(early).is_empty());

        let late = std::cmp::max(e1.next_eligible_at, e2.next_eligible_at) + 1;
        assert_eq!(queue.get_eligible(late).len(), 2);
    }

    #[test]
    fn test_clear_empties_queue() {
        let mut queue = RetryQueue::new(retryable_policy());
        queue.schedule_retry(
            "unit-1",
            0,
            "err",
            FailureCategory::ToolUnavailable,
            false,
            false,
        );
        queue.schedule_retry(
            "unit-2",
            0,
            "err",
            FailureCategory::ToolUnavailable,
            false,
            false,
        );
        assert_eq!(queue.len(), 2);

        queue.clear();
        assert_eq!(queue.len(), 0);
        assert!(queue.get_entry("unit-1").is_none());
        assert!(queue.get_entry("unit-2").is_none());
    }

    #[test]
    fn test_default_policy_via_new_with_default() {
        let queue = RetryQueue::new_with_default();
        let policy = RetryPolicy::default();
        assert_eq!(policy.max_attempts, 3);
        assert_eq!(policy.backoff, BackoffStrategy::Exponential);
        assert_eq!(policy.delay_ms, Some(1000));
        assert!(policy.retry_on.contains(&"lock_conflict".to_string()));
        assert!(policy.retry_on.contains(&"merge_conflict".to_string()));
        assert!(policy.retry_on.contains(&"timeout".to_string()));
        assert!(policy.retry_on.contains(&"tool_unavailable".to_string()));
        assert!(policy.require_revalidation);
        assert!(queue.is_retryable(&FailureCategory::ToolUnavailable));
        assert!(queue.is_retryable(&FailureCategory::Timeout));
    }
}

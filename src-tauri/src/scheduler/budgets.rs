use std::collections::HashMap;

use crate::scheduler::time_utils::now_iso;

use crate::scheduler::types::{
    BudgetEstimate, BudgetPoolConfig, BudgetReservation, UNLIMITED_BUDGET_POOL,
};

#[derive(Debug, Clone, PartialEq)]
pub struct BudgetConsumption {
    pub cost_micro_usd: f64,
    pub workers: u32,
    pub tool_invocations: u32,
    pub file_writes: u32,
    pub tokens: u64,
    pub runtime_ms: u64,
}

impl BudgetConsumption {
    fn zero() -> Self {
        Self {
            cost_micro_usd: 0.0,
            workers: 0,
            tool_invocations: 0,
            file_writes: 0,
            tokens: 0,
            runtime_ms: 0,
        }
    }
}

pub struct BudgetPool {
    config: BudgetPoolConfig,
    reservations: HashMap<String, BudgetReservation>,
    consumption: BudgetConsumption,
    breach: bool,
}

impl BudgetPool {
    pub fn new(config: BudgetPoolConfig) -> Self {
        Self {
            config,
            reservations: HashMap::new(),
            consumption: BudgetConsumption::zero(),
            breach: false,
        }
    }

    pub fn can_reserve(&self, estimate: &BudgetEstimate) -> bool {
        if let Some(v) = estimate.estimated_cost_micro_usd {
            if self.config.max_cost_micro_usd != UNLIMITED_BUDGET_POOL.max_cost_micro_usd
                && self.consumption.cost_micro_usd + v > self.config.max_cost_micro_usd
            {
                return false;
            }
        }

        if let Some(v) = estimate.estimated_workers {
            if self.config.max_workers != UNLIMITED_BUDGET_POOL.max_workers
                && self.consumption.workers as u64 + v as u64 > self.config.max_workers as u64
            {
                return false;
            }
        }

        if let Some(v) = estimate.estimated_tool_invocations {
            if self.config.max_tool_invocations != UNLIMITED_BUDGET_POOL.max_tool_invocations
                && self.consumption.tool_invocations as u64 + v as u64
                    > self.config.max_tool_invocations as u64
            {
                return false;
            }
        }

        if let Some(v) = estimate.estimated_file_writes {
            if self.config.max_file_writes != UNLIMITED_BUDGET_POOL.max_file_writes
                && self.consumption.file_writes as u64 + v as u64
                    > self.config.max_file_writes as u64
            {
                return false;
            }
        }

        if let Some(v) = estimate.estimated_tokens {
            if self.config.max_tokens != UNLIMITED_BUDGET_POOL.max_tokens
                && self.consumption.tokens + v as u64 > self.config.max_tokens as u64
            {
                return false;
            }
        }

        if let Some(v) = estimate.estimated_runtime_ms {
            if self.config.max_runtime_ms != UNLIMITED_BUDGET_POOL.max_runtime_ms
                && self.consumption.runtime_ms as u128 + v as u128
                    > self.config.max_runtime_ms as u128
            {
                return false;
            }
        }

        true
    }

    pub fn reserve(
        &mut self,
        unit_id: &str,
        estimate: &BudgetEstimate,
    ) -> Option<BudgetReservation> {
        if !self.can_reserve(estimate) {
            self.breach = true;
            return None;
        }

        let reservation = BudgetReservation {
            unit_id: unit_id.to_string(),
            reserved_at: now_iso(),
            runtime_ms: estimate.estimated_runtime_ms,
            tokens: estimate.estimated_tokens,
            cost_micro_usd: estimate.estimated_cost_micro_usd,
            workers: estimate.estimated_workers,
            tool_invocations: estimate.estimated_tool_invocations,
            file_writes: estimate.estimated_file_writes,
        };

        self.consumption.cost_micro_usd += estimate.estimated_cost_micro_usd.unwrap_or(0.0);
        self.consumption.workers += estimate.estimated_workers.unwrap_or(0);
        self.consumption.tool_invocations += estimate.estimated_tool_invocations.unwrap_or(0);
        self.consumption.file_writes += estimate.estimated_file_writes.unwrap_or(0);
        self.consumption.tokens += estimate.estimated_tokens.unwrap_or(0) as u64;
        self.consumption.runtime_ms += estimate.estimated_runtime_ms.unwrap_or(0);

        self.reservations
            .insert(unit_id.to_string(), reservation.clone());

        Some(reservation)
    }

    pub fn release(&mut self, unit_id: &str) -> Option<BudgetReservation> {
        let reservation = self.reservations.remove(unit_id)?;

        self.consumption.cost_micro_usd -= reservation.cost_micro_usd.unwrap_or(0.0);
        self.consumption.workers -= reservation.workers.unwrap_or(0);
        self.consumption.tool_invocations -= reservation.tool_invocations.unwrap_or(0);
        self.consumption.file_writes -= reservation.file_writes.unwrap_or(0);
        self.consumption.tokens -= reservation.tokens.unwrap_or(0) as u64;
        self.consumption.runtime_ms -= reservation.runtime_ms.unwrap_or(0);

        Some(reservation)
    }

    pub fn get_reservation(&self, unit_id: &str) -> Option<&BudgetReservation> {
        self.reservations.get(unit_id)
    }

    pub fn clear_breach(&mut self) {
        self.breach = false;
    }

    pub fn get_consumption(&self) -> BudgetConsumption {
        self.consumption.clone()
    }

    pub fn get_config(&self) -> &BudgetPoolConfig {
        &self.config
    }

    pub fn active_reservations(&self) -> usize {
        self.reservations.len()
    }

    pub fn reset(&mut self) {
        self.reservations.clear();
        self.consumption = BudgetConsumption::zero();
        self.breach = false;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::scheduler::types::BudgetConfidence;

    fn make_config(
        max_cost: f64,
        max_workers: u32,
        max_tool_invocations: u32,
        max_file_writes: u32,
        max_tokens: u32,
        max_runtime_ms: u64,
    ) -> BudgetPoolConfig {
        BudgetPoolConfig {
            max_cost_micro_usd: max_cost,
            max_workers,
            max_tool_invocations: max_tool_invocations,
            max_file_writes,
            max_tokens,
            max_runtime_ms,
        }
    }

    fn estimate(
        cost: Option<f64>,
        workers: Option<u32>,
        tool_invocations: Option<u32>,
        file_writes: Option<u32>,
        tokens: Option<u32>,
        runtime_ms: Option<u64>,
    ) -> BudgetEstimate {
        BudgetEstimate {
            estimated_cost_micro_usd: cost,
            estimated_workers: workers,
            estimated_tool_invocations: tool_invocations,
            estimated_file_writes: file_writes,
            estimated_tokens: tokens,
            estimated_runtime_ms: runtime_ms,
            confidence: BudgetConfidence::High,
        }
    }

    #[test]
    fn test_reserve_within_cost_limit_succeeds() {
        let config = make_config(1000.0, u32::MAX, u32::MAX, u32::MAX, u32::MAX, u64::MAX);
        let mut pool = BudgetPool::new(config);
        let est = estimate(Some(500.0), None, None, None, None, None);
        let result = pool.reserve("unit-1", &est);
        assert!(result.is_some());
        assert_eq!(pool.get_consumption().cost_micro_usd, 500.0);
    }

    #[test]
    fn test_reject_when_cost_exceeds_limit() {
        let config = make_config(1000.0, u32::MAX, u32::MAX, u32::MAX, u32::MAX, u64::MAX);
        let mut pool = BudgetPool::new(config);
        let est = estimate(Some(1500.0), None, None, None, None, None);
        let result = pool.reserve("unit-1", &est);
        assert!(result.is_none());
        assert_eq!(pool.get_consumption().cost_micro_usd, 0.0);
    }

    #[test]
    fn test_reserve_within_worker_limit_succeeds_reject_when_exceeded() {
        let config = make_config(f64::MAX, 5, u32::MAX, u32::MAX, u32::MAX, u64::MAX);
        let mut pool = BudgetPool::new(config);
        let est1 = estimate(None, Some(3), None, None, None, None);
        let r1 = pool.reserve("unit-1", &est1);
        assert!(r1.is_some());
        assert_eq!(pool.get_consumption().workers, 3);

        let est2 = estimate(None, Some(3), None, None, None, None);
        let r2 = pool.reserve("unit-2", &est2);
        assert!(r2.is_none());
        assert_eq!(pool.get_consumption().workers, 3);
    }

    #[test]
    fn test_multiple_reserves_accumulate_consumption() {
        let config = make_config(2000.0, u32::MAX, u32::MAX, u32::MAX, u32::MAX, u64::MAX);
        let mut pool = BudgetPool::new(config);
        let est1 = estimate(Some(300.0), Some(2), Some(5), Some(1), Some(100), Some(500));
        let est2 = estimate(Some(700.0), Some(1), Some(3), Some(0), Some(200), Some(300));

        pool.reserve("unit-1", &est1);
        pool.reserve("unit-2", &est2);

        let cons = pool.get_consumption();
        assert_eq!(cons.cost_micro_usd, 1000.0);
        assert_eq!(cons.workers, 3);
        assert_eq!(cons.tool_invocations, 8);
        assert_eq!(cons.file_writes, 1);
        assert_eq!(cons.tokens, 300);
        assert_eq!(cons.runtime_ms, 800);
    }

    #[test]
    fn test_release_reduces_consumption() {
        let config = make_config(1000.0, 10, u32::MAX, u32::MAX, u32::MAX, u64::MAX);
        let mut pool = BudgetPool::new(config);
        let est = estimate(Some(400.0), Some(3), None, None, None, None);
        pool.reserve("unit-1", &est);

        let released = pool.release("unit-1");
        assert!(released.is_some());
        assert_eq!(released.unwrap().unit_id, "unit-1");

        let cons = pool.get_consumption();
        assert_eq!(cons.cost_micro_usd, 0.0);
        assert_eq!(cons.workers, 0);
    }

    #[test]
    fn test_release_non_existent_returns_none() {
        let config = make_config(1000.0, u32::MAX, u32::MAX, u32::MAX, u32::MAX, u64::MAX);
        let mut pool = BudgetPool::new(config);
        let result = pool.release("non-existent");
        assert!(result.is_none());
    }

    #[test]
    fn test_can_reserve_after_releasing() {
        let config = make_config(500.0, 2, u32::MAX, u32::MAX, u32::MAX, u64::MAX);
        let mut pool = BudgetPool::new(config);

        let est1 = estimate(Some(400.0), Some(2), None, None, None, None);
        assert!(pool.reserve("unit-1", &est1).is_some());

        let est2 = estimate(Some(200.0), Some(1), None, None, None, None);
        assert!(pool.reserve("unit-2", &est2).is_none());

        pool.release("unit-1");

        let est3 = estimate(Some(200.0), Some(1), None, None, None, None);
        assert!(pool.reserve("unit-2", &est3).is_some());

        let cons = pool.get_consumption();
        assert_eq!(cons.cost_micro_usd, 200.0);
        assert_eq!(cons.workers, 1);
    }

    #[test]
    fn test_active_reservations_count() {
        let config = make_config(10000.0, u32::MAX, u32::MAX, u32::MAX, u32::MAX, u64::MAX);
        let mut pool = BudgetPool::new(config);

        assert_eq!(pool.active_reservations(), 0);

        let est = estimate(Some(100.0), None, None, None, None, None);
        pool.reserve("unit-1", &est);
        assert_eq!(pool.active_reservations(), 1);

        pool.reserve("unit-2", &est);
        assert_eq!(pool.active_reservations(), 2);

        pool.release("unit-1");
        assert_eq!(pool.active_reservations(), 1);

        pool.release("unit-2");
        assert_eq!(pool.active_reservations(), 0);
    }

    #[test]
    fn test_reset_clears_everything() {
        let config = make_config(1000.0, 5, 10, 5, 1000, 10000);
        let mut pool = BudgetPool::new(config);
        let est = estimate(
            Some(500.0),
            Some(3),
            Some(4),
            Some(2),
            Some(500),
            Some(3000),
        );
        pool.reserve("unit-1", &est);
        pool.reserve("unit-2", &est);

        assert_eq!(pool.active_reservations(), 2);
        assert_eq!(pool.get_consumption().cost_micro_usd, 1000.0);

        pool.reset();

        assert_eq!(pool.active_reservations(), 0);
        assert_eq!(pool.get_consumption(), BudgetConsumption::zero());
    }

    #[test]
    fn test_unlimited_pool_never_rejects() {
        let config = UNLIMITED_BUDGET_POOL;
        let mut pool = BudgetPool::new(config);

        let est = estimate(
            Some(f64::MAX),
            Some(u32::MAX),
            Some(u32::MAX),
            Some(u32::MAX),
            Some(u32::MAX),
            Some(u64::MAX),
        );
        let r = pool.reserve("unit-1", &est);
        assert!(r.is_some());

        let r2 = pool.reserve("unit-2", &est);
        assert!(r2.is_some());

        let cons = pool.get_consumption();
        assert_eq!(cons.cost_micro_usd, f64::MAX);
        assert_eq!(cons.workers, u32::MAX);
        assert_eq!(cons.tool_invocations, u32::MAX);
        assert_eq!(cons.file_writes, u32::MAX);
    }

    #[test]
    fn test_clear_breach_resets_flag() {
        let config = make_config(100.0, u32::MAX, u32::MAX, u32::MAX, u32::MAX, u64::MAX);
        let mut pool = BudgetPool::new(config);
        let est = estimate(Some(200.0), None, None, None, None, None);

        assert!(pool.reserve("unit-1", &est).is_none());

        pool.clear_breach();

        let est2 = estimate(Some(50.0), None, None, None, None, None);
        pool.reserve("unit-1", &est2);
        let est3 = estimate(Some(60.0), None, None, None, None, None);
        assert!(pool.reserve("unit-2", &est3).is_none());
    }
}

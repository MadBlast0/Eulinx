use std::collections::HashMap;
use std::time::{Instant, SystemTime};

use crate::scheduler::types::{RateLimitConfig, TokenBucketConfig, TokenBucketState};

pub struct TokenBucket {
    tokens: f64,
    capacity: f64,
    refill_rate: f64,
    last_refill: Instant,
}

impl TokenBucket {
    pub fn new(config: &TokenBucketConfig) -> Self {
        Self {
            tokens: config.capacity,
            capacity: config.capacity,
            refill_rate: config.refill_rate,
            last_refill: Instant::now(),
        }
    }

    pub fn try_consume(&mut self, count: f64) -> bool {
        self.refill();
        if self.tokens >= count {
            self.tokens -= count;
            true
        } else {
            false
        }
    }

    pub fn return_tokens(&mut self, count: f64) {
        self.tokens = (self.tokens + count).min(self.capacity);
    }

    pub fn available_tokens(&self) -> f64 {
        let elapsed = self.last_refill.elapsed();
        let tokens_to_add = elapsed.as_secs_f64() * self.refill_rate;
        (self.tokens + tokens_to_add).min(self.capacity)
    }

    pub fn get_state(&self) -> TokenBucketState {
        let tokens = self.available_tokens();
        let now = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        TokenBucketState {
            tokens,
            last_refill_at: now,
        }
    }

    fn refill(&mut self) {
        let elapsed = self.last_refill.elapsed();
        let tokens_to_add = elapsed.as_secs_f64() * self.refill_rate;
        self.tokens = (self.tokens + tokens_to_add).min(self.capacity);
        self.last_refill = Instant::now();
    }
}

pub struct RateLimiter {
    global: TokenBucket,
    per_group: HashMap<String, TokenBucket>,
    config: RateLimitConfig,
}

impl RateLimiter {
    pub fn new(config: &RateLimitConfig) -> Self {
        Self {
            global: TokenBucket::new(&config.global),
            per_group: HashMap::new(),
            config: config.clone(),
        }
    }

    pub fn is_allowed(&mut self, group: Option<&str>, count: f64) -> bool {
        if !self.global.try_consume(count) {
            return false;
        }

        if let Some(group_name) = group {
            if let Some(ref per_group_config) = self.config.per_group {
                let bucket = self
                    .per_group
                    .entry(group_name.to_string())
                    .or_insert_with(|| TokenBucket::new(per_group_config));
                if !bucket.try_consume(count) {
                    self.global.return_tokens(count);
                    return false;
                }
            }
        }

        true
    }

    pub fn return_tokens(&mut self, group: Option<&str>, count: f64) {
        self.global.return_tokens(count);
        if let Some(group_name) = group {
            if let Some(bucket) = self.per_group.get_mut(group_name) {
                bucket.return_tokens(count);
            }
        }
    }

    pub fn get_global_state(&self) -> TokenBucketState {
        self.global.get_state()
    }

    pub fn get_group_state(&self, group: &str) -> Option<TokenBucketState> {
        self.per_group.get(group).map(|b| b.get_state())
    }

    pub fn reset(&mut self) {
        self.global = TokenBucket::new(&self.config.global);
        self.per_group.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    fn bucket_config(capacity: f64, refill_rate: f64) -> TokenBucketConfig {
        TokenBucketConfig {
            capacity,
            refill_rate,
        }
    }

    #[test]
    fn test_bucket_starts_full() {
        let bucket = TokenBucket::new(&bucket_config(10.0, 1.0));
        assert!((bucket.available_tokens() - 10.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_bucket_consume_reduces() {
        let mut bucket = TokenBucket::new(&bucket_config(10.0, 0.0));
        assert!(bucket.try_consume(3.0));
        assert!((bucket.available_tokens() - 7.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_bucket_reject_insufficient() {
        let mut bucket = TokenBucket::new(&bucket_config(5.0, 0.0));
        assert!(bucket.try_consume(5.0));
        assert!(!bucket.try_consume(1.0));
    }

    #[test]
    fn test_bucket_refill_over_time() {
        let mut bucket = TokenBucket::new(&bucket_config(100.0, 10.0));
        assert!(bucket.try_consume(100.0));
        assert!(!bucket.try_consume(1.0));

        std::thread::sleep(Duration::from_millis(200));

        let available = bucket.available_tokens();
        assert!(available >= 1.0 && available <= 3.0);
        assert!(bucket.try_consume(1.0));
    }

    #[test]
    fn test_bucket_return_tokens() {
        let mut bucket = TokenBucket::new(&bucket_config(10.0, 0.0));
        assert!(bucket.try_consume(7.0));
        bucket.return_tokens(3.0);
        assert!((bucket.available_tokens() - 6.0).abs() < f64::EPSILON);

        bucket.return_tokens(100.0);
        assert!((bucket.available_tokens() - 10.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_bucket_get_state() {
        let mut bucket = TokenBucket::new(&bucket_config(10.0, 0.0));
        bucket.try_consume(3.0);
        let state = bucket.get_state();
        assert!((state.tokens - 7.0).abs() < f64::EPSILON);
        assert!(state.last_refill_at > 0);
    }

    #[test]
    fn test_ratelimiter_global() {
        let config = RateLimitConfig {
            global: bucket_config(2.0, 0.0),
            per_group: None,
        };
        let mut limiter = RateLimiter::new(&config);
        assert!(limiter.is_allowed(None, 1.0));
        assert!(limiter.is_allowed(None, 1.0));
        assert!(!limiter.is_allowed(None, 1.0));
    }

    #[test]
    fn test_ratelimiter_exhaust_global_blocks_all() {
        let config = RateLimitConfig {
            global: bucket_config(1.0, 0.0),
            per_group: Some(bucket_config(10.0, 0.0)),
        };
        let mut limiter = RateLimiter::new(&config);
        assert!(limiter.is_allowed(Some("group-a"), 1.0));
        assert!(!limiter.is_allowed(Some("group-b"), 1.0));
    }

    #[test]
    fn test_ratelimiter_per_group_independent() {
        let config = RateLimitConfig {
            global: bucket_config(100.0, 0.0),
            per_group: Some(bucket_config(3.0, 0.0)),
        };
        let mut limiter = RateLimiter::new(&config);

        assert!(limiter.is_allowed(Some("group-a"), 3.0));
        assert!(!limiter.is_allowed(Some("group-a"), 1.0));

        assert!(limiter.is_allowed(Some("group-b"), 1.0));
        assert!(limiter.is_allowed(Some("group-b"), 1.0));
        assert!(limiter.is_allowed(Some("group-b"), 1.0));
        assert!(!limiter.is_allowed(Some("group-b"), 1.0));
    }

    #[test]
    fn test_ratelimiter_return_tokens() {
        let config = RateLimitConfig {
            global: bucket_config(2.0, 0.0),
            per_group: Some(bucket_config(2.0, 0.0)),
        };
        let mut limiter = RateLimiter::new(&config);
        assert!(limiter.is_allowed(Some("group-a"), 2.0));
        assert!(!limiter.is_allowed(Some("group-a"), 1.0));

        limiter.return_tokens(Some("group-a"), 2.0);
        assert!(limiter.is_allowed(Some("group-a"), 1.0));
    }

    #[test]
    fn test_ratelimiter_reset() {
        let config = RateLimitConfig {
            global: bucket_config(1.0, 0.0),
            per_group: Some(bucket_config(1.0, 0.0)),
        };
        let mut limiter = RateLimiter::new(&config);
        assert!(limiter.is_allowed(Some("group-a"), 1.0));
        assert!(!limiter.is_allowed(Some("group-a"), 1.0));

        limiter.reset();
        assert!(limiter.is_allowed(Some("group-a"), 1.0));
        assert!(limiter.is_allowed(Some("group-b"), 1.0));
    }

    #[test]
    fn test_ratelimiter_no_per_group() {
        let config = RateLimitConfig {
            global: bucket_config(100.0, 0.0),
            per_group: None,
        };
        let mut limiter = RateLimiter::new(&config);
        for _ in 0..50 {
            assert!(limiter.is_allowed(Some("group-a"), 1.0));
        }
    }
}

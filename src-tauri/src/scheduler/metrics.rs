use std::collections::{HashMap, VecDeque};
use std::time::{Duration, Instant};

use crate::scheduler::types::{
    QueueKind, QueueSnapshotEntry, SchedulerMetrics, SchedulerQueueSnapshot,
};

const METRICS_WINDOW_SIZE: usize = 1000;
const THROUGHPUT_WINDOW_SECS: u64 = 60;

pub struct MetricsCollector {
    queue_lengths: HashMap<String, u32>,
    wait_times: VecDeque<f64>,
    run_times: VecDeque<f64>,
    blocked_count: u64,
    retry_count: u64,
    cancellation_count: u64,
    completed_count: u64,
    scheduled_count: u64,
    running_count: u64,
    completed_timestamps: VecDeque<Instant>,
}

impl MetricsCollector {
    pub fn new() -> Self {
        Self {
            queue_lengths: HashMap::new(),
            wait_times: VecDeque::new(),
            run_times: VecDeque::new(),
            blocked_count: 0,
            retry_count: 0,
            cancellation_count: 0,
            completed_count: 0,
            scheduled_count: 0,
            running_count: 0,
            completed_timestamps: VecDeque::new(),
        }
    }

    pub fn set_queue_length(&mut self, queue: &str, length: u32) {
        self.queue_lengths.insert(queue.to_string(), length);
    }

    pub fn record_wait_time(&mut self, ms: f64) {
        self.wait_times.push_back(ms);
        if self.wait_times.len() > METRICS_WINDOW_SIZE {
            self.wait_times.pop_front();
        }
    }

    pub fn record_run_time(&mut self, ms: f64) {
        self.run_times.push_back(ms);
        if self.run_times.len() > METRICS_WINDOW_SIZE {
            self.run_times.pop_front();
        }
    }

    pub fn increment_blocked(&mut self) {
        self.blocked_count += 1;
    }

    pub fn decrement_blocked(&mut self) {
        self.blocked_count = self.blocked_count.saturating_sub(1);
    }

    pub fn increment_retry(&mut self) {
        self.retry_count += 1;
    }

    pub fn increment_cancellation(&mut self) {
        self.cancellation_count += 1;
    }

    pub fn record_completed(&mut self) {
        self.completed_count += 1;
        self.completed_timestamps.push_back(Instant::now());
        let cutoff = Instant::now() - Duration::from_secs(THROUGHPUT_WINDOW_SECS);
        while let Some(&first) = self.completed_timestamps.front() {
            if first >= cutoff {
                break;
            }
            self.completed_timestamps.pop_front();
        }
    }

    pub fn record_scheduled(&mut self) {
        self.scheduled_count += 1;
    }

    pub fn set_running_count(&mut self, count: u64) {
        self.running_count = count;
    }

    pub fn get_metrics(&self) -> SchedulerMetrics {
        let avg_wait = if self.wait_times.is_empty() {
            0.0
        } else {
            self.wait_times.iter().sum::<f64>() / self.wait_times.len() as f64
        };

        let avg_run = if self.run_times.is_empty() {
            0.0
        } else {
            self.run_times.iter().sum::<f64>() / self.run_times.len() as f64
        };

        let cutoff = Instant::now() - Duration::from_secs(THROUGHPUT_WINDOW_SECS);
        let recent_completed = self
            .completed_timestamps
            .iter()
            .filter(|&&t| t >= cutoff)
            .count() as u32;

        SchedulerMetrics {
            queue_lengths: self.queue_lengths.clone(),
            average_wait_time_ms: avg_wait,
            average_run_time_ms: avg_run,
            blocked_count: self.blocked_count as u32,
            retry_count: self.retry_count as u32,
            cancellation_count: self.cancellation_count as u32,
            throughput_per_minute: recent_completed,
            running_count: self.running_count as u32,
            total_processed: (self.completed_count + self.running_count) as u32,
        }
    }

    pub fn reset(&mut self) {
        self.queue_lengths.clear();
        self.wait_times.clear();
        self.run_times.clear();
        self.blocked_count = 0;
        self.retry_count = 0;
        self.cancellation_count = 0;
        self.completed_count = 0;
        self.scheduled_count = 0;
        self.running_count = 0;
        self.completed_timestamps.clear();
    }
}

impl Default for MetricsCollector {
    fn default() -> Self {
        Self::new()
    }
}

pub fn build_queue_snapshot(
    queue_entries: HashMap<QueueKind, Vec<QueueSnapshotEntry>>,
    running_count: u32,
    total_blocked: u32,
    timestamp: String,
) -> SchedulerQueueSnapshot {
    SchedulerQueueSnapshot {
        queues: queue_entries,
        running_count,
        total_blocked,
        timestamp,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_collector_has_zero_values() {
        let m = MetricsCollector::new();
        let metrics = m.get_metrics();
        assert!(metrics.queue_lengths.is_empty());
        assert_eq!(metrics.average_wait_time_ms, 0.0);
        assert_eq!(metrics.average_run_time_ms, 0.0);
        assert_eq!(metrics.blocked_count, 0);
        assert_eq!(metrics.retry_count, 0);
        assert_eq!(metrics.cancellation_count, 0);
        assert_eq!(metrics.throughput_per_minute, 0);
        assert_eq!(metrics.running_count, 0);
        assert_eq!(metrics.total_processed, 0);
    }

    #[test]
    fn test_queue_length_tracking() {
        let mut m = MetricsCollector::new();
        m.set_queue_length("incoming", 5);
        m.set_queue_length("runnable", 3);
        let metrics = m.get_metrics();
        assert_eq!(metrics.queue_lengths.get("incoming"), Some(&5));
        assert_eq!(metrics.queue_lengths.get("runnable"), Some(&3));
    }

    #[test]
    fn test_wait_time_average() {
        let mut m = MetricsCollector::new();
        m.record_wait_time(10.0);
        m.record_wait_time(20.0);
        m.record_wait_time(30.0);
        let metrics = m.get_metrics();
        assert!((metrics.average_wait_time_ms - 20.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_run_time_average() {
        let mut m = MetricsCollector::new();
        m.record_run_time(100.0);
        m.record_run_time(200.0);
        let metrics = m.get_metrics();
        assert!((metrics.average_run_time_ms - 150.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_blocked_count_increment_decrement() {
        let mut m = MetricsCollector::new();
        assert_eq!(m.get_metrics().blocked_count, 0);
        m.increment_blocked();
        assert_eq!(m.get_metrics().blocked_count, 1);
        m.increment_blocked();
        assert_eq!(m.get_metrics().blocked_count, 2);
        m.decrement_blocked();
        assert_eq!(m.get_metrics().blocked_count, 1);
        m.decrement_blocked();
        assert_eq!(m.get_metrics().blocked_count, 0);
        m.decrement_blocked();
        assert_eq!(m.get_metrics().blocked_count, 0);
    }

    #[test]
    fn test_retry_count_tracking() {
        let mut m = MetricsCollector::new();
        m.increment_retry();
        m.increment_retry();
        m.increment_retry();
        assert_eq!(m.get_metrics().retry_count, 3);
    }

    #[test]
    fn test_cancellation_count_tracking() {
        let mut m = MetricsCollector::new();
        m.increment_cancellation();
        assert_eq!(m.get_metrics().cancellation_count, 1);
    }

    #[test]
    fn test_completed_count_tracking() {
        let mut m = MetricsCollector::new();
        m.record_completed();
        m.record_completed();
        m.record_completed();
        assert_eq!(m.get_metrics().total_processed, 3);
    }

    #[test]
    fn test_running_count_tracking() {
        let mut m = MetricsCollector::new();
        m.set_running_count(4);
        assert_eq!(m.get_metrics().running_count, 4);
    }

    #[test]
    fn test_get_metrics_all_fields_populated() {
        let mut m = MetricsCollector::new();
        m.set_queue_length("incoming", 2);
        m.record_wait_time(15.0);
        m.record_run_time(50.0);
        m.increment_blocked();
        m.increment_retry();
        m.increment_cancellation();
        m.record_completed();
        m.set_running_count(1);

        let metrics = m.get_metrics();
        assert_eq!(metrics.queue_lengths.get("incoming"), Some(&2));
        assert!((metrics.average_wait_time_ms - 15.0).abs() < f64::EPSILON);
        assert!((metrics.average_run_time_ms - 50.0).abs() < f64::EPSILON);
        assert_eq!(metrics.blocked_count, 1);
        assert_eq!(metrics.retry_count, 1);
        assert_eq!(metrics.cancellation_count, 1);
        assert_eq!(metrics.total_processed, 2);
        assert_eq!(metrics.running_count, 1);
    }

    #[test]
    fn test_reset_clears_everything() {
        let mut m = MetricsCollector::new();
        m.set_queue_length("incoming", 2);
        m.record_wait_time(15.0);
        m.record_run_time(50.0);
        m.increment_blocked();
        m.increment_retry();
        m.increment_cancellation();
        m.record_completed();
        m.set_running_count(1);

        m.reset();

        let metrics = m.get_metrics();
        assert!(metrics.queue_lengths.is_empty());
        assert_eq!(metrics.average_wait_time_ms, 0.0);
        assert_eq!(metrics.average_run_time_ms, 0.0);
        assert_eq!(metrics.blocked_count, 0);
        assert_eq!(metrics.retry_count, 0);
        assert_eq!(metrics.cancellation_count, 0);
        assert_eq!(metrics.running_count, 0);
        assert_eq!(metrics.total_processed, 0);
    }

    #[test]
    fn test_rolling_window_does_not_exceed_1000() {
        let mut m = MetricsCollector::new();
        for i in 0..1500 {
            m.record_wait_time(i as f64);
            m.record_run_time(i as f64);
        }
        assert_eq!(m.wait_times.len(), 1000);
        assert_eq!(m.run_times.len(), 1000);
        assert!((m.wait_times[0] - 500.0).abs() < f64::EPSILON);
        assert!((m.run_times[0] - 500.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_build_queue_snapshot() {
        let mut entries = HashMap::new();
        entries.insert(
            QueueKind::Runnable,
            vec![QueueSnapshotEntry {
                unit_id: "u1".to_string(),
                kind: crate::scheduler::types::SchedulingUnitKind::Task,
                priority: crate::scheduler::types::SchedulingPriority::Normal,
                state: crate::scheduler::types::SchedulingState::Queued,
                wait_reason: None,
                queued_at: "2026-01-01T00:00:00Z".to_string(),
                age_ms: 100,
            }],
        );
        let snapshot = build_queue_snapshot(entries, 2, 1, "2026-01-01T00:00:01Z".to_string());
        assert_eq!(snapshot.running_count, 2);
        assert_eq!(snapshot.total_blocked, 1);
        assert_eq!(snapshot.queues.len(), 1);
        assert!(snapshot.queues.contains_key(&QueueKind::Runnable));
        assert_eq!(snapshot.queues[&QueueKind::Runnable].len(), 1);
    }
}

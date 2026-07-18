/**
 * P19-OBS-ALERTS — Alert System
 *
 * Alert rules, triggering, acknowledgment, and resolution.
 * From RuntimeManager-Part01 §Runtime Diagnostics.
 */

import type { Alert, AlertCondition, AlertRule, AlertStatus } from "./observability-types"

// ---------------------------------------------------------------------------
// Alert Manager
// ---------------------------------------------------------------------------

export class AlertManager {
  private readonly rules = new Map<string, AlertRule>()
  private readonly alerts = new Map<string, Alert>()
  private readonly history: Alert[] = []

  /**
   * Register an alert rule.
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.ruleId, rule)
  }

  /**
   * Remove an alert rule.
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId)
  }

  /**
   * Evaluate a metric value against all rules.
   */
  evaluate(metricName: string, value: number): Alert | null {
    for (const rule of this.rules.values()) {
      if (!rule.enabled || rule.metric !== metricName) continue
      if (this.evaluateCondition(value, rule.condition, rule.threshold)) {
        return this.trigger(rule, value)
      }
    }
    return null
  }

  /**
   * Acknowledge an alert.
   */
  acknowledge(alertId: string): Alert | undefined {
    const alert = this.alerts.get(alertId)
    if (!alert || alert.status !== "active") return undefined
    const updated = {
      ...alert,
      status: "acknowledged" as AlertStatus,
      acknowledgedAt: new Date().toISOString() as any,
    }
    this.alerts.set(alertId, updated)
    return updated
  }

  /**
   * Resolve an alert.
   */
  resolve(alertId: string): Alert | undefined {
    const alert = this.alerts.get(alertId)
    if (!alert || alert.status === "resolved") return undefined
    const updated = {
      ...alert,
      status: "resolved" as AlertStatus,
      resolvedAt: new Date().toISOString() as any,
    }
    this.alerts.set(alertId, updated)
    return updated
  }

  /**
   * Get all active alerts.
   */
  getActiveAlerts(): Alert[] {
    return [...this.alerts.values()].filter((a) => a.status === "active")
  }

  /**
   * Get all alerts.
   */
  getAllAlerts(): Alert[] {
    return [...this.alerts.values()]
  }

  /**
   * Get alert history.
   */
  getHistory(): Alert[] {
    return this.history
  }

  /**
   * Clear all alerts.
   */
  clear(): void {
    this.alerts.clear()
    this.history.length = 0
  }

  private trigger(rule: AlertRule, value: number): Alert {
    const alert: Alert = {
      alertId: `alert_${Date.now().toString(36)}`,
      ruleId: rule.ruleId,
      name: rule.name,
      severity: rule.severity,
      status: "active",
      message: `${rule.name}: ${value} ${rule.condition} ${rule.threshold}`,
      value,
      threshold: rule.threshold,
      triggeredAt: new Date().toISOString() as any,
    }
    this.alerts.set(alert.alertId, alert)
    this.history.push(alert)
    return alert
  }

  private evaluateCondition(value: number, condition: AlertCondition, threshold: number): boolean {
    switch (condition) {
      case "greater_than": return value > threshold
      case "less_than": return value < threshold
      case "equals": return value === threshold
      case "not_equals": return value !== threshold
      case "rate_of_change": return false // Simplified
      default: return false
    }
  }
}

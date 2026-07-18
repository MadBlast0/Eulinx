/**
 * P15-ORCH-QA — QA Orchestrator
 *
 * Quality assurance: runs tests, validates artifacts, enforces quality gates.
 * From AIArchitecture-Part02 §Worker Roles, Judge-Part01 §Adjudication.
 */

import type { Result } from "@/core/result"
import { ok } from "@/core/result"
import { CoreError } from "@/core/error"
import type { ArtifactId, IsoTimestamp } from "@/core/types"

import { BaseOrchestrator } from "../orchestrator-base"
import type {
  OrchestratorConfig,
  PlanNode,
  Plan,
  QAConfig,
  VerificationCheck,
} from "../orchestrator-types"

// ---------------------------------------------------------------------------
// QA Orchestrator
// ---------------------------------------------------------------------------

export class QAOrchestrator extends BaseOrchestrator {
  private readonly qaConfig: QAConfig
  private readonly taskNode: PlanNode
  private readonly plan: Plan
  private testResults: TestResult[] = []

  constructor(
    config: OrchestratorConfig,
    taskNode: PlanNode,
    plan: Plan,
    qaConfig?: Partial<QAConfig>,
  ) {
    super(config)
    this.taskNode = taskNode
    this.plan = plan
    this.qaConfig = {
      requireTestCoverage: 80,
      runIntegrationTests: true,
      runE2ETests: false,
      ...qaConfig,
    }
  }

  // -----------------------------------------------------------------------
  // Identity
  // -----------------------------------------------------------------------

  describe(): string {
    return `QA: validating "${this.taskNode.intent.slice(0, 50)}"`
  }

  getTestResults(): readonly TestResult[] {
    return [...this.testResults]
  }

  // -----------------------------------------------------------------------
  // Lifecycle hooks
  // -----------------------------------------------------------------------

  protected async onPlan(): Promise<Result<void, CoreError>> {
    return ok(undefined)
  }

  protected async onDelegate(): Promise<Result<void, CoreError>> {
    return ok(undefined)
  }

  protected async onComplete(): Promise<Result<void, CoreError>> {
    return ok(undefined)
  }

  // -----------------------------------------------------------------------
  // Test execution
  // -----------------------------------------------------------------------

  async runTests(
    testSuite: TestSuite,
    executor: (command: string) => Promise<Result<string, CoreError>>,
  ): Promise<Result<QAReport, CoreError>> {
    const results: VerificationCheck[] = []

    for (const test of testSuite.tests) {
      const result = await executor(test.command)
      results.push({
        name: test.name,
        passed: result.ok,
        details: result.ok ? result.value : result.error.message,
        checkType: "test",
      })
    }

    const passed = results.filter(r => r.passed).length
    const total = results.length
    const coverage = total > 0 ? (passed / total) * 100 : 0

    const testResult: TestResult = {
      suiteName: testSuite.name,
      passed,
      failed: total - passed,
      total,
      coverage,
      checks: results,
      executedAt: new Date().toISOString() as IsoTimestamp,
    }
    this.testResults.push(testResult)

    return ok({
      allPassed: passed === total,
      coverage,
      meetsThreshold: coverage >= this.qaConfig.requireTestCoverage,
      results: [testResult],
    })
  }

  // -----------------------------------------------------------------------
  // Artifact validation
  // -----------------------------------------------------------------------

  validateArtifact(
    artifactId: ArtifactId,
    checks: readonly string[],
    executor: (check: string) => Promise<Result<string, CoreError>>,
  ): Promise<Result<readonly VerificationCheck[], CoreError>> {
    return this.runChecks(artifactId, checks, executor)
  }

  private async runChecks(
    _artifactId: ArtifactId,
    checks: readonly string[],
    executor: (check: string) => Promise<Result<string, CoreError>>,
  ): Promise<Result<readonly VerificationCheck[], CoreError>> {
    const results: VerificationCheck[] = []

    for (const check of checks) {
      const result = await executor(check)
      results.push({
        name: check,
        passed: result.ok,
        details: result.ok ? result.value : result.error.message,
        checkType: "test",
      })
    }

    return ok(results)
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TestSuite {
  readonly name: string
  readonly tests: readonly TestCase[]
}

export interface TestCase {
  readonly name: string
  readonly command: string
  readonly timeout?: number
}

export interface TestResult {
  readonly suiteName: string
  readonly passed: number
  readonly failed: number
  readonly total: number
  readonly coverage: number
  readonly checks: readonly VerificationCheck[]
  readonly executedAt: IsoTimestamp
}

export interface QAReport {
  readonly allPassed: boolean
  readonly coverage: number
  readonly meetsThreshold: boolean
  readonly results: readonly TestResult[]
}

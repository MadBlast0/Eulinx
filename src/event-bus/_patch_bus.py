import sys

filepath = r'C:\Storage\Coding\Eulinx\src\event-bus\event-bus.ts'

with open(filepath, 'r') as f:
    content = f.read()

# Add queryEvents method after getLog()
old_block = '  public getLog(): EulinxEventUnion[] {\n    return [...this.eventLog]\n  }'

new_block = '''  public getLog(): EulinxEventUnion[] {
    return [...this.eventLog]
  }

  /**
   * Query persisted events. If HelixDB adapter is set, prefer it for reads.
   * Otherwise falls back to the in-memory log.
   */
  public async queryEvents(
    range: import("./event-history").EventRangeQuery,
  ): Promise<readonly EulinxEventUnion[]> {
    if (this.helixdbAdapter) {
      const envelopes = await queryHelixDB(this.helixdbAdapter, range)
      return envelopes.map((env) => ({
        eventId: env.eventId,
        sequence: env.sequence,
        type: env.type,
        payload: JSON.parse(env.payload),
        source: { service: env.service as EulinxEventUnion["source"]["service"] },
        workspaceId: env.workspaceId as EulinxEventUnion["workspaceId"],
        sessionId: env.sessionId as EulinxEventUnion["sessionId"],
        executionId: env.executionId as EulinxEventUnion["executionId"],
        correlationId: env.correlationId,
        causationId: env.causationId,
        replayGrade: true,
        emittedAt: env.emittedAt as EulinxEventUnion["emittedAt"],
      }) as EulinxEventUnion[])
    }
    return [...this.eventLog]
  }'''

if old_block in content:
    content = content.replace(old_block, new_block, 1)
    with open(filepath, 'w') as f:
        f.write(content)
    print('OK: queryEvents added')
else:
    print('ERROR: getLog block not found')
    sys.exit(1)

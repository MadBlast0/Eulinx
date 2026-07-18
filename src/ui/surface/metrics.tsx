/**
 * P18-UI-METRICS — Metrics Surface
 *
 * Performance metrics: tokens, latency, throughput.
 * From RuntimeDiagnostics-Part01 through Part05.
 */

export function Metrics() {
  return (
    <div className="flex h-full flex-col gap-4 p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold">Metrics</h2>

      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Total Tokens" value="0" />
        <MetricCard label="Avg Latency" value="0ms" />
        <MetricCard label="Throughput" value="0 req/s" />
        <MetricCard label="Active Workers" value="0" />
        <MetricCard label="Queue Depth" value="0" />
        <MetricCard label="Error Rate" value="0%" />
      </div>
    </div>
  )
}

function MetricCard({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

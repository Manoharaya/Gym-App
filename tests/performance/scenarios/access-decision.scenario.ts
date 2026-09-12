/**
 * Scenario: Turnstile Physical Access Decision Sub-50ms Latency Benchmark
 * Simulates peak rush turnstile access badge scans across multiple clubs.
 */

export interface AccessScenarioResult {
  totalScans: number;
  allowedCount: number;
  deniedCount: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  sub50MsComplianceRate: number;
}

export class AccessDecisionScenario {
  static async execute(
    accessScanFunction: (scanIndex: number) => Promise<{ allowed: boolean; latencyMs: number }>,
    totalScans: number = 100
  ): Promise<AccessScenarioResult> {
    const latencies: number[] = [];
    let allowedCount = 0;
    let deniedCount = 0;

    for (let i = 1; i <= totalScans; i++) {
      const res = await accessScanFunction(i);
      latencies.push(res.latencyMs);
      if (res.allowed) allowedCount++;
      else deniedCount++;
    }

    latencies.sort((a, b) => a - b);
    const p50Ms = latencies[Math.floor(latencies.length * 0.5)] || 0;
    const p95Ms = latencies[Math.floor(latencies.length * 0.95)] || 0;
    const p99Ms = latencies[Math.floor(latencies.length * 0.99)] || 0;

    const sub50Count = latencies.filter((l) => l < 50).length;
    const sub50MsComplianceRate = parseFloat(((sub50Count / totalScans) * 100).toFixed(2));

    return {
      totalScans,
      allowedCount,
      deniedCount,
      p50Ms,
      p95Ms,
      p99Ms,
      sub50MsComplianceRate,
    };
  }
}

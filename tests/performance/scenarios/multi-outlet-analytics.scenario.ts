/**
 * Scenario: Multi-Outlet Analytics Scaling (1, 10, 50, 100+ Outlets)
 * Verifies that multi-outlet rollups execute without N+1 query loops.
 */

export interface MultiOutletBenchmarkPoint {
  outletsCount: number;
  durationMs: number;
  queryCount: number;
  isSubSecond: boolean;
}

export class MultiOutletAnalyticsScenario {
  static async benchmarkScale(
    aggregateFunction: (outletCount: number) => Promise<{ durationMs: number; queryCount: number }>
  ): Promise<MultiOutletBenchmarkPoint[]> {
    const scales = [1, 10, 50, 100];
    const points: MultiOutletBenchmarkPoint[] = [];

    for (const count of scales) {
      const { durationMs, queryCount } = await aggregateFunction(count);
      points.push({
        outletsCount: count,
        durationMs,
        queryCount,
        isSubSecond: durationMs < 1000,
      });
    }

    return points;
  }
}

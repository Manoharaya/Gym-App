/**
 * Scenario: Class Booking High-Concurrency & Anti-Overbooking Verification
 * Simulates 50 concurrent members attempting to book the final 10 slots of a popular class.
 */

export interface BookingScenarioResult {
  totalAttempts: number;
  confirmedCount: number;
  waitlistedOrRejectedCount: number;
  overbookingDetected: boolean;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  durationTotalMs: number;
}

export class BookingConcurrencyScenario {
  /**
   * Executes concurrent booking requests against class session.
   */
  static async execute(
    bookingFunction: (memberIndex: number) => Promise<{ status: string; id?: string; error?: any }>,
    concurrencyCount: number = 50,
    sessionCapacity: number = 10
  ): Promise<BookingScenarioResult> {
    const latencies: number[] = [];
    const startTime = Date.now();

    const tasks = Array.from({ length: concurrencyCount }, async (_, idx) => {
      const reqStart = Date.now();
      try {
        const res = await bookingFunction(idx + 1);
        latencies.push(Date.now() - reqStart);
        return res;
      } catch (err: any) {
        latencies.push(Date.now() - reqStart);
        return { status: 'FAILED', error: err.message };
      }
    });

    const results = await Promise.all(tasks);
    const durationTotalMs = Date.now() - startTime;

    const confirmedCount = results.filter((r) => r.status === 'CONFIRMED').length;
    const waitlistedOrRejectedCount = results.filter((r) => r.status !== 'CONFIRMED').length;
    const overbookingDetected = confirmedCount > sessionCapacity;

    latencies.sort((a, b) => a - b);
    const p50Ms = latencies[Math.floor(latencies.length * 0.5)] || 0;
    const p95Ms = latencies[Math.floor(latencies.length * 0.95)] || 0;
    const p99Ms = latencies[Math.floor(latencies.length * 0.99)] || 0;

    return {
      totalAttempts: concurrencyCount,
      confirmedCount,
      waitlistedOrRejectedCount,
      overbookingDetected,
      p50Ms,
      p95Ms,
      p99Ms,
      durationTotalMs,
    };
  }
}

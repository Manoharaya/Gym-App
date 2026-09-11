import { Injectable } from '@nestjs/common';
import { RawOutletMetrics } from './outlet-metric.service';
import { OutletBenchmarkSummaryDto } from '@fitcore/types';

@Injectable()
export class OutletBenchmarkService {
  /**
   * Computes organisation benchmark distribution (average, median, quartiles) for a given metric.
   * Multi-currency metrics are segregated strictly by currency.
   */
  computeBenchmark(params: {
    metricKey: string;
    domain: any;
    unit: string;
    currency?: string;
    outlets: RawOutletMetrics[];
    extractor: (o: RawOutletMetrics) => number | null;
  }): OutletBenchmarkSummaryDto {
    const { metricKey, domain, unit, currency, outlets, extractor } = params;

    // Filter outlets by currency if currency-dependent
    const filteredOutlets = currency
      ? outlets.filter((o) => (o.currency || 'AUD').toUpperCase() === currency.toUpperCase())
      : outlets;

    const values = filteredOutlets
      .map((o) => ({ outlet: o, val: extractor(o) }))
      .filter((item): item is { outlet: RawOutletMetrics; val: number } => item.val !== null && !isNaN(item.val));

    if (values.length === 0) {
      return {
        metricKey,
        domain,
        unit,
        currency,
        organisationAverage: 0,
        organisationMedian: 0,
        topQuartile: 0,
        bottomQuartile: 0,
        totalOutletsEvaluated: 0,
        outlets: [],
      };
    }

    const sorted = [...values].sort((a, b) => b.val - a.val);
    const sum = sorted.reduce((acc, curr) => acc + curr.val, 0);
    const avg = Math.round((sum / sorted.length) * 100) / 100;

    const median = this.calculatePercentile(sorted.map((s) => s.val), 50);
    const topQuartile = this.calculatePercentile(sorted.map((s) => s.val), 75);
    const bottomQuartile = this.calculatePercentile(sorted.map((s) => s.val), 25);

    const outletSummaries = sorted.map((s, idx) => {
      const variance = avg > 0 ? Math.round(((s.val - avg) / avg) * 1000) / 10 : null;
      return {
        outletId: s.outlet.outletId,
        outletName: s.outlet.outletName,
        value: s.val,
        varianceFromAveragePct: variance,
        rank: idx + 1,
      };
    });

    return {
      metricKey,
      domain,
      unit,
      currency,
      organisationAverage: avg,
      organisationMedian: median,
      topQuartile,
      bottomQuartile,
      totalOutletsEvaluated: sorted.length,
      outlets: outletSummaries,
    };
  }

  private calculatePercentile(sortedAscendingOrDescending: number[], percentile: number): number {
    const sorted = [...sortedAscendingOrDescending].sort((a, b) => a - b);
    if (sorted.length === 0) return 0;
    if (sorted.length === 1) return sorted[0];

    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (lower === upper) return sorted[lower];
    return Math.round((sorted[lower] * (1 - weight) + sorted[upper] * weight) * 100) / 100;
  }
}

import { Injectable } from '@nestjs/common';
import { RawOutletMetrics } from './outlet-metric.service';
import { OutletNormalisationService } from './outlet-normalisation.service';
import { OutletMetricComparison, OutletNormalisationMode } from '@fitcore/types';

@Injectable()
export class OutletComparisonService {
  constructor(private readonly normalisationService: OutletNormalisationService) {}

  /**
   * Compares selected outlets side-by-side across a specific metric.
   */
  compareOutlets(params: {
    metricKey: string;
    metricLabel: string;
    domain: any;
    unit: string;
    currency?: string;
    mode: OutletNormalisationMode;
    outlets: RawOutletMetrics[];
    selectedOutletIds?: string[];
    valueExtractor: (o: RawOutletMetrics) => { absolute: number; denominator?: number; baseline?: number };
  }): {
    metricKey: string;
    metricLabel: string;
    unit: string;
    normalisationMode: OutletNormalisationMode;
    hasMultiCurrency: boolean;
    outlets: OutletMetricComparison[];
  } {
    const { metricKey, metricLabel, domain, unit, currency, mode, outlets, selectedOutletIds, valueExtractor } = params;

    const filtered = selectedOutletIds && selectedOutletIds.length > 0
      ? outlets.filter((o) => selectedOutletIds.includes(o.outletId))
      : outlets;

    const currencies = Array.from(new Set(filtered.map((o) => o.currency)));
    const hasMultiCurrency = currencies.length > 1;

    const results = filtered.map((o, idx) => {
      const { absolute, denominator = 0, baseline } = valueExtractor(o);
      const norm = this.normalisationService.normalise({
        metricKey,
        absoluteValue: absolute,
        mode,
        denominator,
        previousValue: baseline,
        customUnit: unit,
      });

      return {
        metricKey,
        metricLabel,
        domain,
        outletId: o.outletId,
        outletName: o.outletName,
        outletCode: o.code,
        absoluteValue: absolute,
        normalisedValue: norm.normalisedValue !== null ? norm.normalisedValue : undefined,
        normalisedUnit: norm.normalisedUnit,
        denominator: norm.denominator,
        denominatorLabel: norm.denominatorLabel,
        unit,
        currency: o.currency || currency,
        rank: idx + 1,
        totalComparableOutlets: filtered.length,
        direction: norm.direction,
        dataQuality: norm.dataQuality,
        sampleSizeCaveat: norm.sampleSizeCaveat,
      };
    });

    return {
      metricKey,
      metricLabel,
      unit,
      normalisationMode: mode,
      hasMultiCurrency,
      outlets: results,
    };
  }
}

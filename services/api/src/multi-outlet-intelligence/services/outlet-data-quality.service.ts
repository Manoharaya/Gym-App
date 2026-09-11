import { Injectable } from '@nestjs/common';
import { RawOutletMetrics } from './outlet-metric.service';
import {
  BusinessDataQualityRating,
  BusinessDataFreshness,
} from '@fitcore/types';

export interface OutletQualityAssessment {
  outletId: string;
  rating: BusinessDataQualityRating;
  freshness: BusinessDataFreshness;
  caveats: string[];
}

@Injectable()
export class OutletDataQualityService {
  /**
   * Assesses data quality, freshness, and sample adequacy for each outlet.
   */
  assessOutlet(outlet: RawOutletMetrics): OutletQualityAssessment {
    const caveats: string[] = [];
    let rating: BusinessDataQualityRating = 'HIGH';
    let freshness: BusinessDataFreshness = 'REAL_TIME';

    if (outlet.activeMembers === 0) {
      caveats.push('Zero active members recorded for this outlet.');
      rating = 'INSUFFICIENT_DATA';
    } else if (outlet.activeMembers < 10) {
      caveats.push(`Small active membership base (${outlet.activeMembers} members). Metrics may exhibit high variance.`);
      rating = 'MEDIUM';
    }

    if (outlet.newLeads < 5) {
      caveats.push(`Small lead sample (${outlet.newLeads} leads). Conversion percentage is advisory.`);
      if (rating === 'HIGH') rating = 'MEDIUM';
    }

    if (outlet.grossRevenue === 0 && outlet.activeMembers > 0) {
      caveats.push('No settled revenue transactions recorded for current billing period.');
      if (rating === 'HIGH') rating = 'MEDIUM';
    }

    return {
      outletId: outlet.outletId,
      rating,
      freshness,
      caveats,
    };
  }
}

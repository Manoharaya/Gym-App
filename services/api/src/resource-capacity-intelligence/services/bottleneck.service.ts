import { Injectable } from '@nestjs/common';
import { ResourceBottleneckDto } from '@fitcore/types';

@Injectable()
export class BottleneckDetectionService {
  /**
   * Scans aggregated operational metrics for observable capacity bottlenecks.
   */
  detectBottlenecks(params: {
    classes?: any[];
    rooms?: any[];
    trainers?: any[];
    peakHeatmap?: any;
    observationWindow: string;
  }): ResourceBottleneckDto[] {
    const { classes = [], rooms = [], trainers = [], peakHeatmap, observationWindow } = params;
    const bottlenecks: ResourceBottleneckDto[] = [];

    // 1. CLASS CAPACITY LIMIT & WAITLIST PRESSURE
    for (const c of classes) {
      if (c.fillRate !== null && c.fillRate >= 95) {
        bottlenecks.push({
          id: `btn-class-${c.classSessionId}`,
          type: 'CLASS_CAPACITY_LIMIT',
          severity: c.waitlistCount >= 5 ? 'HIGH' : 'MEDIUM',
          resourceId: c.resourceId,
          resourceName: c.resourceName,
          outletId: c.outletId,
          outletName: c.outletName,
          observation: `Class "${c.className}" at ${c.startsAt} reached ${c.fillRate}% capacity with ${c.waitlistCount} queued waitlist members.`,
          evidence: {
            metricKey: 'resource.class.fill_rate',
            metricLabel: 'Class Fill Rate',
            observedValue: `${c.fillRate}%`,
            thresholdValue: '90%',
            sampleSize: c.sampleSize,
            observationWindow,
          },
          category: 'OBSERVED',
          recommendation: 'Management may review adding an additional parallel section or upgrading to a larger studio.',
          humanDecisionRequired: 'Authorise additional session scheduling or studio reassignment.',
          identifiedAt: new Date().toISOString(),
        });
      } else if (c.fillRate !== null && c.fillRate < 30) {
        bottlenecks.push({
          id: `btn-underfilled-${c.classSessionId}`,
          type: 'LOW_RESOURCE_UTILISATION',
          severity: 'LOW',
          resourceId: c.resourceId,
          resourceName: c.resourceName,
          outletId: c.outletId,
          outletName: c.outletName,
          observation: `Class "${c.className}" achieved only ${c.fillRate}% fill rate (${c.confirmedBookingsCount}/${c.configuredCapacity} seats).`,
          evidence: {
            metricKey: 'resource.class.fill_rate',
            metricLabel: 'Class Fill Rate',
            observedValue: `${c.fillRate}%`,
            thresholdValue: '40%',
            sampleSize: c.sampleSize,
            observationWindow,
          },
          category: 'OBSERVED',
          recommendation: 'Review format appeal, scheduling time slot, or member awareness campaigns.',
          humanDecisionRequired: 'Determine whether to retain, adjust timing, or reformat session.',
          identifiedAt: new Date().toISOString(),
        });
      }
    }

    // 2. ROOM CAPACITY LIMIT & UNDERUTILISATION
    for (const r of rooms) {
      if (r.roomUtilisation !== null && r.roomUtilisation >= 85) {
        bottlenecks.push({
          id: `btn-room-${r.roomId}`,
          type: 'ROOM_CAPACITY_LIMIT',
          severity: 'HIGH',
          resourceId: r.roomId,
          resourceName: r.roomName,
          resourceType: r.roomType,
          outletId: r.outletId,
          outletName: r.outletName,
          observation: `Studio/Room "${r.roomName}" operating at ${r.roomUtilisation}% capacity across ${r.sessionsCount} sessions.`,
          evidence: {
            metricKey: 'resource.room.utilisation',
            metricLabel: 'Room Utilisation',
            observedValue: `${r.roomUtilisation}%`,
            thresholdValue: '80%',
            sampleSize: r.sessionsCount,
            observationWindow,
          },
          category: 'OBSERVED',
          recommendation: 'Review off-peak reallocation or alternate space configuration.',
          humanDecisionRequired: 'Consider facility floor layout optimization or dual-use areas.',
          identifiedAt: new Date().toISOString(),
        });
      } else if (r.roomUtilisation !== null && r.roomUtilisation < 20 && r.sessionsCount >= 5) {
        bottlenecks.push({
          id: `btn-room-underused-${r.roomId}`,
          type: 'LOW_RESOURCE_UTILISATION',
          severity: 'INFO',
          resourceId: r.roomId,
          resourceName: r.roomName,
          resourceType: r.roomType,
          outletId: r.outletId,
          outletName: r.outletName,
          observation: `Studio/Room "${r.roomName}" recorded only ${r.roomUtilisation}% utilization across available operating hours.`,
          evidence: {
            metricKey: 'resource.room.utilisation',
            metricLabel: 'Room Utilisation',
            observedValue: `${r.roomUtilisation}%`,
            thresholdValue: '25%',
            sampleSize: r.sessionsCount,
            observationWindow,
          },
          category: 'OBSERVED',
          recommendation: 'Evaluate hosting specialty clinics, open gym floor access, or personal training reservations.',
          humanDecisionRequired: 'Approve new session programs for underutilised studio hours.',
          identifiedAt: new Date().toISOString(),
        });
      }
    }

    // 3. TRAINER CAPACITY LIMIT & SCHEDULE GAPS
    for (const t of trainers) {
      if (t.combinedUtilisation !== null && t.combinedUtilisation >= 85) {
        bottlenecks.push({
          id: `btn-trainer-limit-${t.trainerId}`,
          type: 'TRAINER_CAPACITY_LIMIT',
          severity: 'HIGH',
          outletId: t.outletId,
          outletName: t.outletName,
          observation: `Trainer ${t.trainerName} operating at ${t.combinedUtilisation}% capacity with ${t.bookedHours} booked hours out of ${t.availableHours} available.`,
          evidence: {
            metricKey: 'resource.trainer.utilisation',
            metricLabel: 'Trainer Utilisation',
            observedValue: `${t.combinedUtilisation}%`,
            thresholdValue: '80%',
            sampleSize: t.sampleSize,
            observationWindow,
          },
          category: 'OBSERVED',
          recommendation: 'Assess coach workload to prevent burnout; consider assigning secondary trainers for new clients.',
          humanDecisionRequired: 'Authorise intake capping or recruitment of additional training staff.',
          identifiedAt: new Date().toISOString(),
        });
      } else if (t.scheduleGapsCount >= 4) {
        bottlenecks.push({
          id: `btn-trainer-gaps-${t.trainerId}`,
          type: 'SCHEDULING_GAP',
          severity: 'LOW',
          outletId: t.outletId,
          outletName: t.outletName,
          observation: `Trainer ${t.trainerName} exhibits ${t.scheduleGapsCount} fragmented idle gaps between scheduled sessions.`,
          evidence: {
            metricKey: 'resource.trainer.schedule_gaps',
            metricLabel: 'Schedule Gaps',
            observedValue: `${t.scheduleGapsCount} gaps`,
            thresholdValue: '3 gaps',
            sampleSize: t.sampleSize,
            observationWindow,
          },
          category: 'DERIVED',
          recommendation: 'Encourage consolidated client booking blocks to reduce fragmented idle shifts.',
          humanDecisionRequired: 'Review trainer shift scheduling and consultation booking templates.',
          identifiedAt: new Date().toISOString(),
        });
      }
    }

    // 4. PEAK TIME CONGESTION
    if (peakHeatmap?.slots) {
      const veryHighSlots = peakHeatmap.slots.filter((s: any) => s.demandLevel === 'VERY_HIGH');
      if (veryHighSlots.length >= 3) {
        bottlenecks.push({
          id: `btn-peak-congestion`,
          type: 'PEAK_TIME_CONGESTION',
          severity: 'MEDIUM',
          outletId: peakHeatmap.outletId,
          observation: `${veryHighSlots.length} hourly time slots consistently operate at peak capacity saturation.`,
          evidence: {
            metricKey: 'resource.peak_hour.utilisation',
            metricLabel: 'Peak Hour Saturation',
            observedValue: `${veryHighSlots.length} saturated hours`,
            thresholdValue: '2 saturated hours',
            sampleSize: peakHeatmap.slots.length,
            observationWindow,
          },
          category: 'DERIVED',
          recommendation: 'Incentivise off-peak workout windows or stagger evening group fitness class start times.',
          humanDecisionRequired: 'Review timetable scheduling shifts to alleviate peak entrance and locker congestion.',
          identifiedAt: new Date().toISOString(),
        });
      }
    }

    return bottlenecks;
  }
}

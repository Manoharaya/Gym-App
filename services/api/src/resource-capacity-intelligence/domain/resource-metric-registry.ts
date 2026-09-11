import { Injectable } from '@nestjs/common';
import { ResourceMetricDefinitionDto } from '@fitcore/types';

@Injectable()
export class ResourceMetricRegistry {
  private readonly registry: Map<string, ResourceMetricDefinitionDto> = new Map();

  constructor() {
    this.registerMetrics();
  }

  private register(def: ResourceMetricDefinitionDto) {
    this.registry.set(def.metricKey, def);
  }

  public get(key: string): ResourceMetricDefinitionDto | undefined {
    return this.registry.get(key);
  }

  public list(): ResourceMetricDefinitionDto[] {
    return Array.from(this.registry.values());
  }

  private registerMetrics() {
    this.register({
      metricKey: 'resource.overall_utilisation',
      name: 'Overall Resource Utilisation',
      domain: 'RESOURCES',
      definition: 'Percentage of total operational time or capacity during which resources are booked.',
      formula: '(Booked Capacity-Hours / Available Capacity-Hours) * 100',
      numerator: 'Booked Capacity-Hours',
      denominator: 'Available Capacity-Hours',
      source: 'Resource, ClassSession, Booking',
      timeWindow: 'Configurable (Daily, 7d, 30d, Monthly)',
      unit: 'PERCENTAGE',
      minimumSample: 10,
      zeroDenominatorBehaviour: 'NOT_COMPARABLE',
      dataQualityRules: 'Requires valid configured capacity and operational schedules.',
      interpretation: 'Values between 65% and 85% represent healthy balanced resource allocation.',
      knownLimitations: 'Assumes uniform booking duration unless actual timestamps are tracked.',
    });

    this.register({
      metricKey: 'resource.trainer.utilisation',
      name: 'Trainer Utilisation',
      domain: 'TRAINING',
      definition: 'Ratio of hours spent delivering PT or scheduled classes relative to total available working hours.',
      formula: '((PT Booked Hours + Class Booked Hours) / Available Working Hours) * 100',
      numerator: 'Delivered / Booked Training Hours',
      denominator: 'Available Working Hours (excluding leave/blockout)',
      source: 'TrainerProfile, TrainerAvailability, PersonalTrainingSession, ClassSession',
      timeWindow: 'Configurable',
      unit: 'PERCENTAGE',
      minimumSample: 5,
      zeroDenominatorBehaviour: 'NOT_COMPARABLE',
      dataQualityRules: 'Trainer must have explicit recurring availability or scheduled shifts configured.',
      interpretation: 'High utilisation (> 80%) suggests potential burnout or lack of booking slots; low (< 40%) suggests excess idle capacity.',
      knownLimitations: 'Does not measure administrative or preparation time outside scheduled sessions.',
    });

    this.register({
      metricKey: 'resource.room.utilisation',
      name: 'Room & Studio Utilisation',
      domain: 'RESOURCES',
      definition: 'Percentage of operating studio hours occupied by active classes or workshops.',
      formula: '(Occupied Studio Hours / Available Operating Hours) * 100',
      numerator: 'Occupied Studio Hours',
      denominator: 'Available Studio Operating Hours',
      source: 'Resource, ClassSession',
      timeWindow: 'Configurable',
      unit: 'PERCENTAGE',
      minimumSample: 10,
      zeroDenominatorBehaviour: 'NOT_COMPARABLE',
      dataQualityRules: 'Resource must be marked ACTIVE with configured operating hours.',
      interpretation: 'Identifies studio bottlenecks during peak windows versus underutilized open floor time.',
      knownLimitations: 'Does not account for non-scheduled informal member usage.',
    });

    this.register({
      metricKey: 'resource.class.fill_rate',
      name: 'Class Booking Fill Rate',
      domain: 'BOOKINGS',
      definition: 'Proportion of scheduled class capacity claimed by confirmed member bookings.',
      formula: '(Confirmed Bookings / Configured Class Capacity) * 100',
      numerator: 'Confirmed Bookings Count',
      denominator: 'Configured Class Capacity',
      source: 'ClassSession, Booking',
      timeWindow: 'Configurable',
      unit: 'PERCENTAGE',
      minimumSample: 5,
      zeroDenominatorBehaviour: 'NOT_COMPARABLE',
      dataQualityRules: 'Configured capacity must be greater than zero.',
      interpretation: 'Measures booking demand velocity prior to class commencement.',
      knownLimitations: 'Does not reflect whether members physically attended (see Attendance Utilisation).',
    });

    this.register({
      metricKey: 'resource.class.attendance_utilisation',
      name: 'Class Attendance Utilisation',
      domain: 'ATTENDANCE',
      definition: 'Actual physical attendance relative to configured studio class capacity.',
      formula: '(Checked-in Members / Configured Class Capacity) * 100',
      numerator: 'Checked-in Members Count',
      denominator: 'Configured Class Capacity',
      source: 'ClassSession, AttendanceRecord',
      timeWindow: 'Configurable',
      unit: 'PERCENTAGE',
      minimumSample: 5,
      zeroDenominatorBehaviour: 'NOT_COMPARABLE',
      dataQualityRules: 'Attendance records must be synced from physical gates or instructor apps.',
      interpretation: 'Reveals true operational space efficiency after no-shows and cancellations.',
      knownLimitations: 'Late check-ins or manual instructor overrides may introduce slight latency.',
    });

    this.register({
      metricKey: 'resource.class.waitlist_pressure',
      name: 'Waitlist Pressure Rate',
      domain: 'BOOKINGS',
      definition: 'Proportion of class sessions that reached maximum capacity and queued members on waitlists.',
      formula: '(Sessions with Waitlists / Total Scheduled Sessions) * 100',
      numerator: 'Waitlisted Sessions Count',
      denominator: 'Total Scheduled Sessions Count',
      source: 'ClassSession, WaitlistEntry',
      timeWindow: 'Configurable',
      unit: 'PERCENTAGE',
      minimumSample: 5,
      zeroDenominatorBehaviour: 'NOT_COMPARABLE',
      dataQualityRules: 'Booking policy must permit waitlisting.',
      interpretation: 'Signals unmet member demand for specific time slots, formats, or instructors.',
      knownLimitations: 'Waitlist entries may cancel before class without spot promotion.',
    });

    this.register({
      metricKey: 'resource.peak_hour.utilisation',
      name: 'Peak-Hour Utilisation',
      domain: 'RESOURCES',
      definition: 'Average capacity utilization during an outlet\'s top demand hourly windows.',
      formula: '(Peak Hour Utilised Capacity / Peak Hour Available Capacity) * 100',
      numerator: 'Peak Capacity Claimed',
      denominator: 'Peak Capacity Available',
      source: 'ClassSession, Booking, AttendanceRecord',
      timeWindow: 'Configurable',
      unit: 'PERCENTAGE',
      minimumSample: 10,
      zeroDenominatorBehaviour: 'NOT_COMPARABLE',
      dataQualityRules: 'Requires timezone-normalized local business timestamps.',
      interpretation: 'Direct indicator of peak congestion pressure (e.g. 17:00–19:00 weekdays).',
      knownLimitations: 'Local holidays or seasonal shifts may alter peak window distributions.',
    });

    this.register({
      metricKey: 'resource.equipment.utilisation',
      name: 'Equipment Utilisation Rate',
      domain: 'RESOURCES',
      definition: 'Frequency and duration of bookable or monitored equipment in active sessions.',
      formula: '(Booked Equipment Hours / Total Available Hours) * 100',
      numerator: 'Booked Equipment Hours',
      denominator: 'Available Operating Hours',
      source: 'Resource, ClassSession',
      timeWindow: 'Configurable',
      unit: 'PERCENTAGE',
      minimumSample: 5,
      zeroDenominatorBehaviour: 'INSUFFICIENT_DATA',
      dataQualityRules: 'Equipment must be explicitly defined and scheduled as a bookable resource.',
      interpretation: 'Informs maintenance rotations and equipment expansion planning.',
      knownLimitations: 'General gym floor machines without reservation telemetry report INSUFFICIENT_DATA.',
    });
  }
}

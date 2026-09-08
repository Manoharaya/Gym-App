import { Injectable } from '@nestjs/common';
import {
  WearableProviderType,
  WearableProviderInfo,
  WearableCapability,
  HealthDataType,
} from '@fitcore/types';

@Injectable()
export class WearableCapabilitiesRegistry {
  private readonly providers: Map<WearableProviderType, WearableProviderInfo> = new Map();

  constructor() {
    this.registerProviders();
  }

  private registerProviders(): void {
    // Wave 1: Apple Health / HealthKit
    this.providers.set('APPLE_HEALTH', {
      provider: 'APPLE_HEALTH',
      name: 'Apple Health',
      description:
        'Synchronize activity, steps, workouts, heart rate, and sleep directly from Apple Health and Apple Watch.',
      isEnabled: true,
      wave: 1,
      authType: 'NATIVE_SDK',
      requiredPermissions: [
        'HKQuantityTypeIdentifierStepCount',
        'HKQuantityTypeIdentifierDistanceWalkingRunning',
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        'HKQuantityTypeIdentifierHeartRate',
        'HKQuantityTypeIdentifierRestingHeartRate',
        'HKCategoryTypeIdentifierSleepAnalysis',
        'HKWorkoutTypeIdentifier',
        'HKQuantityTypeIdentifierBodyMass',
      ],
      privacyNotice:
        'FitCore reads health telemetry from your iOS device. Data is processed strictly for training analytics and never shared without your consent.',
      capabilities: [
        {
          dataType: 'STEPS',
          readSupported: true,
          writeSupported: false,
          unit: 'steps',
          description: 'Daily step counts from iPhone and Apple Watch',
        },
        {
          dataType: 'DISTANCE',
          readSupported: true,
          writeSupported: false,
          unit: 'km',
          description: 'Walking and running distance',
        },
        {
          dataType: 'ACTIVE_CALORIES',
          readSupported: true,
          writeSupported: false,
          unit: 'kcal',
          description: 'Active energy burned throughout the day',
        },
        {
          dataType: 'HEART_RATE',
          readSupported: true,
          writeSupported: false,
          unit: 'bpm',
          description: 'Continuous heart rate readings',
        },
        {
          dataType: 'RESTING_HEART_RATE',
          readSupported: true,
          writeSupported: false,
          unit: 'bpm',
          description: 'Daily resting heart rate average',
        },
        {
          dataType: 'SLEEP',
          readSupported: true,
          writeSupported: false,
          unit: 'minutes',
          description: 'Sleep duration and sleep stage breakdown',
        },
        {
          dataType: 'WORKOUT',
          readSupported: true,
          writeSupported: true,
          unit: 'count',
          description: 'Recorded workout sessions and exertion',
        },
        {
          dataType: 'WEIGHT',
          readSupported: true,
          writeSupported: false,
          unit: 'kg',
          description: 'Body mass telemetry',
        },
      ],
    });

    // Wave 1: Google Health Connect
    this.providers.set('GOOGLE_HEALTH_CONNECT', {
      provider: 'GOOGLE_HEALTH_CONNECT',
      name: 'Google Health Connect',
      description:
        'Secure on-device health data synchronization across Android devices and Wear OS smartwatches.',
      isEnabled: true,
      wave: 1,
      authType: 'NATIVE_SDK',
      requiredPermissions: [
        'android.permission.health.READ_STEPS',
        'android.permission.health.READ_DISTANCE',
        'android.permission.health.READ_TOTAL_CALORIES_BURNED',
        'android.permission.health.READ_HEART_RATE',
        'android.permission.health.READ_RESTING_HEART_RATE',
        'android.permission.health.READ_SLEEP',
        'android.permission.health.READ_EXERCISE',
        'android.permission.health.READ_WEIGHT',
      ],
      privacyNotice:
        'Android Health Connect gives you full control over permissions. FitCore reads approved activity metrics locally on your device.',
      capabilities: [
        {
          dataType: 'STEPS',
          readSupported: true,
          writeSupported: false,
          unit: 'steps',
          description: 'Step counts aggregated by Android Health Connect',
        },
        {
          dataType: 'DISTANCE',
          readSupported: true,
          writeSupported: false,
          unit: 'km',
          description: 'Cumulative walking and running distance',
        },
        {
          dataType: 'ACTIVE_CALORIES',
          readSupported: true,
          writeSupported: false,
          unit: 'kcal',
          description: 'Active calories burned during movement and exercise',
        },
        {
          dataType: 'HEART_RATE',
          readSupported: true,
          writeSupported: false,
          unit: 'bpm',
          description: 'Heart rate telemetry samples',
        },
        {
          dataType: 'RESTING_HEART_RATE',
          readSupported: true,
          writeSupported: false,
          unit: 'bpm',
          description: 'Resting heart rate estimates',
        },
        {
          dataType: 'SLEEP',
          readSupported: true,
          writeSupported: false,
          unit: 'minutes',
          description: 'Sleep duration and sleep session intervals',
        },
        {
          dataType: 'WORKOUT',
          readSupported: true,
          writeSupported: false,
          unit: 'count',
          description: 'Exercise sessions recorded by compatible apps',
        },
        {
          dataType: 'WEIGHT',
          readSupported: true,
          writeSupported: false,
          unit: 'kg',
          description: 'Body weight logs',
        },
      ],
    });

    // Wave 1: Fitbit
    this.providers.set('FITBIT', {
      provider: 'FITBIT',
      name: 'Fitbit',
      description:
        'Cloud-to-cloud integration with Fitbit activity trackers, smartwatches, and the Fitbit Web API.',
      isEnabled: true,
      wave: 1,
      authType: 'OAUTH2',
      requiredPermissions: ['activity', 'heartrate', 'sleep', 'weight', 'profile'],
      privacyNotice:
        'FitCore securely connects to your Fitbit account using OAuth 2.0 PKCE. Your credentials are encrypted and never stored in plain text.',
      capabilities: [
        {
          dataType: 'STEPS',
          readSupported: true,
          writeSupported: false,
          unit: 'steps',
          description: 'Daily step totals from Fitbit devices',
        },
        {
          dataType: 'DISTANCE',
          readSupported: true,
          writeSupported: false,
          unit: 'km',
          description: 'Distance tracked across activities',
        },
        {
          dataType: 'ACTIVE_CALORIES',
          readSupported: true,
          writeSupported: false,
          unit: 'kcal',
          description: 'Fitbit active calories burned',
        },
        {
          dataType: 'HEART_RATE',
          readSupported: true,
          writeSupported: false,
          unit: 'bpm',
          description: 'Fitbit continuous heart rate samples',
        },
        {
          dataType: 'RESTING_HEART_RATE',
          readSupported: true,
          writeSupported: false,
          unit: 'bpm',
          description: 'Fitbit resting heart rate daily metric',
        },
        {
          dataType: 'SLEEP',
          readSupported: true,
          writeSupported: false,
          unit: 'minutes',
          description: 'Fitbit sleep duration and sleep score',
        },
        {
          dataType: 'WORKOUT',
          readSupported: true,
          writeSupported: false,
          unit: 'count',
          description: 'Fitbit tracked workout and exercise logs',
        },
        {
          dataType: 'WEIGHT',
          readSupported: true,
          writeSupported: false,
          unit: 'kg',
          description: 'Fitbit scale and manual weight logs',
        },
      ],
    });

    // Wave 2: Future Extension Points (Disabled/Unimplemented)
    this.providers.set('GARMIN', {
      provider: 'GARMIN',
      name: 'Garmin Connect',
      description: 'Garmin Health API integration for multi-sport athletes (Wave 2).',
      isEnabled: false,
      wave: 2,
      authType: 'OAUTH2',
      requiredPermissions: [],
      privacyNotice: 'Coming soon in Wave 2.',
      capabilities: [],
    });

    this.providers.set('WHOOP', {
      provider: 'WHOOP',
      name: 'WHOOP',
      description: 'WHOOP recovery, sleep performance, and strain integration (Wave 2).',
      isEnabled: false,
      wave: 2,
      authType: 'OAUTH2',
      requiredPermissions: [],
      privacyNotice: 'Coming soon in Wave 2.',
      capabilities: [],
    });

    this.providers.set('OURA', {
      provider: 'OURA',
      name: 'Oura Ring',
      description: 'Oura smart ring readiness, sleep, and activity tracking (Wave 2).',
      isEnabled: false,
      wave: 2,
      authType: 'OAUTH2',
      requiredPermissions: [],
      privacyNotice: 'Coming soon in Wave 2.',
      capabilities: [],
    });
  }

  getAllProviders(): WearableProviderInfo[] {
    return Array.from(this.providers.values());
  }

  getEnabledProviders(): WearableProviderInfo[] {
    return Array.from(this.providers.values()).filter((p) => p.isEnabled);
  }

  getProvider(provider: WearableProviderType): WearableProviderInfo | undefined {
    return this.providers.get(provider);
  }

  isProviderSupported(provider: WearableProviderType): boolean {
    const p = this.providers.get(provider);
    return !!p && p.isEnabled;
  }

  getProviderCapabilities(provider: WearableProviderType): WearableCapability[] {
    return this.providers.get(provider)?.capabilities || [];
  }

  supportsDataType(provider: WearableProviderType, dataType: HealthDataType): boolean {
    const p = this.providers.get(provider);
    if (!p || !p.isEnabled) return false;
    return p.capabilities.some((c) => c.dataType === dataType && c.readSupported);
  }
}

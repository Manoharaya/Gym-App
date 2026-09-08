import { Injectable, Logger } from '@nestjs/common';
import { DailyCheckInAIContext } from '../domain/daily-checkin.types';
import {
  DailyRecommendationType,
  DailyReadinessCategory,
  SorenessLevel,
  EnergyLevel,
} from '../domain/daily-checkin.enums';
import { DailyRecommendationItem } from '@fitcore/types';

@Injectable()
export class DailyCheckInRecommendationService {
  private readonly logger = new Logger(DailyCheckInRecommendationService.name);

  /**
   * Builds conservative, grounded recommendations based on member context and readiness.
   * Ensures maximum 3-5 items and protects trainer-assigned programs.
   */
  generateGroundedRecommendations(context: DailyCheckInAIContext): DailyRecommendationItem[] {
    const recommendations: DailyRecommendationItem[] = [];
    const { trainingSummary, currentCheckInResponses, deterministicReadiness } = context;

    // 1. Recovery recommendation if soreness is high or readiness is recovery-focused
    if (
      currentCheckInResponses.sorenessLevel === SorenessLevel.HIGH ||
      currentCheckInResponses.sorenessLevel === SorenessLevel.VERY_HIGH ||
      deterministicReadiness.category === DailyReadinessCategory.RECOVERY_FOCUSED
    ) {
      recommendations.push({
        type: DailyRecommendationType.RECOVERY,
        title: 'Dynamic Warm-Up & Active Recovery Focus',
        explanation:
          'Your reported muscular soreness is elevated today. Prioritize an extended warm-up, focus on mobility, and keep loads conservative rather than pushing for personal records.',
        priority: 'HIGH',
        relatedDomain: 'RECOVERY',
        suggestedAction: {
          action: 'VIEW_WORKOUT',
          label: 'View Mobility Options',
        },
      });
    }

    // 2. Training recommendation based on scheduled workout
    if (trainingSummary.todayWorkout) {
      if (deterministicReadiness.category === DailyReadinessCategory.OPTIMAL) {
        recommendations.push({
          type: DailyRecommendationType.TRAINING,
          title: `Execute Scheduled Session: ${trainingSummary.todayWorkout.title}`,
          explanation:
            'Your reported energy and recovery levels support today\'s planned training. Maintain prescribed set and rep targets.',
          priority: 'HIGH',
          relatedDomain: 'TRAINING',
          suggestedAction: {
            action: 'VIEW_WORKOUT',
            label: 'Start Today\'s Workout',
            params: { workoutId: trainingSummary.todayWorkout.id },
          },
        });
      } else if (deterministicReadiness.category === DailyReadinessCategory.MODERATE) {
        recommendations.push({
          type: DailyRecommendationType.TRAINING,
          title: `Paced Session: ${trainingSummary.todayWorkout.title}`,
          explanation:
            'Complete your planned session at a steady, moderate pace. Ensure full recovery between working sets.',
          priority: 'MEDIUM',
          relatedDomain: 'TRAINING',
          suggestedAction: {
            action: 'VIEW_WORKOUT',
            label: 'Review Session Plan',
            params: { workoutId: trainingSummary.todayWorkout.id },
          },
        });
      }
    } else if (trainingSummary.hasActivePlan && !trainingSummary.todayWorkout) {
      recommendations.push({
        type: DailyRecommendationType.RECOVERY,
        title: 'Active Recovery Day',
        explanation:
          'No workout is scheduled for today in your active plan. Focus on gentle movement, light stretching, or outdoor walking.',
        priority: 'LOW',
        relatedDomain: 'RECOVERY',
      });
    }

    // 3. Consistency recommendation if yesterday was missed
    if (currentCheckInResponses.yesterdayWorkoutCompleted === false) {
      recommendations.push({
        type: DailyRecommendationType.CONSISTENCY,
        title: 'Consistency Focus',
        explanation:
          'You missed yesterday\'s planned session. If your schedule allows, consider completing it today without attempting to double your overall volume.',
        priority: 'MEDIUM',
        relatedDomain: 'TRAINING',
        suggestedAction: {
          action: 'VIEW_WORKOUT',
          label: 'View Workout Calendar',
        },
      });
    }

    // 4. Hydration & Nutrition awareness
    recommendations.push({
      type: DailyRecommendationType.HYDRATION,
      title: 'Prioritize Daily Hydration',
      explanation:
        'Consistent water intake across the day assists muscular recovery and energy regulation.',
      priority: 'MEDIUM',
      relatedDomain: 'NUTRITION',
      suggestedAction: {
        action: 'VIEW_NUTRITION',
        label: 'Log Water Intake',
      },
    });

    // 5. Trainer Protection / Support Guidance
    if (trainingSummary.isTrainerAssigned) {
      if (
        currentCheckInResponses.sorenessLevel === SorenessLevel.HIGH ||
        currentCheckInResponses.energyLevel === EnergyLevel.VERY_LOW
      ) {
        recommendations.push({
          type: DailyRecommendationType.SUPPORT,
          title: 'Discuss Adjustments with Your Trainer',
          explanation:
            'Your trainer has assigned your programming. If fatigue or soreness persists, discuss adjusting upcoming session volume with them before modifying exercises.',
          priority: 'HIGH',
          relatedDomain: 'TRAINING',
          suggestedAction: {
            action: 'VIEW_COACH',
            label: 'Trainer Overview',
          },
        });
      }
    }

    // Limit to maximum 4 primary recommendations
    return recommendations.slice(0, 4);
  }
}

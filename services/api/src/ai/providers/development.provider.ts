import { Injectable, Logger } from '@nestjs/common';
import { AIProviderRequest, AIProviderResponse } from '@fitcore/types';
import { AIProviderAdapter } from './ai-provider.interface';

@Injectable()
export class DevelopmentAIProvider implements AIProviderAdapter {
  readonly providerName = 'DEVELOPMENT';
  private readonly logger = new Logger(DevelopmentAIProvider.name);

  async generate(request: AIProviderRequest): Promise<AIProviderResponse> {
    const startTime = Date.now();
    this.logger.debug(`[DevelopmentAIProvider] Generating response for model ${request.model}`);

    // Estimate input tokens from messages
    const inputContent = request.messages.map((m) => m.content).join(' ') + (request.systemInstruction || '');
    const inputTokens = Math.max(10, Math.ceil(inputContent.length / 4));

    let content = '';
    let structuredOutput: any = null;

    if (request.responseFormat === 'json' || request.outputSchema) {
      // Return deterministic schema-valid response
      structuredOutput = this.generateDeterministicJson(request.outputSchema, inputContent);
      content = JSON.stringify(structuredOutput);
    } else {
      content = `[Development AI Response] Processed ${request.messages.length} messages using model ${request.model}. Analysis completed successfully.`;
    }

    const outputTokens = Math.max(15, Math.ceil(content.length / 4));
    const latencyMs = Math.max(5, Date.now() - startTime);

    return {
      provider: 'DEVELOPMENT',
      model: request.model,
      content,
      structuredOutput,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      finishReason: 'STOP',
      latencyMs,
      providerRequestId: `dev_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    };
  }

  async checkHealth(): Promise<'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE'> {
    return 'AVAILABLE';
  }

  private generateDeterministicJson(schema?: Record<string, any>, contextText: string = ''): Record<string, any> {
    if (!schema) {
      return {
        status: 'SUCCESS',
        message: 'Development provider processed structured request',
        confidence: 0.98,
      };
    }

    // Check if this is the FitnessCoachResponse schema
    if (schema.properties?.insights && schema.properties?.recommendations && schema.properties?.message) {
      return this.generateFitnessCoachJson(contextText);
    }

    const result: Record<string, any> = {};
    const properties = schema.properties || {};

    for (const [key, prop] of Object.entries<any>(properties)) {
      if (prop.type === 'string') {
        result[key] = `Deterministic ${key} value`;
      } else if (prop.type === 'number' || prop.type === 'integer') {
        result[key] = prop.minimum ?? 1;
      } else if (prop.type === 'boolean') {
        result[key] = true;
      } else if (prop.type === 'array') {
        if (prop.items?.type === 'string') {
          result[key] = [`Item 1 for ${key}`, `Item 2 for ${key}`];
        } else if (prop.items?.properties) {
          result[key] = [
            this.generateDeterministicJson({ properties: prop.items.properties }),
          ];
        } else {
          result[key] = [`Item 1 for ${key}`, `Item 2 for ${key}`];
        }
      } else if (prop.type === 'object') {
        result[key] = prop.properties ? this.generateDeterministicJson({ properties: prop.properties }) : { detail: `Sub-object for ${key}` };
      } else {
        result[key] = `Value for ${key}`;
      }
    }

    return result;
  }

  private generateFitnessCoachJson(contextText: string): Record<string, any> {
    const isTrainerAssigned = contextText.includes('trainer') || contextText.includes('prescribed by your trainer');
    const hasWorkouts = contextText.includes('"recentWorkouts":[') && !contextText.includes('"recentWorkouts":[]');
    const hasGoals = contextText.includes('"goals":[') && !contextText.includes('"goals":[]');
    const hasStreak = contextText.includes('"streak":');

    let message = 'Here is your personalized training analysis grounded in your FitCore activity.';
    const insights: any[] = [];
    const recommendations: any[] = [];
    const suggestedActions: any[] = [
      {
        action: 'VIEW_WORKOUT',
        label: 'View Workouts',
        parameters: {},
      },
    ];

    if (contextText.includes('"recentWorkouts":[]') || contextText.includes('no completed workouts') || contextText.includes('empty workout')) {
      message = "I don't have enough recorded activity to determine that. You currently have 0 completed workouts recorded in your training history.";
      insights.push({
        type: 'ACTIVITY_DATA',
        title: 'No Recorded Workouts',
        description: 'No completed workouts were found in your recent activity log.',
        confidence: 1.0,
      });
      recommendations.push({
        title: 'Complete Your First Workout',
        description: 'Log a session or attend a class to establish your baseline.',
        rationale: 'Training recommendations require recorded performance data.',
        priority: 'HIGH',
        type: 'CONSISTENCY',
      });
    } else if (hasWorkouts) {
      // Extract workout titles if possible
      const workoutMatches = Array.from(contextText.matchAll(/"title":"([^"]+)"/g)).map((m) => m[1]);
      const uniqueWorkouts = Array.from(new Set(workoutMatches));

      message = uniqueWorkouts.length > 0
        ? `Based on your recorded sessions, you recently completed: ${uniqueWorkouts.join(', ')}.`
        : 'Based on your recent workout sessions recorded in FitCore, your training adherence is strong.';

      insights.push({
        type: 'WORKOUT_HISTORY',
        title: 'Recent Training Activity',
        description: uniqueWorkouts.length > 0 ? `Completed: ${uniqueWorkouts.join(', ')}` : 'Recorded workouts verified.',
        confidence: 0.96,
      });

      recommendations.push({
        title: 'Maintain Progressive Overload',
        description: 'Aim for a 2-5% volume progression in your next assigned session.',
        rationale: 'Consistent progressive tension drives neuromuscular adaptation.',
        priority: 'MEDIUM',
        type: 'TRAINING',
      });
    }

    if (hasGoals) {
      insights.push({
        type: 'GOAL_PROGRESS',
        title: 'Goal On Track',
        description: 'Your active training goals show consistent milestone adherence.',
        confidence: 0.94,
      });
      suggestedActions.push({
        action: 'VIEW_GOAL',
        label: 'Review Goal Progress',
        parameters: {},
      });
    }

    if (hasStreak) {
      insights.push({
        type: 'ENGAGEMENT_STREAK',
        title: 'Active Consistency Streak',
        description: 'Your attendance streak confirms positive habit reinforcement.',
        confidence: 0.98,
      });
    }

    if (isTrainerAssigned) {
      recommendations.push({
        title: 'Consult Your Trainer',
        description: 'Your trainer prescribed this plan. I can explain the biomechanics or suggest questions for your next session.',
        rationale: 'Trainer programming integrity is protected.',
        priority: 'HIGH',
        type: 'WORKOUT_EXECUTION',
      });
    }

    return {
      message,
      summary: 'Grounded training review based on verified member context.',
      insights: insights.length > 0 ? insights : [
        {
          type: 'TRAINING_OVERVIEW',
          title: 'Training Foundation',
          description: 'Verified member training profile.',
          confidence: 0.9,
        },
      ],
      recommendations: recommendations.length > 0 ? recommendations : [
        {
          title: 'Stay Consistent',
          description: 'Follow your scheduled sessions and log performance after each set.',
          rationale: 'Regular adherence optimizes physical adaptations.',
          priority: 'MEDIUM',
          type: 'CONSISTENCY',
        },
      ],
      cautions: [
        'FitCore AI provides fitness guidance only and is not a substitute for qualified medical advice.',
      ],
      suggestedActions,
      followUpQuestion: 'Would you like to review your upcoming scheduled workouts or check your current streak?',
    };
  }
}

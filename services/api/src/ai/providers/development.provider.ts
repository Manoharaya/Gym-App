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
    const userPrompt = request.messages.find((m) => m.role === 'user')?.content || '';

    if (request.responseFormat === 'json' || request.outputSchema) {
      // Return deterministic schema-valid response
      structuredOutput = this.generateDeterministicJson(request.outputSchema, inputContent, userPrompt);
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

  private generateDeterministicJson(
    schema?: Record<string, any>,
    contextText: string = '',
    userPrompt: string = '',
  ): Record<string, any> {
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

    // Check if this is the NutritionCoachResponse schema
    if (schema.properties?.answer && schema.properties?.mealSuggestions && schema.properties?.recommendations) {
      return this.generateNutritionCoachJson(contextText, userPrompt);
    }

    // Check if this is the ParsedFoodLogProposal schema
    if (schema.properties?.items && schema.properties?.totalCalories && schema.properties?.requiresConfirmation) {
      return this.generateParsedFoodLogJson(contextText);
    }

    // Check if this is the DailyCheckInResponse schema
    if (schema.properties?.checkInInterpretation && schema.properties?.readinessFraming && schema.properties?.todayFocus) {
      return this.generateDailyCheckInJson(contextText, userPrompt);
    }

    // Check if this is the WearableIntelligenceResponse schema
    if (schema.properties?.recoveryInterpretation && schema.properties?.trainingGuidance && schema.properties?.dataHighlights) {
      return this.generateWearableIntelligenceJson(contextText, userPrompt);
    }

    // Check if this is the RetentionIntelligenceResponse schema
    if (schema.properties?.recommendedInterventions && schema.properties?.primaryFactors && schema.properties?.positiveSignals) {
      return this.generateRetentionIntelligenceJson(contextText, userPrompt);
    }

    // Check if this is the RetentionAgent schema
    if (schema.properties?.messageDraft && schema.properties?.recommendedTiming && schema.properties?.recommendedIntervention) {
      return this.generateRetentionAgentJson(contextText, userPrompt);
    }

    // Check if this is the ReactivationIntelligenceResponse schema
    if (schema.properties?.recommendedStrategies && schema.properties?.inactivity && schema.properties?.reactivation) {
      return this.generateReactivationIntelligenceJson(contextText, userPrompt);
    }

    // Check if this is the ReceptionistResponse schema
    if (schema.properties?.requiresClarification && schema.properties?.citations && schema.properties?.handoffRecommended) {
      return this.generateReceptionistJson(contextText, userPrompt);
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

  private generateNutritionCoachJson(contextText: string, userPrompt: string = ''): Record<string, any> {
    const isTargetChangeRequest = /change\s+(my\s+)?(calorie|protein|macro|target)|modify\s+(my\s+)?target|set\s+(my\s+)?target\s+to/i.test(userPrompt);
    const isMealPlanChangeRequest = /change\s+(my\s+)?(meal\s+plan|meal)|modify\s+(my\s+)?(meal\s+plan)|delete\s+(my\s+)?meal/i.test(userPrompt);
    const isAllergyBypass = /ignore\s+(.*?)my\s+(peanut\s+)?(allergy|allergies)|bypass\s+(my\s+)?allergy/i.test(userPrompt);
    const hasChickenAlternative = /instead\s+of\s+chicken|substitute\s+for\s+chicken|alternative(s)?\s+to\s+chicken/i.test(userPrompt);
    const isProteinInquiry = /how\s+much\s+protein|protein\s+target|protein\s+intake/i.test(userPrompt);
    const isPreWorkoutInquiry = /before\s+(my\s+)?(workout|training)|pre-workout/i.test(userPrompt);
    const hasEmptyLogs = contextText.includes('"foodLogs":[]') || contextText.includes('"recentFoodLogs":[]') || userPrompt.includes('no food logs') || /breakfast|lunch|dinner|ate|eat/i.test(userPrompt) && contextText.includes('"recentFoodLogs":[]');
    const hasNoMealPlan = contextText.includes('"assignedMealPlan":null') || contextText.includes('"hasAssignedMealPlan":false');
    const hasNoTarget = contextText.includes('"activeTarget":null') || contextText.includes('"hasActiveTarget":false');

    // Detect known allergies in context
    const allergies: string[] = [];
    if (/peanut/i.test(contextText)) allergies.push('peanut');
    if (/dairy|milk|lactose/i.test(contextText)) allergies.push('dairy');
    if (/gluten|wheat/i.test(contextText)) allergies.push('gluten');
    if (/shellfish/i.test(contextText)) allergies.push('shellfish');
    if (/fish/i.test(contextText)) allergies.push('fish');
    if (/egg/i.test(contextText)) allergies.push('egg');

    let answer = 'Here is your personalized nutrition analysis grounded in your FitCore nutrition data. Your recorded daily intake and macro adherence are verified.';
    let responseType = 'EXPLANATION';
    const recommendations: any[] = [];
    const mealSuggestions: any[] = [];
    const foodAlternatives: any[] = [];
    const warnings: any[] = [];
    const followUpQuestions: any[] = [];

    // Allergy bypass defense
    if (isAllergyBypass) {
      answer = 'I cannot ignore or bypass your allergy profile under any circumstances. Safety rules strictly prohibit recommending any foods that violate your documented allergies.';
      responseType = 'SAFETY_INTERVENTION';
      warnings.push('Allergy protection is permanently active and cannot be overridden.');
      return {
        answer,
        responseType,
        confidence: 'HIGH',
        groundedSources: ['NUTRITION_PROFILE'],
        recommendations,
        mealSuggestions,
        foodAlternatives,
        warnings,
        followUpQuestions: ['Would you like to explore allergen-safe alternatives instead?'],
        requiresProfessionalReview: false,
      };
    }

    // Autonomous target change protection
    if (isTargetChangeRequest) {
      answer = 'I cannot automatically modify your nutrition targets. As an AI coach, I provide educational guidance and suggestions, but target adjustments must be made directly by you or your trainer in the Nutrition Target settings.';
      recommendations.push({
        type: 'TARGET_EDUCATION',
        title: 'Discuss Target Adjustments',
        description: 'You can adjust your calorie and macronutrient targets in your profile settings or discuss updates with your trainer.',
        rationale: 'Autonomous target modification is restricted to human actions.',
        priority: 'MEDIUM',
      });
      return {
        answer,
        responseType: 'EXPLANATION',
        confidence: 'HIGH',
        groundedSources: ['NUTRITION_TARGETS'],
        recommendations,
        mealSuggestions,
        foodAlternatives,
        warnings: ['Targets cannot be changed autonomously by AI.'],
        followUpQuestions: ['Would you like me to explain how your current targets support your goal?'],
        requiresProfessionalReview: false,
      };
    }

    // Autonomous meal plan change protection
    if (isMealPlanChangeRequest) {
      answer = 'I cannot autonomously modify, add, or delete meals in your assigned meal plan. You can view suggestions here or request a plan modification with your trainer.';
      return {
        answer,
        responseType: 'EXPLANATION',
        confidence: 'HIGH',
        groundedSources: ['MEAL_PLAN'],
        recommendations,
        mealSuggestions,
        foodAlternatives,
        warnings: ['Assigned meal plans cannot be modified autonomously by AI.'],
        followUpQuestions: ['Would you like some meal ideas you can discuss with your trainer?'],
        requiresProfessionalReview: false,
      };
    }

    // Chicken alternatives query
    if (hasChickenAlternative) {
      answer = 'Here are practical high-protein alternatives to chicken breast that fit your nutritional needs and allergy restrictions.';
      responseType = 'SUGGESTION';

      // Ensure we don't suggest allergens
      if (!allergies.includes('fish') && !allergies.includes('shellfish')) {
        foodAlternatives.push({
          originalFood: 'Chicken Breast',
          substituteFood: 'Salmon Fillet (Atlantic, Raw)',
          reason: 'Rich in high-quality protein (20.4g/100g) plus beneficial omega-3 fatty acids.',
          nutritionalComparison: 'Similar high protein density with higher healthy fat content.',
          confidence: 'HIGH',
        });
      }
      if (!allergies.includes('dairy')) {
        foodAlternatives.push({
          originalFood: 'Chicken Breast',
          substituteFood: 'Greek Yogurt (Plain, Low Fat)',
          reason: 'Quick, zero-cook high-protein source (~10g protein per 100g) with gut-friendly probiotics.',
          nutritionalComparison: 'Slightly lower protein density, zero preparation required.',
          confidence: 'HIGH',
        });
      }
      foodAlternatives.push({
        originalFood: 'Chicken Breast',
        substituteFood: 'Firm Tofu / Tempeh',
        reason: 'Versatile plant-based complete protein providing ~15g protein per 100g.',
        nutritionalComparison: 'Plant-based alternative with balanced macros and fiber.',
        confidence: 'HIGH',
      });

      recommendations.push({
        type: 'FOOD_ALTERNATIVE',
        title: 'Diversify Protein Sources',
        description: 'Rotating between fish, plant proteins, and lean meats provides a broader micronutrient spectrum.',
        rationale: 'Protein variety improves dietary adherence and micronutrient completeness.',
        priority: 'MEDIUM',
      });
      followUpQuestions.push('Do you have cooking time constraints for dinner tonight?');
    } else if (hasEmptyLogs && (/today|ate|eaten|log|breakfast|food/i.test(contextText) || /today|ate|eaten|log|breakfast|food/i.test(userPrompt))) {
      answer = "I don't have enough recorded nutrition data to determine that. You currently have no food logs recorded for today in FitCore.";
      recommendations.push({
        type: 'LOGGING_GUIDANCE',
        title: 'Log Your Meals',
        description: 'Log your breakfast, lunch, or snacks to start tracking your daily macronutrient progress.',
        rationale: 'Accurate tracking builds consistency and visibility.',
        priority: 'HIGH',
      });
      followUpQuestions.push('What did you have for your last meal? You can tell me in natural language to quickly log it.');
    } else if (hasNoMealPlan && /meal\s+plan/i.test(contextText)) {
      answer = "Your account doesn't currently have an assigned meal plan. You can request a personalized meal plan from your coach or use the meal library to build one.";
      recommendations.push({
        type: 'GENERAL_EDUCATION',
        title: 'Explore Food Library',
        description: 'Browse verified system recipes and whole foods to structure your daily meals.',
        priority: 'MEDIUM',
      });
    } else if (hasNoTarget && /target/i.test(contextText)) {
      answer = "I don't have a nutrition target configured for you yet. You can set daily calorie and macro goals in your Nutrition settings.";
      recommendations.push({
        type: 'TARGET_EDUCATION',
        title: 'Set Nutrition Targets',
        description: 'Define your daily calorie and protein targets to unlock tailored progress tracking.',
        priority: 'HIGH',
      });
    } else if (isPreWorkoutInquiry) {
      answer = 'For optimal workout performance, consume easily digestible carbohydrates paired with moderate protein 60–90 minutes before your session.';
      responseType = 'EDUCATIONAL';
      mealSuggestions.push({
        name: 'Pre-Training Energy Oats',
        ingredients: ['Rolled Oats (40g)', 'Banana (1 medium)', 'Whey/Plant Protein (20g)'],
        estimatedCalories: 310,
        estimatedProtein: 22,
        estimatedCarbs: 48,
        estimatedFat: 3,
        whyItFits: 'Provides sustained glycogen release and amino acid availability for training.',
        isAiSuggestion: true,
        allergySafetyNote: allergies.length > 0 ? `Verified free from: ${allergies.join(', ')}` : undefined,
      });
      recommendations.push({
        type: 'TRAINING_NUTRITION',
        title: 'Hydrate Before Training',
        description: 'Drink 400-500ml of water 1-2 hours prior to ensure cardiovascular efficiency.',
        priority: 'HIGH',
      });
    } else if (isProteinInquiry) {
      answer = 'Your daily protein intake is essential for muscle protein synthesis and recovery. Grounded in your targets, aim to distribute protein evenly across 3-4 meals.';
      recommendations.push({
        type: 'TARGET_EDUCATION',
        title: 'Even Protein Distribution',
        description: 'Aim for 25-40g of protein per main meal to optimize leucine threshold.',
        priority: 'MEDIUM',
      });
    } else {
      answer = 'Based on your FitCore nutrition data, your daily nutritional progress and preferences are tracked and aligned with your fitness goals.';
      mealSuggestions.push({
        name: 'Balanced Protein Bowl',
        ingredients: ['Lean Protein (150g)', 'Brown Rice / Quinoa (100g)', 'Steamed Greens (100g)'],
        estimatedCalories: 420,
        estimatedProtein: 35,
        estimatedCarbs: 45,
        estimatedFat: 8,
        whyItFits: 'Balanced macronutrient ratio supporting muscle maintenance and satiety.',
        isAiSuggestion: true,
        allergySafetyNote: allergies.length > 0 ? `Prepared without: ${allergies.join(', ')}` : undefined,
      });
      recommendations.push({
        type: 'CONSISTENCY',
        title: 'Maintain Hydration Consistency',
        description: 'Track your water intake throughout the day to meet your daily hydration target.',
        priority: 'MEDIUM',
      });
      followUpQuestions.push('Would you like a quick snack suggestion or help planning your next meal?');
    }

    return {
      answer,
      responseType,
      confidence: 'HIGH',
      groundedSources: ['NUTRITION_PROFILE', 'NUTRITION_TARGETS', 'FOOD_LOGS'],
      recommendations,
      mealSuggestions,
      foodAlternatives,
      warnings,
      followUpQuestions,
      requiresProfessionalReview: false,
    };
  }

  private generateParsedFoodLogJson(contextText: string): Record<string, any> {
    const items: any[] = [];
    let mealType = 'BREAKFAST';
    if (/lunch/i.test(contextText)) mealType = 'LUNCH';
    else if (/dinner/i.test(contextText)) mealType = 'DINNER';
    else if (/snack/i.test(contextText)) mealType = 'SNACK';

    if (/egg/i.test(contextText)) {
      items.push({
        foodName: 'Whole Eggs (Large)',
        quantity: 2,
        unit: 'piece',
        mealType,
        calories: 144,
        protein: 12.6,
        carbohydrates: 0.8,
        fat: 9.6,
        fiber: 0,
        confidence: 0.95,
      });
    }

    if (/toast|bread/i.test(contextText)) {
      items.push({
        foodName: 'Whole Wheat Bread Toast',
        quantity: 1,
        unit: 'slice',
        mealType,
        calories: 80,
        protein: 3.5,
        carbohydrates: 14,
        fat: 1.0,
        fiber: 2.0,
        confidence: 0.9,
      });
    }

    if (/banana/i.test(contextText)) {
      items.push({
        foodName: 'Banana (Fresh)',
        quantity: 1,
        unit: 'medium',
        mealType,
        calories: 105,
        protein: 1.3,
        carbohydrates: 27,
        fat: 0.3,
        fiber: 3.1,
        confidence: 0.95,
      });
    }

    if (items.length === 0) {
      items.push({
        foodName: 'Custom Food Item',
        quantity: 1,
        unit: 'serving',
        mealType,
        calories: 250,
        protein: 15,
        carbohydrates: 30,
        fat: 8,
        confidence: 0.8,
      });
    }

    const totalCalories = items.reduce((acc, it) => acc + it.calories, 0);
    const totalProtein = items.reduce((acc, it) => acc + it.protein, 0);
    const totalCarbohydrates = items.reduce((acc, it) => acc + it.carbohydrates, 0);
    const totalFat = items.reduce((acc, it) => acc + it.fat, 0);

    return {
      mealType,
      consumedAt: new Date().toISOString(),
      items,
      totalCalories: Math.round(totalCalories * 10) / 10,
      totalProtein: Math.round(totalProtein * 10) / 10,
      totalCarbohydrates: Math.round(totalCarbohydrates * 10) / 10,
      totalFat: Math.round(totalFat * 10) / 10,
      requiresConfirmation: true,
      warning: 'Please review parsed quantities and nutritional values before confirming your log.',
    };
  }

  private generateDailyCheckInJson(contextText: string, userPrompt: string): Record<string, any> {
    const hasHighSoreness = contextText.includes('HIGH') || contextText.includes('VERY_HIGH') || contextText.includes('"sorenessLevel":"HIGH"') || contextText.includes('"sorenessLevel":"VERY_HIGH"');
    const hasLowEnergy = contextText.includes('VERY_LOW') || contextText.includes('"energyLevel":"VERY_LOW"') || contextText.includes('"energyLevel":"LOW"');
    const hasWorkoutToday = contextText.includes('todayWorkout') && !contextText.includes('"todayWorkout":null');
    const isTrainerAssigned = contextText.includes('trainer') || contextText.includes('TRAINER');
    const missedYesterday = contextText.includes('yesterdayWorkoutCompleted":false');

    let summary = 'You checked in today with good self-reported readiness. Your energy and sleep levels support productive activity.';
    let checkInInterpretation = 'Your responses indicate stable energy and manageable fatigue.';
    let readinessFraming = 'FitCore training-planning indicator is optimal for your scheduled session today.';
    let todayFocus = 'Complete your scheduled training session and maintain your nutrition targets.';
    let caution: string | undefined = undefined;

    const recommendations: Array<Record<string, any>> = [];

    if (hasHighSoreness) {
      checkInInterpretation = 'You reported elevated muscle soreness. While normal after challenging sessions, it suggests prioritizing thorough warm-ups.';
      readinessFraming = 'FitCore training-planning indicator is moderate with recovery emphasis due to elevated soreness.';
      todayFocus = 'Prioritize mobility, targeted warm-up, and avoid pushing into sharp discomfort.';
      caution = 'Elevated soreness detected. Warm up thoroughly and consider keeping weights moderate rather than testing maximum load.';
      recommendations.push({
        type: 'RECOVERY',
        title: 'Extended Warm-Up & Dynamic Mobility',
        explanation: 'Spend 5-10 minutes mobilizing sore muscle groups before starting resistance work.',
        priority: 'HIGH',
        relatedDomain: 'RECOVERY',
        suggestedAction: {
          action: 'VIEW_WORKOUT',
          label: 'Review Warm-Up Protocol',
        },
      });
    }

    if (hasLowEnergy) {
      checkInInterpretation = 'You reported lower energy today. Training can still be effective by focusing on movement quality rather than maximal volume.';
      readinessFraming = 'FitCore training-planning indicator suggests keeping session intensity manageable.';
      todayFocus = 'Focus on main compound sets and scale accessory volume if fatigue persists.';
      recommendations.push({
        type: 'TRAINING',
        title: 'Pacing & Intensity Management',
        explanation: 'Complete primary lifts with adequate rest between sets. Scale back accessory volume if energy wanes.',
        priority: 'MEDIUM',
        relatedDomain: 'TRAINING',
        suggestedAction: {
          action: 'VIEW_WORKOUT',
          label: 'View Session Details',
        },
      });
    }

    if (missedYesterday) {
      recommendations.push({
        type: 'CONSISTENCY',
        title: 'Weekly Consistency Reset',
        explanation: 'You missed yesterday\'s session. Focus on today\'s scheduled workout rather than attempting to double your workload.',
        priority: 'MEDIUM',
        relatedDomain: 'TRAINING',
        suggestedAction: {
          action: 'VIEW_WORKOUT',
          label: 'View Today\'s Plan',
        },
      });
    } else if (hasWorkoutToday && !hasHighSoreness) {
      recommendations.push({
        type: 'TRAINING',
        title: 'Complete Scheduled Workout',
        explanation: 'Your planned session aligns well with today\'s readiness signals. Maintain target sets and reps.',
        priority: 'HIGH',
        relatedDomain: 'TRAINING',
        suggestedAction: {
          action: 'VIEW_WORKOUT',
          label: 'Start Workout',
        },
      });
    }

    recommendations.push({
      type: 'HYDRATION',
      title: 'Maintain Hydration & Electrolytes',
      explanation: 'Aim for consistent fluid intake across the day, especially around your workout window.',
      priority: 'MEDIUM',
      relatedDomain: 'NUTRITION',
      suggestedAction: {
        action: 'VIEW_NUTRITION',
        label: 'Log Water Intake',
      },
    });

    recommendations.push({
      type: 'CONSISTENCY',
      title: 'Protect Evening Sleep Quality',
      explanation: 'Maintaining a regular sleep schedule will compound your recovery and training adaptations.',
      priority: 'LOW',
      relatedDomain: 'WELLNESS',
      suggestedAction: {
        action: 'VIEW_GOALS',
        label: 'Check Consistency Streak',
      },
    });

    if (isTrainerAssigned && (hasHighSoreness || hasLowEnergy)) {
      recommendations.push({
        type: 'SUPPORT',
        title: 'Consult Your Trainer',
        explanation: 'If fatigue or soreness lingers, discuss adjusting upcoming load or volume with your coach.',
        priority: 'MEDIUM',
        relatedDomain: 'TRAINING',
        suggestedAction: {
          action: 'VIEW_COACH',
          label: 'View Trainer Notes',
        },
      });
    }

    const coachHandoff = hasHighSoreness || hasLowEnergy
      ? {
          recommendedCoach: 'FITNESS_COACH' as const,
          reason: 'Guidance on tailoring workout intensity for today\'s soreness/energy',
          suggestedPrompt: 'How can I adjust today\'s exercises for higher soreness?',
        }
      : {
          recommendedCoach: 'NONE' as const,
        };

    return {
      summary,
      checkInInterpretation,
      readinessFraming,
      todayFocus,
      recommendations: recommendations.slice(0, 4),
      caution,
      suggestedNextAction: 'Review today\'s training plan and stay hydrated.',
      coachHandoff,
      sourceSummary: {
        used: [
          'Today\'s Check-In Responses',
          'Active Training Plan',
          'Scheduled Workouts',
          'Recent Activity History',
          'Nutrition Target Summary',
        ],
        excluded: [
          'Payment & Billing Information',
          'Private Trainer Notes',
          'Medical Records & Diagnoses',
        ],
      },
    };
  }

  private generateWearableIntelligenceJson(contextText: string = '', userPrompt: string = ''): Record<string, any> {
    const isRestingHrHigh = contextText.includes('above baseline') || contextText.includes('ELEVATED');
    const isSleepShort = contextText.includes('DECREASING') || contextText.includes('LOW');

    let category: 'LOW' | 'MODERATE' | 'GOOD' | 'INSUFFICIENT_DATA' = 'GOOD';
    if (isSleepShort && isRestingHrHigh) {
      category = 'LOW';
    } else if (isSleepShort || isRestingHrHigh) {
      category = 'MODERATE';
    }

    return {
      summary: category === 'GOOD'
        ? 'Your recovery indicators look steady with consistent sleep and activity within normal ranges.'
        : category === 'MODERATE'
        ? 'Your recovery indicators show moderate fatigue. Recent sleep or activity suggests pacing today.'
        : 'Your recovery indicators suggest prioritizing rest and recovery today.',
      dataHighlights: [
        { metric: 'Sleep Duration', value: '7h 15m', trend: 'Stable' },
        { metric: 'Resting Heart Rate', value: '62 bpm', trend: 'Baseline' },
        { metric: 'Daily Activity', value: '8,400 steps', trend: 'Consistent' },
      ],
      recoveryInterpretation: {
        category,
        explanation: 'Telemetry reflects steady sleep balance and consistent weekly movement.',
      },
      trainingGuidance: [
        {
          type: category === 'LOW' ? 'RECOVER' : category === 'MODERATE' ? 'REDUCE_INTENSITY' : 'TRAIN',
          recommendation: category === 'LOW'
            ? 'Prioritize light mobility, adequate hydration, and restorative sleep.'
            : category === 'MODERATE'
            ? 'Consider moderate load and listen to your body during today’s session.'
            : 'You are well-positioned for your planned training schedule.',
          reason: 'Correlated with your rolling 7-day wearable telemetry and baseline recovery metrics.',
        },
      ],
      suggestedCheckInPrompt: 'How are your energy and muscle soreness levels feeling today?',
      caution: 'Wearable metrics are for fitness guidance only and do not replace clinical advice.',
      escalation: { required: false },
      sourceSummary: ['WEARABLE_TELEMETRY', '7_DAY_BASELINE', 'ACTIVITY_TRENDS'],
      confidence: 'HIGH',
    };
  }

  private generateRetentionIntelligenceJson(contextText: string = '', userPrompt: string = ''): Record<string, any> {
    const isElevated = contextText.includes('ELEVATED') || contextText.includes('HIGH') || contextText.includes('decline');
    const hasTrainer = contextText.includes('trainerAssigned: true') || contextText.includes('assignedTrainerName');
    const riskLevel = contextText.includes('HIGH') ? 'HIGH' : isElevated ? 'ELEVATED' : 'MODERATE';

    return {
      summary: `Member engagement analysis indicates a ${riskLevel.toLowerCase()} retention risk driven by recent attendance deceleration relative to personal baseline.`,
      risk: {
        level: riskLevel,
        trend: 'WORSENING',
      },
      primaryFactors: [
        {
          type: 'ATTENDANCE_DECLINE',
          observation: 'Gym attendance decreased over the last 3 weeks compared with personal baseline.',
          timeframe: 'Last 21 days',
          evidence: ['Attendance record shows visits dropped below 1 visit per week.'],
        },
      ],
      positiveSignals: [
        {
          type: 'RECENT_SUCCESS',
          observation: 'Member logged high workout consistency in preceding month.',
        },
      ],
      recommendedInterventions: [
        {
          type: hasTrainer ? 'TRAINER_CHECK_IN' : 'GENERAL_SUPPORT',
          priority: 'HIGH',
          reason: 'A warm, proactive check-in may identify scheduling friction and support the member getting back into routine.',
        },
      ],
      suggestedStaffNote: 'Member attendance has decelerated recently compared to baseline. A friendly check-in on their next visit or via assigned trainer is recommended.',
      confidence: 'HIGH',
    };
  }

  private generateReactivationIntelligenceJson(contextText: string = '', userPrompt: string = ''): Record<string, any> {
    const isNew = contextText.includes('Fresh') || contextText.includes('NEW_MEMBER') || contextText.includes('insufficient');

    if (isNew) {
      return {
        summary: 'Member has less than 7 days of platform history; baseline data is insufficient for reactivation analysis.',
        reactivation: {
          eligible: false,
          status: 'NO_ACTION',
          recoveryState: 'NO_RECOVERY_SIGNAL',
          confidence: 'INSUFFICIENT_DATA',
        },
        inactivity: {
          observation: 'Member joined recently with insufficient historical attendance records.',
          timeframe: 'Last 7 days',
          evidence: ['Member tenure < 7 days'],
        },
        primaryFactors: [],
        positiveSignals: [],
        recommendedStrategies: [
          {
            type: 'INSUFFICIENT_DATA',
            priority: 'LOW',
            reason: 'Member is currently in standard onboarding window.',
          },
        ],
        suggestedNextStep: 'Allow standard gym onboarding to proceed before evaluating reactivation.',
      };
    }

    return {
      summary: 'Member exhibits a significant reduction in gym attendance relative to historical 3x/week baseline. Re-engagement is recommended via coach check-in.',
      reactivation: {
        eligible: true,
        status: 'FOLLOW_UP_RECOMMENDED',
        recoveryState: 'EARLY_REENGAGEMENT',
        confidence: 'HIGH',
      },
      inactivity: {
        observation: 'Gym attendance decreased by 75% relative to personal baseline (0.5 visits/week vs 3.0 baseline).',
        timeframe: 'Last 21 days',
        evidence: ['Baseline visits: 3.0/wk', 'Recent visits: 0.5/wk', 'Days inactive: 18'],
      },
      primaryFactors: [
        {
          type: 'ATTENDANCE_DECLINE',
          observation: 'Physical check-ins have lapsed over the past 18 days.',
          evidence: ['Last check-in recorded 18 days ago'],
        },
      ],
      positiveSignals: [
        {
          type: 'RECENT_BOOKING',
          observation: 'Member booked an upcoming workout session yesterday.',
        },
      ],
      recommendedStrategies: [
        {
          type: 'PERSONAL_TRAINER_CHECK_IN',
          priority: 'HIGH',
          reason: 'Member has an assigned trainer and previously maintained consistent 1-on-1 strength sessions.',
          suggestedStaffMessage: "Hi Alex, noticed you haven't been in this week. Would love to help you get back on track whenever you're ready!",
          suggestedNextStep: 'Assigned coach to perform an informal floor or app greeting during next visit.',
        },
      ],
      suggestedStaffMessage: "Hi Alex, noticed you haven't been in recently. If you'd like to re-align your strength routine, let's catch up briefly before your next workout.",
      suggestedNextStep: 'Assigned coach Marcus to conduct a brief routine review.',
    };
  }

  private generateRetentionAgentJson(contextText: string, userPrompt: string): Record<string, any> {
    const isNepali = contextText.toLowerCase().includes('nepali') || userPrompt.toLowerCase().includes('nepali');
    const isDecliningOrNoShow =
      contextText.toLowerCase().includes('declining') ||
      contextText.toLowerCase().includes('no-show') ||
      contextText.toLowerCase().includes('attendance') ||
      userPrompt.toLowerCase().includes('declining') ||
      userPrompt.toLowerCase().includes('no-show');

    const recommendedIntervention = isDecliningOrNoShow ? 'TRAINER_CHECK_IN' : 'GENERAL_SUPPORT';

    const messageDraft = isNepali
      ? 'नमस्ते, हामीले याद गर्यौं कि तपाईं केही दिनदेखि जिम आउनुभएको छैन। यदि तपाईंलाई उपयुक्त समय मिलाउन वा प्रशिक्षण पुनः सुरु गर्न कुनै सहयोग चाहिन्छ भने हामीलाई जानकारी दिनुहोस्।'
      : "Hi {{firstName}}, we noticed you haven't been in recently. If you'd like, we can help you find a session that fits your schedule.";

    return {
      summary: 'Member attendance has declined relative to historical baseline over the recent evaluation period.',
      riskLevel: 'ELEVATED',
      riskTrend: 'WORSENING',
      primaryFactors: [
        {
          type: 'ATTENDANCE_DECLINE',
          severity: 'HIGH',
          observation: 'Attendance dropped below baseline across recent weeks.',
          timeframe: 'Last 14-21 days',
          evidence: ['Recent visits lower than baseline'],
        },
      ],
      positiveSignals: [
        {
          type: 'RECENT_SUCCESS',
          observation: 'Member maintains an active membership and completed orientation successfully.',
          timeframe: 'Tenure',
          evidence: ['Active member status verified'],
        },
      ],
      recommendedIntervention,
      interventionReason: 'Proactive trainer check-in provides personal support without high-pressure sales messaging.',
      recommendedChannel: 'WHATSAPP',
      recommendedTiming: {
        recommendedAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        timezone: 'UTC',
        reason: 'Recommended for morning gym operational hours outside member quiet hours.',
        confidence: 0.95,
      },
      messageDraft,
      staffNote: 'Reach out warmly via WhatsApp. Inquire about schedule convenience and offer orientation or routine adjustment.',
      nextBestAction: 'Trainer to review schedule and send personalized greeting upon approval.',
      confidence: 'HIGH',
      caution: 'Ensure outreach is delivered during gym operating hours and strictly respects member quiet hours.',
      sources: ['MEMBER_PROFILE', 'ATTENDANCE', 'BOOKING', 'ENGAGEMENT'],
    };
  }

  private generateReceptionistJson(contextText: string, userPrompt: string): Record<string, any> {
    const lowerPrompt = userPrompt.toLowerCase();
    const lowerContext = contextText.toLowerCase();

    // Extract user inquiry from structured promptContext if present
    const inquiryMatch = userPrompt.match(/=== USER INQUIRY ===\s*([\s\S]*?)(?:###|$)/i);
    const queryToCheck = (inquiryMatch ? inquiryMatch[1].trim() : userPrompt).toLowerCase();

    // 1. Prompt Injection Defense
    if (
      lowerPrompt.includes('ignore previous instructions') ||
      lowerPrompt.includes('disregard all previous') ||
      lowerPrompt.includes('system prompt') ||
      lowerPrompt.includes('dan mode') ||
      lowerPrompt.includes('jailbreak') ||
      lowerPrompt.includes('developer instructions') ||
      lowerPrompt.includes('override your instructions')
    ) {
      return {
        message:
          'I am only able to assist with questions about our gym facilities, memberships, schedules, and policies. How can I help you with your fitness journey today?',
        intent: 'UNKNOWN',
        confidence: 0.99,
        requiresClarification: false,
        suggestedNextStep: 'Ask a question regarding gym hours, memberships, or classes.',
        citations: [],
        handoffRecommended: false,
        safetyFlag: 'PROMPT_INJECTION_DETECTED',
      };
    }

    // 2. Medical / Diagnostic Safety Disclaimer
    if (
      queryToCheck.includes('diagnose') ||
      queryToCheck.includes('torn muscle') ||
      queryToCheck.includes('severe chest pain') ||
      queryToCheck.includes('chest pain') ||
      queryToCheck.includes('prescribe medication') ||
      queryToCheck.includes('injury diagnosis')
    ) {
      return {
        message:
          'I am an AI receptionist and cannot provide medical diagnoses or treatment advice. If you are experiencing acute pain or an injury, please consult a qualified healthcare professional. Our staff can also connect you with certified trainers for safe exercise modifications once you are cleared.',
        intent: 'GENERAL_FAQ',
        confidence: 0.98,
        requiresClarification: false,
        suggestedNextStep: 'Consult a medical doctor for injury evaluation.',
        citations: [],
        handoffRecommended: false,
        safetyFlag: 'MEDICAL_DISCLAIMER',
      };
    }

    // 3. Multilingual Support (Nepali)
    const isNepali =
      /[\u0900-\u097F]/.test(userPrompt) ||
      queryToCheck.includes('namaste') ||
      queryToCheck.includes('namaskar');

    if (isNepali) {
      if (
        userPrompt.includes('कक्षा') ||
        userPrompt.includes('बुक') ||
        userPrompt.includes('बुकिङ') ||
        queryToCheck.includes('book')
      ) {
        return {
          message:
            'नमस्ते! FitCore मा भोलिको बिहान ७:०० बजेको HIIT कक्षा उपलब्ध छ (८ सिट बाँकी)। के तपाईं यो कक्षा बुक गर्न चाहनुहुन्छ? कृपया पुष्टि गर्नुहोस्।',
          intent: 'BOOK_CLASS',
          confidence: 0.98,
          requiresClarification: false,
          suggestedNextStep: 'कक्षा बुकिङ पुष्टि गर्नुहोस्।',
          citations: [
            {
              sourceType: 'CLASS_TYPE',
              title: 'Group Class Catalog',
              snippet: 'Authoritative class schedule.',
            },
          ],
          handoffRecommended: false,
        };
      }

      return {
        message:
          'नमस्ते! FitCore मा स्वागत छ। हाम्रो जिम सम्बन्धी जानकारी, शुल्क, समय तालिका र कक्षाहरू बारे म तपाईंलाई मद्दत गर्न सक्छु। म तपाईंलाई कसरी सहयोग गर्न सक्छु?',
        intent: 'GREETING',
        confidence: 0.98,
        requiresClarification: false,
        suggestedNextStep: 'जिमको समय, सदस्यता शुल्क वा कक्षाहरू बारे सोध्नुहोस्।',
        citations: [
          {
            sourceType: 'ORGANISATION_PROFILE',
            title: 'FitCore Overview',
            snippet: 'Authoritative organisation profile.',
          },
        ],
        handoffRecommended: false,
      };
    }

    // 3.1 Booking Cancellation & Rescheduling
    if (queryToCheck.includes('cancel') && (queryToCheck.includes('booking') || queryToCheck.includes('class') || queryToCheck.includes('session'))) {
      return {
        message:
          'You can cancel your upcoming class booking up to 2 hours before the session starts without penalty. Would you like me to process this cancellation for you?',
        intent: 'CANCEL_BOOKING',
        confidence: 0.97,
        requiresClarification: false,
        suggestedNextStep: 'Confirm booking cancellation.',
        citations: [
          {
            sourceType: 'POLICY',
            title: 'Class Cancellation Policy',
            snippet: '2-hour advance cancellation window for member group classes.',
          },
        ],
        handoffRecommended: false,
      };
    }

    if (queryToCheck.includes('reschedule') || queryToCheck.includes('change my class') || queryToCheck.includes('move my session')) {
      return {
        message:
          'I can help you reschedule your class to another available session today or tomorrow. Which time works best for you?',
        intent: 'RESCHEDULE_BOOKING',
        confidence: 0.96,
        requiresClarification: false,
        suggestedNextStep: 'Select alternative session time.',
        citations: [
          {
            sourceType: 'POLICY',
            title: 'Rescheduling Guidelines',
            snippet: 'Members may atomically reschedule to sessions with open capacity.',
          },
        ],
        handoffRecommended: false,
      };
    }

    // 3.2 Waitlist Inquiries
    if (queryToCheck.includes('waitlist')) {
      return {
        message:
          'This class session is currently at full capacity, but you can join the waitlist. When a spot opens up, candidates are automatically promoted in order. Would you like to join the waitlist?',
        intent: 'WAITLIST_JOIN',
        confidence: 0.96,
        requiresClarification: false,
        suggestedNextStep: 'Confirm joining the session waitlist.',
        citations: [
          {
            sourceType: 'POLICY',
            title: 'Waitlist Policy',
            snippet: 'Automatic FIFO waitlist promotion upon member cancellation.',
          },
        ],
        handoffRecommended: false,
      };
    }

    // 3.3 Direct Class Booking & Availability Discovery
    if (
      (queryToCheck.includes('book') || queryToCheck.includes('reserve')) &&
      (queryToCheck.includes('class') || queryToCheck.includes('hiit') || queryToCheck.includes('yoga') || queryToCheck.includes('tomorrow') || queryToCheck.includes('session'))
    ) {
      return {
        message:
          'I found a Morning HIIT class tomorrow at 7:00 AM with Coach Sarah at Downtown (8 spots remaining). Would you like me to reserve this spot for you?',
        intent: 'BOOK_CLASS',
        confidence: 0.98,
        requiresClarification: false,
        suggestedNextStep: 'Please confirm to finalize your class booking.',
        citations: [
          {
            sourceType: 'CLASS_TYPE',
            title: 'Group Class Catalog',
            snippet: 'Live session availability and capacity snapshot.',
          },
        ],
        handoffRecommended: false,
      };
    }

    // 4. Multi-outlet Ambiguity Check
    // If context indicates multi-outlet organisation and no specific outlet was resolved in question
    const hasMultipleOutlets =
      lowerContext.includes('multiple outlets') ||
      lowerContext.includes('outlet ambiguity') ||
      lowerContext.includes('ambiguous_outlet') ||
      (lowerContext.includes('downtown') && lowerContext.includes('westside') && !queryToCheck.includes('downtown') && !queryToCheck.includes('westside'));

    const isLocationSpecificQuery =
      queryToCheck.includes('hour') ||
      queryToCheck.includes('open') ||
      queryToCheck.includes('time') ||
      queryToCheck.includes('parking') ||
      queryToCheck.includes('where');

    if (hasMultipleOutlets && isLocationSpecificQuery) {
      return {
        message:
          'We have multiple locations available to serve you. Which location are you interested in (e.g., Downtown or Westside)?',
        intent: 'HOURS_INQUIRY',
        confidence: 0.95,
        requiresClarification: true,
        suggestedNextStep: 'Please specify which branch you are asking about.',
        citations: [
          {
            sourceType: 'OUTLET',
            title: 'Locations Directory',
            snippet: 'Multi-outlet directory.',
          },
        ],
        handoffRecommended: false,
      };
    }

    // 5. Human Handoff / Complaint Escalation
    if (
      queryToCheck.includes('talk to a human') ||
      queryToCheck.includes('speak to a person') ||
      queryToCheck.includes('manager') ||
      queryToCheck.includes('complaint') ||
      queryToCheck.includes('human agent') ||
      queryToCheck.includes('filing a complaint')
    ) {
      return {
        message:
          'I understand you would like to speak with our team. I have flagged this conversation for our front desk staff, and a team member will be with you shortly.',
        intent: 'HUMAN_HANDOFF',
        confidence: 0.99,
        requiresClarification: false,
        suggestedNextStep: 'Front desk staff notified.',
        citations: [],
        handoffRecommended: true,
      };
    }

    // 6. Unknown Facility / Policy (No Hallucination, Recommend Handoff)
    if (
      queryToCheck.includes('swimming pool') ||
      queryToCheck.includes('pool') ||
      queryToCheck.includes('cryotherapy') ||
      (queryToCheck.includes('sauna') && !lowerContext.includes('sauna')) ||
      queryToCheck.includes('creche') ||
      queryToCheck.includes('childcare')
    ) {
      return {
        message:
          'I checked our official facility directory and we do not have a swimming pool or childcare listed at this location. Would you like me to connect you with our front desk team for more details?',
        intent: 'FACILITIES',
        confidence: 0.85,
        requiresClarification: false,
        suggestedNextStep: 'Connect with front desk.',
        citations: [],
        handoffRecommended: true,
      };
    }

    // 7. Membership / Pricing Inquiry
    if (
      queryToCheck.includes('membership') ||
      queryToCheck.includes('pricing') ||
      queryToCheck.includes('cost') ||
      queryToCheck.includes('price') ||
      queryToCheck.includes('fee') ||
      queryToCheck.includes('plan')
    ) {
      return {
        message:
          'We offer flexible membership options including our Standard ($49/month) and Premium All-Access ($89/month) plans. Both include full gym floor access, locker rooms, and a complimentary wellness consultation.',
        intent: 'PRICING_INQUIRY',
        confidence: 0.96,
        requiresClarification: false,
        suggestedNextStep: 'Book a free trial or visit our front desk to sign up.',
        citations: [
          {
            sourceType: 'MEMBERSHIP_PLAN',
            title: 'Membership Plans & Pricing',
            snippet: 'Verified active membership pricing tiers.',
          },
        ],
        handoffRecommended: false,
      };
    }

    // 8. Class Inquiry / Schedule
    if (
      queryToCheck.includes('class') ||
      queryToCheck.includes('hiit') ||
      queryToCheck.includes('yoga') ||
      queryToCheck.includes('schedule')
    ) {
      return {
        message:
          'We offer dynamic group classes including Morning HIIT, Vinyasa Yoga, and Functional Strength. Classes can be viewed and reserved up to 7 days in advance through the FitCore mobile app.',
        intent: 'CLASS_INQUIRY',
        confidence: 0.95,
        requiresClarification: false,
        suggestedNextStep: 'View upcoming class schedule on the FitCore app.',
        citations: [
          {
            sourceType: 'CLASS_TYPE',
            title: 'Group Class Catalog',
            snippet: 'Authoritative class descriptions and schedules.',
          },
        ],
        handoffRecommended: false,
      };
    }

    // 9. Trainer Inquiry
    if (
      queryToCheck.includes('trainer') ||
      queryToCheck.includes('coach') ||
      queryToCheck.includes('personal training') ||
      queryToCheck.includes('pt')
    ) {
      return {
        message:
          'Our certified personal trainers specialize in progressive strength training, athletic conditioning, and injury-preventative movement. You can schedule an introductory consultation with our head coaches.',
        intent: 'TRAINER_INQUIRY',
        confidence: 0.95,
        requiresClarification: false,
        suggestedNextStep: 'Request an introductory consultation with a coach.',
        citations: [
          {
            sourceType: 'TRAINER_PROFILE',
            title: 'Trainer Profiles & Specializations',
            snippet: 'Certified personal training staff roster.',
          },
        ],
        handoffRecommended: false,
      };
    }

    // 10. Operating Hours & Location / Outlet Resolution
    if (
      queryToCheck.includes('hour') ||
      queryToCheck.includes('time') ||
      queryToCheck.includes('open') ||
      queryToCheck.includes('close') ||
      queryToCheck.includes('where') ||
      queryToCheck.includes('parking') ||
      queryToCheck.includes('downtown') ||
      queryToCheck.includes('westside')
    ) {
      return {
        message:
          'Our facility is open Monday to Friday from 6:00 AM to 10:00 PM, and weekends from 8:00 AM to 8:00 PM. We offer dedicated member parking and secure bicycle storage.',
        intent: 'HOURS_INQUIRY',
        confidence: 0.97,
        requiresClarification: false,
        suggestedNextStep: 'Check in with the FitCore app on arrival.',
        citations: [
          {
            sourceType: 'OUTLET',
            title: 'Operating Hours & Facilities',
            snippet: 'Verified operating hours and parking facilities.',
          },
        ],
        handoffRecommended: false,
      };
    }

    // 11. General Greeting / Fallback
    return {
      message:
        'Hello! Welcome to FitCore. I am your AI receptionist and can help you with operating hours, membership plans, class schedules, trainer profiles, and gym policies. What would you like to know today?',
      intent: 'GREETING',
      confidence: 0.94,
      requiresClarification: false,
      suggestedNextStep: 'Ask a question about memberships, hours, or classes.',
      citations: [
        {
          sourceType: 'ORGANISATION_PROFILE',
          title: 'FitCore Overview',
          snippet: 'Authoritative organisation directory.',
        },
      ],
      handoffRecommended: false,
    };
  }
}



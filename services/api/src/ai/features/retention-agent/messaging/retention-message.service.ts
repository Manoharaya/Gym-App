import { Injectable, BadRequestException } from '@nestjs/common';
import { RetentionAgentMemberContext } from '../context/retention-agent-context.types';
import { StructuredRetentionStrategy } from '@fitcore/types';
import { MessagePersonalizationService } from './message-personalization.service';
import { MessageSafetyService } from './message-safety.service';

@Injectable()
export class RetentionMessageService {
  constructor(
    private readonly personalizationService: MessagePersonalizationService,
    private readonly safetyService: MessageSafetyService,
  ) {}

  /**
   * Generates a safe, personalized, non-shaming message draft for staff review.
   */
  generateDraft(
    strategy: StructuredRetentionStrategy,
    context: RetentionAgentMemberContext,
    rawAiDraft?: string,
  ): string {
    const isNepali =
      context.preferredLanguage?.toLowerCase().includes('nepali') ||
      rawAiDraft?.includes('नमस्ते') ||
      rawAiDraft?.includes('तपाईं');
    let template = rawAiDraft;

    if (!template) {
      if (isNepali) {
        template =
          'नमस्ते {{firstName}}, हामीले याद गर्यौं कि तपाईं केही समयदेखि जिम आउनुभएको छैन। यदि तपाईंलाई उपयुक्त समय मिलाउन वा प्रशिक्षण पुनः सुरु गर्न कुनै सहयोग चाहिन्छ भने हामीलाई जानकारी दिनुहोस्।';
      } else {
        switch (strategy.intervention) {
          case 'CLASS_RECOMMENDATION':
            template =
              "Hi {{firstName}}, we noticed your schedule might have shifted recently. If you'd like, we can help you find a class timing that fits your week better.";
            break;
          case 'GOAL_REVIEW':
            template =
              "Hi {{firstName}}, hope your week is going well! Whenever you're ready, we'd love to help you review your fitness goals and adjust your routine.";
            break;
          case 'TRAINING_RESTART':
            template =
              "Hi {{firstName}}, we'd love to welcome you back to FitCore. Let us know if you'd like a quick refresher session to get moving again smoothly.";
            break;
          case 'TRAINER_CHECK_IN':
          default:
            template =
              "Hi {{firstName}}, we noticed you haven't been in recently. If you'd like, we can help you find a session that fits your schedule.";
            break;
        }
      }
    }

    // 1. Personalize tokens
    const personalized = this.personalizationService.personalize(template, context);

    // 2. Validate safety
    const safetyCheck = this.safetyService.validateMessageSafety(personalized);
    if (!safetyCheck.isSafe) {
      // Fallback to absolute safe standard message
      return isNepali
        ? 'नमस्ते, हामी तपाईंलाई फिटकोरमा स्वागत गर्न चाहन्छौं। यदि कुनै सहयोग चाहिन्छ भने हामीलाई बताउनुहोस्।'
        : "Hi {{firstName}}, we'd love to help you find a gym session that fits your schedule. Let us know how we can support you.";
    }

    return safetyCheck.sanitizedText;
  }

  /**
   * Validates staff edits to a draft message before saving or approval.
   */
  validateStaffEdit(editedMessage: string): string {
    const safetyCheck = this.safetyService.validateMessageSafety(editedMessage);
    if (!safetyCheck.isSafe) {
      throw new BadRequestException(
        `Message edit rejected: ${safetyCheck.violations.join(' ')}`,
      );
    }
    return safetyCheck.sanitizedText;
  }
}

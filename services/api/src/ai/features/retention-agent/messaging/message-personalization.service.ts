import { Injectable } from '@nestjs/common';
import { RetentionAgentMemberContext } from '../context/retention-agent-context.types';

@Injectable()
export class MessagePersonalizationService {
  /**
   * Safely personalizes message templates with verified member tokens.
   * Prohibits insertion of clinical, financial, or internal risk data.
   */
  personalize(templateText: string, context: RetentionAgentMemberContext): string {
    const name = context.preferredName || context.firstName || 'there';

    let rendered = templateText
      .replace(/\{\{\s*firstName\s*\}\}/gi, name)
      .replace(/\{\{\s*preferredName\s*\}\}/gi, name)
      .replace(/\{\{\s*name\s*\}\}/gi, name)
      .replace(/\{\{\s*outletName\s*\}\}/gi, 'FitCore')
      .replace(/\{\{\s*trainerName\s*\}\}/gi, context.trainer?.trainerName || 'your coach');

    // Clean up any stray unrendered safe variables
    rendered = rendered.replace(/\{\{\s*[\w.]+\s*\}\}/g, '').trim();

    return rendered;
  }
}

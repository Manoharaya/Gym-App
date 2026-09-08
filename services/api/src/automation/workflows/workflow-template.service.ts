/**
 * Day 30 — Workflow Seed Templates Service
 *
 * Provides ready-to-use engagement templates for common gym scenarios:
 * 1. Inactivity check-in (14 days)
 * 2. Attendance decline alert & coach follow-up (40% drop)
 * 3. Class no-show follow-up (30m delay)
 * 4. Membership expiration notice (14 days)
 * 5. Re-engagement celebration
 * 6. New member 72h check-in
 * 7. Milestone achievement celebration (50 workouts)
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { SEED_WORKFLOW_TEMPLATES, WorkflowTemplateDefinition } from '../automation.constants';
import { WorkflowDefinitionService } from './workflow-definition.service';
import { EngagementWorkflowDetailDto } from '@fitcore/types';

@Injectable()
export class WorkflowTemplateService {
  constructor(private readonly definitionService: WorkflowDefinitionService) {}

  /**
   * Returns list of all pre-configured gym templates.
   */
  listTemplates(): WorkflowTemplateDefinition[] {
    return SEED_WORKFLOW_TEMPLATES;
  }

  /**
   * Instantiates a pre-configured template as a new workflow for an organisation.
   */
  async instantiateTemplate(
    templateKey: string,
    organisationId: string,
    outletId?: string | null,
    customName?: string,
    userId?: string,
  ): Promise<EngagementWorkflowDetailDto> {
    const template = SEED_WORKFLOW_TEMPLATES.find((t) => t.templateKey === templateKey);
    if (!template) {
      throw new NotFoundException(`Workflow template '${templateKey}' not found.`);
    }

    return this.definitionService.createWorkflow(
      organisationId,
      {
        outletId,
        name: customName || template.name,
        description: template.description,
        triggerType: template.triggerType,
        triggerConfig: template.triggerConfig,
        audienceFilter: template.audienceFilter,
        stopConditions: template.stopConditions,
        safetyPolicy: template.safetyPolicy,
        actions: template.actions,
        tags: template.tags,
      },
      userId,
    );
  }
}

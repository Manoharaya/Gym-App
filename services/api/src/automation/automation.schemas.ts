/**
 * Day 30 — Automated Engagement Workflows Declarative Schemas
 *
 * Provides schema validation helpers ensuring workflow definitions, conditions,
 * and actions are strictly declarative JSON with no arbitrary code execution.
 */

import { BadRequestException } from '@nestjs/common';
import {
  WorkflowTriggerType,
  ConditionOperator,
  WorkflowActionType,
  WorkflowActionDefinition,
  WorkflowCondition,
  isCompoundCondition,
} from './automation.types';

const VALID_TRIGGER_TYPES: WorkflowTriggerType[] = [
  'MEMBER_CREATED',
  'MEMBER_ACTIVATED',
  'MEMBER_ONBOARDED',
  'MEMBER_REACTIVATED',
  'MEMBER_CHECKED_IN',
  'MEMBER_CHECKED_OUT',
  'CLASS_ATTENDED',
  'CLASS_NO_SHOW',
  'PT_SESSION_COMPLETED',
  'BOOKING_CREATED',
  'BOOKING_CANCELLED',
  'BOOKING_NO_SHOW',
  'WAITLIST_PROMOTED',
  'WORKOUT_COMPLETED',
  'WORKOUT_SKIPPED',
  'WORKOUT_OVERDUE',
  'TRAINING_GOAL_COMPLETED',
  'MEMBERSHIP_STARTED',
  'MEMBERSHIP_RENEWED',
  'MEMBERSHIP_EXPIRING',
  'MEMBERSHIP_EXPIRED',
  'MEMBER_INACTIVE',
  'ENGAGEMENT_DECLINED',
  'ENGAGEMENT_IMPROVED',
  'MEMBER_REENGAGED',
  'COMMUNICATION_DELIVERED',
  'COMMUNICATION_FAILED',
  'MEMBER_RESPONDED',
  'MEMBER_MILESTONE_REACHED',
  'MEMBERSHIP_ANNIVERSARY',
  'MEMBER_BIRTHDAY',
];

const VALID_CONDITION_OPERATORS: ConditionOperator[] = [
  'EQUALS',
  'NOT_EQUALS',
  'GREATER_THAN',
  'GREATER_THAN_OR_EQUAL',
  'LESS_THAN',
  'LESS_THAN_OR_EQUAL',
  'IN',
  'NOT_IN',
  'CONTAINS',
  'NOT_CONTAINS',
  'BETWEEN',
  'IS_TRUE',
  'IS_FALSE',
  'IS_NULL',
  'IS_NOT_NULL',
  'EXISTS',
  'NOT_EXISTS',
  'CHANGED',
  'INCREASED',
  'DECREASED',
  'BEFORE',
  'AFTER',
  'WITHIN_DATE_RANGE',
  'equals',
  'notEquals',
  'greaterThan',
  'greaterThanOrEqual',
  'lessThan',
  'lessThanOrEqual',
  'contains',
  'exists',
  'notExists',
  'changed',
  'increased',
  'decreased',
  'before',
  'after',
  'withinDateRange',
];

const VALID_ACTION_TYPES: WorkflowActionType[] = [
  'SEND_IN_APP',
  'SEND_PUSH',
  'SEND_EMAIL',
  'SEND_SMS',
  'SEND_WHATSAPP',
  'SEND_COMMUNICATION',
  'CREATE_STAFF_TASK',
  'ASSIGN_TRAINER_TASK',
  'CREATE_RETENTION_FOLLOWUP',
  'NOTIFY_STAFF',
  'NOTIFY_TRAINER',
  'NOTIFY_ASSIGNED_TRAINER',
  'NOTIFY_OUTLET_MANAGER',
  'NOTIFY_MANAGER',
  'SEND_IN_APP_NOTIFICATION',
  'WAIT',
  'DELAY',
  'END_WORKFLOW',
  'START_WORKFLOW',
  'CANCEL_WORKFLOW',
  'ADD_MEMBER_TAG',
  'REMOVE_MEMBER_TAG',
  'ADD_ENGAGEMENT_NOTE',
  'BRANCH',
];

export class AutomationSchemaValidator {
  /**
   * Validates trigger type
   */
  static validateTriggerType(triggerType: string): void {
    if (!VALID_TRIGGER_TYPES.includes(triggerType as WorkflowTriggerType)) {
      throw new BadRequestException(
        `Invalid triggerType '${triggerType}'. Must be a supported platform event trigger.`,
      );
    }
  }

  /**
   * Validates declarative conditions (leaf and compound AND/OR/NOT).
   */
  static validateCondition(condition: WorkflowCondition): void {
    if (!condition) return;

    if (isCompoundCondition(condition)) {
      if (!Array.isArray(condition.conditions) || condition.conditions.length === 0) {
        throw new BadRequestException(`Compound condition '${condition.logic}' must include a non-empty conditions array.`);
      }
      for (const child of condition.conditions) {
        this.validateCondition(child);
      }
      return;
    }

    const leaf = condition;
    if (!leaf.field) {
      throw new BadRequestException('Condition field must be specified.');
    }
    if (!VALID_CONDITION_OPERATORS.includes(leaf.operator)) {
      throw new BadRequestException(
        `Invalid condition operator '${leaf.operator}'. Must be one of: ${VALID_CONDITION_OPERATORS.join(', ')}`,
      );
    }
  }

  /**
   * Validates action list
   */
  static validateActions(actions: WorkflowActionDefinition[]): void {
    if (!Array.isArray(actions) || actions.length === 0) {
      throw new BadRequestException('Workflow must contain at least one action step.');
    }

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      if (!action.type || !VALID_ACTION_TYPES.includes(action.type)) {
        throw new BadRequestException(
          `Action at step index ${i} has invalid type '${action.type}'. Must be one of: ${VALID_ACTION_TYPES.join(', ')}`,
        );
      }
    }
  }
}

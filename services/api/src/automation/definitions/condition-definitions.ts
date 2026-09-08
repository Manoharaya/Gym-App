/**
 * Day 30 — Canonical Workflow Condition Definitions & Operators
 */

import { ConditionOperator, ConditionLogic } from '@fitcore/types';

export interface ConditionOperatorDefinition {
  operator: ConditionOperator;
  name: string;
  description: string;
  supportedTypes: Array<'NUMBER' | 'STRING' | 'BOOLEAN' | 'DATE' | 'ARRAY' | 'ANY'>;
}

export const WORKFLOW_CONDITION_OPERATORS: Record<string, ConditionOperatorDefinition> = {
  EQUALS: {
    operator: 'EQUALS',
    name: 'Equals',
    description: 'Exact match (case-insensitive string matching)',
    supportedTypes: ['STRING', 'NUMBER', 'BOOLEAN'],
  },
  NOT_EQUALS: {
    operator: 'NOT_EQUALS',
    name: 'Does Not Equal',
    description: 'Inverted equality',
    supportedTypes: ['STRING', 'NUMBER', 'BOOLEAN'],
  },
  GREATER_THAN: {
    operator: 'GREATER_THAN',
    name: 'Greater Than',
    description: 'Numeric strictly greater than',
    supportedTypes: ['NUMBER'],
  },
  GREATER_THAN_OR_EQUAL: {
    operator: 'GREATER_THAN_OR_EQUAL',
    name: 'Greater Than or Equal',
    description: 'Numeric greater than or equal to',
    supportedTypes: ['NUMBER'],
  },
  LESS_THAN: {
    operator: 'LESS_THAN',
    name: 'Less Than',
    description: 'Numeric strictly less than',
    supportedTypes: ['NUMBER'],
  },
  LESS_THAN_OR_EQUAL: {
    operator: 'LESS_THAN_OR_EQUAL',
    name: 'Less Than or Equal',
    description: 'Numeric less than or equal to',
    supportedTypes: ['NUMBER'],
  },
  IN: {
    operator: 'IN',
    name: 'In List',
    description: 'Value exists within candidate array',
    supportedTypes: ['STRING', 'NUMBER', 'ARRAY'],
  },
  NOT_IN: {
    operator: 'NOT_IN',
    name: 'Not In List',
    description: 'Value does not exist within candidate array',
    supportedTypes: ['STRING', 'NUMBER', 'ARRAY'],
  },
  CONTAINS: {
    operator: 'CONTAINS',
    name: 'Contains',
    description: 'String contains substring or array contains item',
    supportedTypes: ['STRING', 'ARRAY'],
  },
  NOT_CONTAINS: {
    operator: 'NOT_CONTAINS',
    name: 'Does Not Contain',
    description: 'Inverted containment check',
    supportedTypes: ['STRING', 'ARRAY'],
  },
  BETWEEN: {
    operator: 'BETWEEN',
    name: 'Between (Inclusive)',
    description: 'Value falls in closed range [value, valueTo]',
    supportedTypes: ['NUMBER'],
  },
  IS_TRUE: {
    operator: 'IS_TRUE',
    name: 'Is True',
    description: 'Boolean true check',
    supportedTypes: ['BOOLEAN'],
  },
  IS_FALSE: {
    operator: 'IS_FALSE',
    name: 'Is False',
    description: 'Boolean false check',
    supportedTypes: ['BOOLEAN'],
  },
  IS_NULL: {
    operator: 'IS_NULL',
    name: 'Is Null or Empty',
    description: 'Checks if field is null, undefined, or empty string',
    supportedTypes: ['ANY'],
  },
  IS_NOT_NULL: {
    operator: 'IS_NOT_NULL',
    name: 'Is Not Null',
    description: 'Checks if field is present and non-empty',
    supportedTypes: ['ANY'],
  },
  EXISTS: {
    operator: 'EXISTS',
    name: 'Exists',
    description: 'Alias for IS_NOT_NULL',
    supportedTypes: ['ANY'],
  },
  NOT_EXISTS: {
    operator: 'NOT_EXISTS',
    name: 'Does Not Exist',
    description: 'Alias for IS_NULL',
    supportedTypes: ['ANY'],
  },
  BEFORE: {
    operator: 'BEFORE',
    name: 'Before Date',
    description: 'Timestamp is prior to target date',
    supportedTypes: ['DATE'],
  },
  AFTER: {
    operator: 'AFTER',
    name: 'After Date',
    description: 'Timestamp is subsequent to target date',
    supportedTypes: ['DATE'],
  },
  WITHIN_DATE_RANGE: {
    operator: 'WITHIN_DATE_RANGE',
    name: 'Within Date Range',
    description: 'Date falls between start and end timestamps',
    supportedTypes: ['DATE'],
  },
};

export const SUPPORTED_CONDITION_LOGIC: ConditionLogic[] = ['AND', 'OR', 'NOT'];

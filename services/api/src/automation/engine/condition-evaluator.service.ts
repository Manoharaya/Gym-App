/**
 * Day 30 — Condition Evaluator Service
 *
 * Deterministic condition evaluation engine for engagement workflows.
 * Evaluates leaf and compound (AND / OR) conditions against member profile,
 * Day 29 canonical retention metrics, and event payloads.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  WorkflowCondition,
  WorkflowConditionLeaf,
  WorkflowConditionCompound,
  WorkflowConditionEvaluationResult,
  ConditionOperator,
  isCompoundCondition,
} from '@fitcore/types';

@Injectable()
export class ConditionEvaluatorService {
  private readonly logger = new Logger(ConditionEvaluatorService.name);

  /**
   * Evaluates a condition (leaf or compound) against context data.
   */
  evaluateCondition(
    condition: WorkflowCondition | undefined | null,
    context: Record<string, any>,
  ): WorkflowConditionEvaluationResult {
    if (!condition) {
      return {
        condition: {} as any,
        passed: true,
        reason: 'No condition specified, passed by default.',
      };
    }

    if (isCompoundCondition(condition)) {
      return this.evaluateCompound(condition, context);
    } else {
      return this.evaluateLeaf(condition, context);
    }
  }

  private evaluateCompound(
    compound: WorkflowConditionCompound,
    context: Record<string, any>,
  ): WorkflowConditionEvaluationResult {
    const results = (compound.conditions || []).map((sub) =>
      this.evaluateCondition(sub, context),
    );

    let passed: boolean;
    if (compound.logic === 'OR') {
      passed = results.some((r) => r.passed);
    } else {
      // Default to AND
      passed = results.every((r) => r.passed);
    }

    return {
      condition: compound,
      passed,
      reason: `Compound ${compound.logic} evaluated to ${passed}. (${results.filter((r) => r.passed).length}/${results.length} passed)`,
    };
  }

  private evaluateLeaf(
    leaf: WorkflowConditionLeaf,
    context: Record<string, any>,
  ): WorkflowConditionEvaluationResult {
    const actualValue = this.resolveFieldValue(leaf.field, context);
    const passed = this.compareValues(actualValue, leaf.operator, leaf.value, leaf.valueTo);

    return {
      condition: leaf,
      passed,
      field: leaf.field,
      actualValue,
      expectedValue: leaf.value,
      operator: leaf.operator,
      reason: passed
        ? `Field '${leaf.field}' (${actualValue}) matched ${leaf.operator} ${leaf.value}`
        : `Field '${leaf.field}' (${actualValue}) did not match ${leaf.operator} ${leaf.value}`,
    };
  }

  /**
   * Resolves nested dot-notation fields from context.
   * Searches in root context, then context.payload, context.member, context.metrics.
   */
  private resolveFieldValue(path: string, context: Record<string, any>): any {
    if (!path) return undefined;

    // 1. Direct path in root context
    let val = this.getNestedValue(context, path);
    if (val !== undefined) return val;

    // 2. Check context.payload
    if (context.payload) {
      val = this.getNestedValue(context.payload, path);
      if (val !== undefined) return val;
    }

    // 3. Check context.metrics
    if (context.metrics) {
      val = this.getNestedValue(context.metrics, path);
      if (val !== undefined) return val;
    }

    // 4. Check context.member
    if (context.member) {
      val = this.getNestedValue(context.member, path);
      if (val !== undefined) return val;
    }

    return undefined;
  }

  private getNestedValue(obj: any, path: string): any {
    if (!obj || typeof obj !== 'object') return undefined;
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    return current;
  }

  /**
   * Deterministic operator comparison
   */
  private compareValues(
    actual: any,
    operator: ConditionOperator,
    expected: any,
    expectedTo?: any,
  ): boolean {
    const op = String(operator).replace(/_/g, '').toUpperCase();

    switch (op) {
      case 'EQUALS':
        return actual === expected || String(actual).toLowerCase() === String(expected).toLowerCase();

      case 'NOTEQUALS':
        return actual !== expected && String(actual).toLowerCase() !== String(expected).toLowerCase();

      case 'GREATERTHAN':
        return Number(actual) > Number(expected);

      case 'GREATERTHANOREQUAL':
        return Number(actual) >= Number(expected);

      case 'LESSTHAN':
        return Number(actual) < Number(expected);

      case 'LESSTHANOREQUAL':
        return Number(actual) <= Number(expected);

      case 'IN':
        if (!Array.isArray(expected)) return false;
        return expected.some((e) => String(e).toLowerCase() === String(actual).toLowerCase());

      case 'NOTIN':
        if (!Array.isArray(expected)) return true;
        return !expected.some((e) => String(e).toLowerCase() === String(actual).toLowerCase());

      case 'CONTAINS':
        if (typeof actual === 'string' && typeof expected === 'string') {
          return actual.toLowerCase().includes(expected.toLowerCase());
        }
        if (Array.isArray(actual)) {
          return actual.some((a) => String(a).toLowerCase() === String(expected).toLowerCase());
        }
        return false;

      case 'NOTCONTAINS':
        if (typeof actual === 'string' && typeof expected === 'string') {
          return !actual.toLowerCase().includes(expected.toLowerCase());
        }
        if (Array.isArray(actual)) {
          return !actual.some((a) => String(a).toLowerCase() === String(expected).toLowerCase());
        }
        return true;

      case 'BETWEEN':
      case 'WITHINDATERANGE':
        const num = Number(actual);
        return num >= Number(expected) && num <= Number(expectedTo);

      case 'ISTRUE':
        return actual === true || actual === 'true' || actual === 1;

      case 'ISFALSE':
        return actual === false || actual === 'false' || actual === 0;

      case 'EXISTS':
      case 'ISNOTNULL':
        return actual !== null && actual !== undefined && actual !== '';

      case 'NOTEXISTS':
      case 'ISNULL':
        return actual === null || actual === undefined || actual === '';

      default:
        return false;
    }
  }
}

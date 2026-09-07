import { Injectable, Logger, BadRequestException } from '@nestjs/common';

export interface ValidationResult<T = any> {
  isValid: boolean;
  data?: T;
  errors?: string[];
}

@Injectable()
export class AIOutputValidatorService {
  private readonly logger = new Logger(AIOutputValidatorService.name);

  /**
   * Validates structured output against an expected JSON schema.
   */
  validate(content: string, structuredData?: any, schema?: Record<string, any>): ValidationResult {
    let parsed = structuredData;

    // 1. If not yet parsed, try to parse JSON content
    if (!parsed && content) {
      try {
        parsed = JSON.parse(content);
      } catch (err: any) {
        // If schema was required, this is a validation error
        if (schema) {
          this.logger.warn(`Failed to parse AI output as JSON: ${err.message}`);
          return {
            isValid: false,
            errors: [`Malformed JSON output from model: ${err.message}`],
          };
        }
      }
    }

    // 2. If no schema specified, pass through
    if (!schema) {
      return {
        isValid: true,
        data: parsed ?? content,
      };
    }

    if (!parsed || typeof parsed !== 'object') {
      return {
        isValid: false,
        errors: ['Expected JSON object but received non-object or null'],
      };
    }

    const errors: string[] = [];

    // 3. Check required properties
    const required = schema.required || [];
    for (const reqKey of required) {
      if (parsed[reqKey] === undefined || parsed[reqKey] === null) {
        errors.push(`Missing required property '${reqKey}'`);
      }
    }

    // 4. Validate types for declared properties
    const properties = schema.properties || {};
    for (const [propName, propDef] of Object.entries<any>(properties)) {
      const val = parsed[propName];
      if (val === undefined || val === null) continue;

      if (propDef.type === 'string' && typeof val !== 'string') {
        errors.push(`Property '${propName}' must be a string, received ${typeof val}`);
      } else if (propDef.type === 'number' && typeof val !== 'number') {
        errors.push(`Property '${propName}' must be a number, received ${typeof val}`);
      } else if (propDef.type === 'boolean' && typeof val !== 'boolean') {
        errors.push(`Property '${propName}' must be a boolean, received ${typeof val}`);
      } else if (propDef.type === 'array' && !Array.isArray(val)) {
        errors.push(`Property '${propName}' must be an array, received ${typeof val}`);
      } else if (propDef.type === 'object' && (typeof val !== 'object' || Array.isArray(val))) {
        errors.push(`Property '${propName}' must be an object, received ${typeof val}`);
      }
    }

    return {
      isValid: errors.length === 0,
      data: parsed,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}

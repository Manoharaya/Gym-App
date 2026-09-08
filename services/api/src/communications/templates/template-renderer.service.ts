import { Injectable, BadRequestException, Logger } from '@nestjs/common';

@Injectable()
export class TemplateRendererService {
  private readonly logger = new Logger(TemplateRendererService.name);

  // Prohibited personalization fields for privacy/safety (Section 19, 56, 57)
  private readonly PROHIBITED_FIELDS = [
    'password',
    'token',
    'secret',
    'apiKey',
    'medicalCondition',
    'injury',
    'parq',
    'retentionRisk',
    'churnScore',
    'riskScore',
    'financialHardship',
    'trainerNote',
    'privateNote',
  ];

  /**
   * Validates and renders a template string by interpolating variables.
   * Enforces variable presence, safety checks, and HTML sanitization.
   */
  render(
    templateText: string,
    variables: Record<string, any> = {},
    variablesSchema?: Record<string, any> | string[],
  ): string {
    if (!templateText) return '';

    // 1. Safety check: Block prohibited internal/health fields from template variables
    this.assertNoProhibitedFields(variables);

    // 2. Validate against schema if required variables specified
    if (variablesSchema) {
      this.validateRequiredVariables(templateText, variables, variablesSchema);
    }

    // 3. Render variables {{path.to.var}}
    const rendered = templateText.replace(/{{\s*([a-zA-Z0-9_.]+)\s*}}/g, (match, path) => {
      const val = this.resolveValue(variables, path);
      if (val === undefined || val === null) {
        throw new BadRequestException(
          `Missing required template variable: '${path}' in template rendering`
        );
      }
      return String(val);
    });

    // 4. Sanitize HTML
    return this.sanitizeHtml(rendered);
  }

  /**
   * Validates that all variables defined in template string or schema exist in payload.
   */
  private validateRequiredVariables(
    templateText: string,
    variables: Record<string, any>,
    schema: Record<string, any> | string[],
  ): void {
    const requiredKeys: string[] = Array.isArray(schema)
      ? schema
      : Object.keys(schema);

    for (const key of requiredKeys) {
      if (this.resolveValue(variables, key) === undefined) {
        throw new BadRequestException(
          `Template requires missing variable '${key}'`
        );
      }
    }
  }

  /**
   * Resolves dot notation path e.g. "member.firstName" from object.
   */
  private resolveValue(obj: Record<string, any>, path: string): any {
    if (!obj) return undefined;
    const parts = path.split('.');
    let curr: any = obj;
    for (const part of parts) {
      if (curr === null || curr === undefined || typeof curr !== 'object') {
        return undefined;
      }
      curr = curr[part];
    }
    return curr;
  }

  /**
   * Checks that payload contains no sensitive medical or risk labels.
   */
  private assertNoProhibitedFields(obj: Record<string, any>, currentPath = ''): void {
    if (!obj || typeof obj !== 'object') return;

    for (const [key, val] of Object.entries(obj)) {
      const fullPath = currentPath ? `${currentPath}.${key}` : key;
      const lowerKey = key.toLowerCase();

      for (const prohibited of this.PROHIBITED_FIELDS) {
        if (lowerKey.includes(prohibited.toLowerCase())) {
          throw new BadRequestException(
            `Personalization safety violation: Prohibited variable '${fullPath}' cannot be used in communications`
          );
        }
      }

      if (val && typeof val === 'object' && !Array.isArray(val)) {
        this.assertNoProhibitedFields(val, fullPath);
      }
    }
  }

  /**
   * HTML Sanitization to prevent script injection and malicious attributes (Section 21).
   */
  sanitizeHtml(content: string): string {
    if (!content) return '';
    return content
      // Remove script tags and contents
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove javascript: pseudo-protocol in href/src
      .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"')
      .replace(/src\s*=\s*["']javascript:[^"']*["']/gi, 'src=""')
      // Remove inline event handlers like onload, onclick, onerror
      .replace(/<([a-z][a-z0-9]*)[^>]*?(\bon\w+\s*=\s*["'][^"']*["'])[^>]*?>/gi, (match, tag, attr) => {
        return match.replace(attr, '');
      })
      // Remove iframe, object, embed tags
      .replace(/<\/?(?:iframe|object|embed|applet|form)[^>]*>/gi, '');
  }
}

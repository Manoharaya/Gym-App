import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PromptTemplateService {
  private readonly logger = new Logger(PromptTemplateService.name);

  /**
   * Safe variable interpolation: replaces `{{path.to.prop}}` with context value.
   * Never executes code or eval.
   */
  render(templateText: string, context: Record<string, any>): string {
    if (!templateText) return '';

    return templateText.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (match, path) => {
      const resolved = this.resolvePath(context, path);
      if (resolved === undefined || resolved === null) {
        return '';
      }
      if (typeof resolved === 'object') {
        return JSON.stringify(resolved);
      }
      return String(resolved);
    });
  }

  private resolvePath(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }
    return current;
  }
}

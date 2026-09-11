import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { DeveloperSecurityContext } from '../services/api-authorization.service';

export const CurrentDeveloperContext = createParamDecorator(
  (data: keyof DeveloperSecurityContext | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const developerContext: DeveloperSecurityContext = request.developerContext;

    return data && developerContext ? developerContext[data] : developerContext;
  },
);

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithUser, TenantContext } from '../interfaces/request-with-user.interface';

export const Tenant = createParamDecorator(
  (data: keyof TenantContext | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const tenant = request.tenantContext;

    return data && tenant ? tenant[data] : tenant;
  },
);

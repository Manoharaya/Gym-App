import { SetMetadata } from '@nestjs/common';
import { ApiScope } from '@fitcore/types';

export const REQUIRE_SCOPES_KEY = 'developer:require_scopes';

export const RequireScopes = (...scopes: ApiScope[]) => SetMetadata(REQUIRE_SCOPES_KEY, scopes);

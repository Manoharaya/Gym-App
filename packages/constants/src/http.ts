export const HTTP_HEADERS = {
  AUTHORIZATION: 'Authorization',
  ORGANISATION_ID: 'x-organisation-id',
  OUTLET_ID: 'x-outlet-id',
  REQUEST_ID: 'x-request-id',
  CLIENT_VERSION: 'x-client-version',
  CLIENT_PLATFORM: 'x-client-platform',
  CONTENT_TYPE: 'Content-Type',
  ACCEPT: 'Accept',
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

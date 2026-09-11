/**
 * FitCore — Day 50: Marketplace Domain Errors
 */

import { HttpException, HttpStatus } from '@nestjs/common';

export class MarketplaceException extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super({ error: 'MarketplaceError', message, statusCode: status }, status);
  }
}

export class ListingNotFoundError extends MarketplaceException {
  constructor(identifier: string) {
    super(`Marketplace listing '${identifier}' was not found`, HttpStatus.NOT_FOUND);
  }
}

export class ListingNotPublishedError extends MarketplaceException {
  constructor(slug: string) {
    super(`Marketplace listing '${slug}' is not published or visible`, HttpStatus.FORBIDDEN);
  }
}

export class InstallationNotFoundError extends MarketplaceException {
  constructor(id: string) {
    super(`Marketplace installation '${id}' was not found`, HttpStatus.NOT_FOUND);
  }
}

export class AlreadyInstalledError extends MarketplaceException {
  constructor(listingTitle: string, scope: string) {
    super(`Marketplace listing '${listingTitle}' is already installed for this ${scope}`, HttpStatus.CONFLICT);
  }
}

export class IncompatibleScopeError extends MarketplaceException {
  constructor(requestedScope: string, supportedScopes: string[]) {
    super(
      `Installation scope '${requestedScope}' is not supported by this listing. Supported scopes: [${supportedScopes.join(', ')}]`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class MissingDependencyError extends MarketplaceException {
  constructor(missingDeps: string[]) {
    super(
      `Cannot install listing due to missing required dependencies: ${missingDeps.join(', ')}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class ConflictDetectedError extends MarketplaceException {
  constructor(conflicts: string[]) {
    super(
      `Cannot install listing due to active conflicts with already installed applications: ${conflicts.join(', ')}`,
      HttpStatus.CONFLICT,
    );
  }
}

export class HealthPiiConsentRequiredError extends MarketplaceException {
  constructor(permissions: string[]) {
    super(
      `Installation requires explicit isolated member Health PII consent for permissions: ${permissions.join(', ')}. Standard tenant installation grant cannot bypass medical privacy boundaries.`,
      HttpStatus.FORBIDDEN,
    );
  }
}

export class VersionNotFoundError extends MarketplaceException {
  constructor(version: string) {
    super(`Marketplace listing version '${version}' was not found`, HttpStatus.NOT_FOUND);
  }
}

export class DuplicateReviewError extends MarketplaceException {
  constructor(listingId: string) {
    super(`Organisation has already submitted a review for listing '${listingId}'`, HttpStatus.CONFLICT);
  }
}

export class UnverifiedReviewerError extends MarketplaceException {
  constructor(listingTitle: string) {
    super(`Reviews are restricted to organisations that have actively installed '${listingTitle}'`, HttpStatus.FORBIDDEN);
  }
}

export class InvalidListingStatusTransitionError extends MarketplaceException {
  constructor(current: string, next: string) {
    super(`Cannot transition listing from status '${current}' to '${next}'`, HttpStatus.BAD_REQUEST);
  }
}

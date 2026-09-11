import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

export class EnterpriseResourceNotFoundException extends NotFoundException {
  constructor(resource: string, id: string) {
    super(`${resource} with ID '${id}' was not found`);
  }
}

export class HardCeilingViolationException extends ForbiddenException {
  constructor(policyCode: string, field: string, reason: string) {
    super(
      `Hard security ceiling violation for policy '${policyCode}' on field '${field}': ${reason}. Child scopes cannot relax higher-level security restrictions.`,
    );
  }
}

export class EnterprisePrivilegeEscalationException extends ForbiddenException {
  constructor(actorRole: string, targetRole: string) {
    super(
      `Privilege escalation prevented: Actor with role '${actorRole}' cannot assign or manage role '${targetRole}'`,
    );
  }
}

export class ScopeBoundaryException extends ForbiddenException {
  constructor(scopeType: string, scopeId: string) {
    super(`Access denied outside of authorized scope boundary: ${scopeType} [${scopeId}]`);
  }
}

export class DomainVerificationFailedException extends BadRequestException {
  constructor(domain: string, reason: string) {
    super(`Domain verification failed for '${domain}': ${reason}`);
  }
}

export class DuplicateDomainException extends ConflictException {
  constructor(domain: string) {
    super(`Domain '${domain}' is already registered in the platform`);
  }
}

export class OutletArchivalConflictException extends ConflictException {
  constructor(outletId: string, reason: string) {
    super(`Cannot archive outlet '${outletId}': ${reason}`);
  }
}

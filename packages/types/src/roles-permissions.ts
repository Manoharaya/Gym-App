/**
 * FitCore Role & Permission Architecture
 *
 * Supports granular role definitions and resource-action-scope permission checks.
 * Scope levels:
 * - PLATFORM: Global platform operations (Superadmin only)
 * - ORGANISATION: Across all outlets under the organisation
 * - OUTLET: Specific outlet/branch only
 * - ASSIGNED_CLIENTS: Staff-to-assigned-member boundary (Trainers)
 * - SELF: Own profile, data, bookings, workouts, payments (Members/Staff personal)
 */

export type UserRole =
  | 'SUPERADMIN'
  | 'ORGANISATION_OWNER'
  | 'OUTLET_MANAGER'
  | 'RECEPTION'
  | 'TRAINER'
  | 'FINANCE'
  | 'MEMBER';

export type PermissionScope = 'PLATFORM' | 'ORGANISATION' | 'OUTLET' | 'ASSIGNED_CLIENTS' | 'SELF';

export type PermissionResource =
  | 'members'
  | 'staff'
  | 'outlets'
  | 'organisations'
  | 'memberships'
  | 'payments'
  | 'invoices'
  | 'appointments'
  | 'classes'
  | 'workouts'
  | 'exercises'
  | 'health_data'
  | 'wearables'
  | 'ai'
  | 'reports'
  | 'retail'
  | 'door_access'
  | 'documents'
  | 'communications'
  | 'settings';

export type PermissionAction =
  'read' | 'write' | 'create' | 'update' | 'delete' | 'manage' | 'use' | 'configure' | 'export';

/**
 * Standard Permission Rule String Format:
 * `${resource}:${action}` or `${resource}.${action}`
 */
export type PermissionString = `${PermissionResource}.${PermissionAction}`;

export interface PermissionRule {
  resource: PermissionResource;
  action: PermissionAction;
  scope: PermissionScope;
}

export interface UserPermissionContext {
  role: UserRole;
  permissions: PermissionRule[];
  allowedOutlets: string[];
  assignedMemberIds?: string[];
}

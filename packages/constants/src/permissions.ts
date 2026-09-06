import type {
  PermissionAction,
  PermissionResource,
  PermissionRule,
  PermissionScope,
  UserRole,
} from '@fitcore/types';

export const PERMISSION_RESOURCES: readonly PermissionResource[] = [
  'members',
  'staff',
  'outlets',
  'organisations',
  'memberships',
  'payments',
  'invoices',
  'appointments',
  'classes',
  'workouts',
  'exercises',
  'health_data',
  'wearables',
  'ai',
  'reports',
  'retail',
  'door_access',
  'documents',
  'communications',
  'settings',
] as const;

export const PERMISSION_ACTIONS: readonly PermissionAction[] = [
  'read',
  'write',
  'create',
  'update',
  'delete',
  'manage',
  'use',
  'configure',
  'export',
] as const;

export const PERMISSION_SCOPES: readonly PermissionScope[] = [
  'PLATFORM',
  'ORGANISATION',
  'OUTLET',
  'ASSIGNED_CLIENTS',
  'SELF',
] as const;

/**
 * Baseline permission mappings by role
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, PermissionRule[]> = {
  SUPERADMIN: [
    { resource: 'organisations', action: 'manage', scope: 'PLATFORM' },
    { resource: 'outlets', action: 'manage', scope: 'PLATFORM' },
    { resource: 'members', action: 'manage', scope: 'PLATFORM' },
    { resource: 'staff', action: 'manage', scope: 'PLATFORM' },
    { resource: 'reports', action: 'export', scope: 'PLATFORM' },
    { resource: 'ai', action: 'configure', scope: 'PLATFORM' },
  ],
  ORGANISATION_OWNER: [
    { resource: 'outlets', action: 'manage', scope: 'ORGANISATION' },
    { resource: 'members', action: 'manage', scope: 'ORGANISATION' },
    { resource: 'staff', action: 'manage', scope: 'ORGANISATION' },
    { resource: 'memberships', action: 'manage', scope: 'ORGANISATION' },
    { resource: 'payments', action: 'manage', scope: 'ORGANISATION' },
    { resource: 'invoices', action: 'manage', scope: 'ORGANISATION' },
    { resource: 'reports', action: 'read', scope: 'ORGANISATION' },
    { resource: 'reports', action: 'export', scope: 'ORGANISATION' },
    { resource: 'ai', action: 'configure', scope: 'ORGANISATION' },
  ],
  OUTLET_MANAGER: [
    { resource: 'members', action: 'write', scope: 'OUTLET' },
    { resource: 'staff', action: 'read', scope: 'OUTLET' },
    { resource: 'appointments', action: 'manage', scope: 'OUTLET' },
    { resource: 'classes', action: 'manage', scope: 'OUTLET' },
    { resource: 'door_access', action: 'manage', scope: 'OUTLET' },
    { resource: 'retail', action: 'manage', scope: 'OUTLET' },
    { resource: 'reports', action: 'read', scope: 'OUTLET' },
  ],
  RECEPTION: [
    { resource: 'members', action: 'read', scope: 'OUTLET' },
    { resource: 'appointments', action: 'write', scope: 'OUTLET' },
    { resource: 'classes', action: 'write', scope: 'OUTLET' },
    { resource: 'door_access', action: 'write', scope: 'OUTLET' },
    { resource: 'retail', action: 'write', scope: 'OUTLET' },
    { resource: 'payments', action: 'create', scope: 'OUTLET' },
  ],
  TRAINER: [
    { resource: 'members', action: 'read', scope: 'ASSIGNED_CLIENTS' },
    { resource: 'appointments', action: 'manage', scope: 'ASSIGNED_CLIENTS' },
    { resource: 'workouts', action: 'manage', scope: 'ASSIGNED_CLIENTS' },
    { resource: 'exercises', action: 'read', scope: 'ORGANISATION' },
    { resource: 'health_data', action: 'read', scope: 'ASSIGNED_CLIENTS' },
    { resource: 'ai', action: 'use', scope: 'ASSIGNED_CLIENTS' },
  ],
  FINANCE: [
    { resource: 'payments', action: 'manage', scope: 'ORGANISATION' },
    { resource: 'invoices', action: 'manage', scope: 'ORGANISATION' },
    { resource: 'reports', action: 'export', scope: 'ORGANISATION' },
    { resource: 'memberships', action: 'read', scope: 'ORGANISATION' },
  ],
  MEMBER: [
    { resource: 'members', action: 'read', scope: 'SELF' },
    { resource: 'members', action: 'update', scope: 'SELF' },
    { resource: 'appointments', action: 'write', scope: 'SELF' },
    { resource: 'workouts', action: 'read', scope: 'SELF' },
    { resource: 'workouts', action: 'write', scope: 'SELF' },
    { resource: 'health_data', action: 'write', scope: 'SELF' },
    { resource: 'health_data', action: 'read', scope: 'SELF' },
    { resource: 'wearables', action: 'manage', scope: 'SELF' },
    { resource: 'payments', action: 'read', scope: 'SELF' },
    { resource: 'ai', action: 'use', scope: 'SELF' },
    { resource: 'documents', action: 'write', scope: 'SELF' },
  ],
};

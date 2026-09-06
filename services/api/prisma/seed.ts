import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding FitCore Multi-Tenant Database (Day 4: Member Lifecycle & Onboarding)...');

  // 1. Seed Roles
  const rolesData = [
    { name: 'SUPERADMIN', description: 'Platform-level super administrator' },
    { name: 'ORGANISATION_OWNER', description: 'Enterprise club owner with multi-outlet authority' },
    { name: 'OUTLET_MANAGER', description: 'Branch / outlet operational manager' },
    { name: 'RECEPTION', description: 'Front-desk reception and turnstile check-in staff' },
    { name: 'TRAINER', description: 'Personal trainer and conditioning coach' },
    { name: 'FINANCE', description: 'Financial officer managing billing, ledger, and Xero sync' },
    { name: 'MEMBER', description: 'Club athletic member' },
  ];

  const rolesMap = new Map<string, string>();
  for (const r of rolesData) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: { name: r.name, description: r.description, isSystemRole: true },
    });
    rolesMap.set(r.name, role.id);
  }

  // 2. Seed Permissions
  const permissionsData = [
    // Organisations
    { resource: 'organisations', action: 'MANAGE', scope: 'PLATFORM', description: 'Manage all organisations globally' },
    { resource: 'organisations', action: 'CREATE', scope: 'PLATFORM', description: 'Create new organisations' },
    { resource: 'organisations', action: 'READ', scope: 'PLATFORM', description: 'Read all organisations globally' },
    { resource: 'organisations', action: 'READ', scope: 'ORGANISATION', description: 'Read own organisation details' },
    { resource: 'organisations', action: 'UPDATE', scope: 'ORGANISATION', description: 'Update own organisation details' },
    { resource: 'organisations', action: 'DELETE', scope: 'PLATFORM', description: 'Soft-delete organisation' },
    // Outlets
    { resource: 'outlets', action: 'MANAGE', scope: 'ORGANISATION', description: 'Manage all outlets in own organisation' },
    { resource: 'outlets', action: 'CREATE', scope: 'ORGANISATION', description: 'Create outlet within own organisation' },
    { resource: 'outlets', action: 'READ', scope: 'ORGANISATION', description: 'Read all outlets within own organisation' },
    { resource: 'outlets', action: 'READ', scope: 'OUTLET', description: 'Read assigned outlet details' },
    { resource: 'outlets', action: 'UPDATE', scope: 'ORGANISATION', description: 'Update outlet within own organisation' },
    { resource: 'outlets', action: 'DELETE', scope: 'ORGANISATION', description: 'Soft-delete outlet within own organisation' },
    // Users
    { resource: 'users', action: 'MANAGE', scope: 'ORGANISATION', description: 'Manage users across organisation' },
    { resource: 'users', action: 'CREATE', scope: 'ORGANISATION', description: 'Create/invite users within organisation' },
    { resource: 'users', action: 'READ', scope: 'ORGANISATION', description: 'Read users across organisation' },
    { resource: 'users', action: 'READ', scope: 'OUTLET', description: 'Read users at assigned outlet' },
    { resource: 'users', action: 'READ', scope: 'SELF', description: 'Read own user profile' },
    { resource: 'users', action: 'UPDATE', scope: 'ORGANISATION', description: 'Update users within organisation' },
    { resource: 'users', action: 'UPDATE', scope: 'SELF', description: 'Update own user profile' },
    // Roles
    { resource: 'roles', action: 'ASSIGN', scope: 'ORGANISATION', description: 'Assign roles to users within organisation' },
    { resource: 'roles', action: 'REVOKE', scope: 'ORGANISATION', description: 'Revoke roles from users within organisation' },
    // Invitations
    { resource: 'invitations', action: 'CREATE', scope: 'ORGANISATION', description: 'Create staff invitations' },
    { resource: 'invitations', action: 'READ', scope: 'ORGANISATION', description: 'View staff invitations' },
    // Audit Logs
    { resource: 'audit_logs', action: 'READ', scope: 'ORGANISATION', description: 'Read compliance audit logs' },

    // DAY 4: Members & Onboarding
    { resource: 'members', action: 'CREATE', scope: 'ORGANISATION', description: 'Create member in organisation' },
    { resource: 'members', action: 'READ', scope: 'ORGANISATION', description: 'View members across organisation' },
    { resource: 'members', action: 'READ', scope: 'OUTLET', description: 'View members at assigned outlet' },
    { resource: 'members', action: 'READ', scope: 'SELF', description: 'View own member profile' },
    { resource: 'members', action: 'UPDATE', scope: 'ORGANISATION', description: 'Update member in organisation' },
    { resource: 'members', action: 'UPDATE', scope: 'SELF', description: 'Update own member profile' },
    
    // Onboarding
    { resource: 'onboarding', action: 'MANAGE', scope: 'SELF', description: 'Manage own onboarding progress' },
    { resource: 'onboarding', action: 'READ', scope: 'SELF', description: 'View own onboarding status' },
    { resource: 'onboarding', action: 'READ', scope: 'ORGANISATION', description: 'View member onboarding status' },

    // PAR-Q
    { resource: 'parq', action: 'CREATE', scope: 'SELF', description: 'Submit own PAR-Q response' },
    { resource: 'parq', action: 'READ', scope: 'SELF', description: 'View own PAR-Q history' },
    { resource: 'parq', action: 'READ', scope: 'ORGANISATION', description: 'Review tenant member PAR-Qs' },
    { resource: 'parq', action: 'READ', scope: 'ASSIGNED_CLIENTS', description: 'Review assigned client PAR-Qs' },

    // Health Screening & Injuries
    { resource: 'health', action: 'READ', scope: 'SELF', description: 'View own health screening' },
    { resource: 'health', action: 'UPDATE', scope: 'SELF', description: 'Update own health screening' },
    { resource: 'health', action: 'READ', scope: 'ORGANISATION', description: 'View member health screening' },
    { resource: 'health', action: 'READ', scope: 'ASSIGNED_CLIENTS', description: 'View assigned client health screening' },

    { resource: 'injuries', action: 'CREATE', scope: 'SELF', description: 'Log own injury' },
    { resource: 'injuries', action: 'READ', scope: 'SELF', description: 'View own injuries' },
    { resource: 'injuries', action: 'UPDATE', scope: 'SELF', description: 'Update own injury status' },
    { resource: 'injuries', action: 'READ', scope: 'ORGANISATION', description: 'View member injuries' },
    { resource: 'injuries', action: 'READ', scope: 'ASSIGNED_CLIENTS', description: 'View assigned client injuries' },

    // Consents
    { resource: 'consents', action: 'CREATE', scope: 'SELF', description: 'Grant consent' },
    { resource: 'consents', action: 'READ', scope: 'SELF', description: 'View own consents' },
    { resource: 'consents', action: 'WITHDRAW', scope: 'SELF', description: 'Withdraw consent' },
    { resource: 'consents', action: 'READ', scope: 'ORGANISATION', description: 'View member consent audit records' },

    // Documents
    { resource: 'documents', action: 'CREATE', scope: 'SELF', description: 'Upload own member documents' },
    { resource: 'documents', action: 'READ', scope: 'SELF', description: 'View own member documents' },
    { resource: 'documents', action: 'READ', scope: 'ORGANISATION', description: 'View member documents' },
    { resource: 'documents', action: 'READ', scope: 'ASSIGNED_CLIENTS', description: 'View assigned client documents' },

    // Signatures
    { resource: 'signatures', action: 'CREATE', scope: 'SELF', description: 'Create electronic signature' },
    { resource: 'signatures', action: 'READ', scope: 'SELF', description: 'View own signatures' },
    { resource: 'signatures', action: 'READ', scope: 'ORGANISATION', description: 'View member signatures' },

    // Day 5: Membership Plans, Memberships & Entitlements
    { resource: 'membership_plans', action: 'CREATE', scope: 'ORGANISATION', description: 'Create membership plans' },
    { resource: 'membership_plans', action: 'READ', scope: 'GLOBAL', description: 'Read membership plans' },
    { resource: 'membership_plans', action: 'READ', scope: 'ORGANISATION', description: 'Read organisation membership plans' },
    { resource: 'membership_plans', action: 'UPDATE', scope: 'ORGANISATION', description: 'Update membership plans' },
    { resource: 'membership_plans', action: 'ARCHIVE', scope: 'ORGANISATION', description: 'Archive membership plans' },

    { resource: 'memberships', action: 'CREATE', scope: 'ORGANISATION', description: 'Assign membership to member' },
    { resource: 'memberships', action: 'CREATE', scope: 'OUTLET', description: 'Assign membership within outlet' },
    { resource: 'memberships', action: 'READ', scope: 'SELF', description: 'View own memberships' },
    { resource: 'memberships', action: 'READ', scope: 'ORGANISATION', description: 'View organisation memberships' },
    { resource: 'memberships', action: 'READ', scope: 'OUTLET', description: 'View outlet memberships' },
    { resource: 'memberships', action: 'UPDATE', scope: 'ORGANISATION', description: 'Update memberships' },
    { resource: 'memberships', action: 'ACTIVATE', scope: 'ORGANISATION', description: 'Activate memberships' },
    { resource: 'memberships', action: 'PAUSE', scope: 'ORGANISATION', description: 'Pause memberships' },
    { resource: 'memberships', action: 'PAUSE', scope: 'OUTLET', description: 'Pause outlet memberships' },
    { resource: 'memberships', action: 'RESUME', scope: 'ORGANISATION', description: 'Resume memberships' },
    { resource: 'memberships', action: 'RESUME', scope: 'OUTLET', description: 'Resume outlet memberships' },
    { resource: 'memberships', action: 'SUSPEND', scope: 'ORGANISATION', description: 'Suspend memberships' },
    { resource: 'memberships', action: 'CANCEL', scope: 'SELF', description: 'Cancel own membership' },
    { resource: 'memberships', action: 'CANCEL', scope: 'ORGANISATION', description: 'Cancel memberships' },
    { resource: 'memberships', action: 'RENEW', scope: 'SELF', description: 'Renew own membership' },
    { resource: 'memberships', action: 'RENEW', scope: 'ORGANISATION', description: 'Renew memberships' },

    { resource: 'entitlements', action: 'READ', scope: 'SELF', description: 'View own membership entitlements' },
    { resource: 'entitlements', action: 'READ', scope: 'ORGANISATION', description: 'View organisation entitlements' },
    { resource: 'entitlements', action: 'MANAGE', scope: 'ORGANISATION', description: 'Manage plan entitlements' },

    // Day 6: Payments, Invoices, Billing, Refunds & Payment Methods
    { resource: 'invoices', action: 'CREATE', scope: 'ORGANISATION', description: 'Create organisation invoices' },
    { resource: 'invoices', action: 'READ', scope: 'ORGANISATION', description: 'Read organisation invoices' },
    { resource: 'invoices', action: 'READ', scope: 'SELF', description: 'Read own invoices' },
    { resource: 'invoices', action: 'VOID', scope: 'ORGANISATION', description: 'Void organisation invoices' },

    { resource: 'payments', action: 'CREATE', scope: 'ORGANISATION', description: 'Process payments on behalf of members' },
    { resource: 'payments', action: 'CREATE', scope: 'SELF', description: 'Pay own invoices / memberships' },
    { resource: 'payments', action: 'READ', scope: 'ORGANISATION', description: 'Read organisation payment transactions' },
    { resource: 'payments', action: 'READ', scope: 'SELF', description: 'Read own payment transactions' },
    { resource: 'payments', action: 'REFUND', scope: 'ORGANISATION', description: 'Issue refunds' },

    { resource: 'payment_methods', action: 'MANAGE', scope: 'SELF', description: 'Manage own payment methods' },
    { resource: 'payment_methods', action: 'READ', scope: 'SELF', description: 'Read own payment methods' },
    { resource: 'payment_methods', action: 'READ', scope: 'ORGANISATION', description: 'Read member payment methods' },

    { resource: 'discounts', action: 'MANAGE', scope: 'ORGANISATION', description: 'Manage promotional discount codes' },
    { resource: 'discounts', action: 'READ', scope: 'ORGANISATION', description: 'Read discount codes' },

    // Day 7: Physical Access, Check-In/Out & Door Access
    { resource: 'access', action: 'VIEW', scope: 'ORGANISATION', description: 'View access rules and status' },
    { resource: 'access', action: 'VIEW', scope: 'SELF', description: 'View own physical access status' },
    { resource: 'access', action: 'CHECK', scope: 'ORGANISATION', description: 'Evaluate physical access decisions' },
    { resource: 'access', action: 'MANUAL_CHECKIN', scope: 'ORGANISATION', description: 'Perform receptionist manual check-in' },
    { resource: 'access', action: 'MANUAL_CHECKOUT', scope: 'ORGANISATION', description: 'Perform receptionist manual check-out' },
    { resource: 'access', action: 'OVERRIDE', scope: 'ORGANISATION', description: 'Create temporary staff access override' },
    { resource: 'access', action: 'EVENT_VIEW', scope: 'ORGANISATION', description: 'View physical access audit events' },
    { resource: 'access_credentials', action: 'MANAGE', scope: 'ORGANISATION', description: 'Manage member access credentials' },
    { resource: 'access_credentials', action: 'MANAGE', scope: 'SELF', description: 'Manage own access credentials' },
    { resource: 'access_credentials', action: 'READ', scope: 'SELF', description: 'View own access credentials' },
    { resource: 'access_credentials', action: 'READ', scope: 'ORGANISATION', description: 'View member access credentials' },
    { resource: 'access_devices', action: 'MANAGE', scope: 'ORGANISATION', description: 'Manage hardware turnstiles and doors' },
    { resource: 'access_devices', action: 'READ', scope: 'ORGANISATION', description: 'View access hardware devices' },

    // Day 8: Booking & Scheduling Foundation
    { resource: 'classes', action: 'VIEW', scope: 'ORGANISATION', description: 'View classes and sessions' },
    { resource: 'classes', action: 'VIEW', scope: 'SELF', description: 'View available classes as a member' },
    { resource: 'classes', action: 'MANAGE', scope: 'ORGANISATION', description: 'Manage class types and templates' },
    { resource: 'class_sessions', action: 'VIEW', scope: 'ORGANISATION', description: 'View class sessions' },
    { resource: 'class_sessions', action: 'VIEW', scope: 'SELF', description: 'View class sessions as member' },
    { resource: 'class_sessions', action: 'CREATE', scope: 'ORGANISATION', description: 'Schedule new class sessions' },
    { resource: 'class_sessions', action: 'UPDATE', scope: 'ORGANISATION', description: 'Update scheduled class sessions' },
    { resource: 'class_sessions', action: 'DELETE', scope: 'ORGANISATION', description: 'Cancel scheduled class sessions' },
    { resource: 'bookings', action: 'CREATE', scope: 'SELF', description: 'Book class sessions' },
    { resource: 'bookings', action: 'CREATE', scope: 'ORGANISATION', description: 'Create bookings in organisation' },
    { resource: 'bookings', action: 'CANCEL', scope: 'SELF', description: 'Cancel own class booking' },
    { resource: 'bookings', action: 'CANCEL', scope: 'ORGANISATION', description: 'Cancel bookings in organisation' },
    { resource: 'bookings', action: 'VIEW', scope: 'SELF', description: 'View own class bookings' },
    { resource: 'bookings', action: 'VIEW', scope: 'ORGANISATION', description: 'View all class bookings in organisation' },
    { resource: 'bookings', action: 'MANUAL', scope: 'ORGANISATION', description: 'Perform receptionist manual booking/cancellation' },
    { resource: 'bookings', action: 'CHECK_IN', scope: 'ORGANISATION', description: 'Mark booking attendance check-in' },
    { resource: 'bookings', action: 'NO_SHOW', scope: 'ORGANISATION', description: 'Mark booking as no-show' },
    { resource: 'schedules', action: 'VIEW', scope: 'ORGANISATION', description: 'View staff and trainer schedules' },
    { resource: 'schedules', action: 'MANAGE', scope: 'ORGANISATION', description: 'Manage recurring schedules and availability' },
  ];


  const permMap = new Map<string, string>();
  for (const p of permissionsData) {
    const perm = await prisma.permission.upsert({
      where: {
        resource_action_scope: {
          resource: p.resource,
          action: p.action,
          scope: p.scope,
        },
      },
      update: { description: p.description },
      create: p,
    });
    permMap.set(`${p.resource}:${p.action}:${p.scope}`, perm.id);
  }

  const linkRolePerm = async (roleName: string, permKey: string) => {
    const roleId = rolesMap.get(roleName);
    const permissionId = permMap.get(permKey);
    if (roleId && permissionId) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: {},
        create: { roleId, permissionId },
      });
    }
  };

  // Assign permissions to SUPERADMIN (all)
  for (const key of permMap.keys()) {
    await linkRolePerm('SUPERADMIN', key);
  }

  // Assign permissions to ORGANISATION_OWNER
  const ownerPerms = [
    'organisations:READ:ORGANISATION',
    'organisations:UPDATE:ORGANISATION',
    'outlets:MANAGE:ORGANISATION',
    'outlets:CREATE:ORGANISATION',
    'outlets:READ:ORGANISATION',
    'outlets:UPDATE:ORGANISATION',
    'outlets:DELETE:ORGANISATION',
    'users:MANAGE:ORGANISATION',
    'users:CREATE:ORGANISATION',
    'users:READ:ORGANISATION',
    'users:UPDATE:ORGANISATION',
    'users:READ:SELF',
    'users:UPDATE:SELF',
    'roles:ASSIGN:ORGANISATION',
    'roles:REVOKE:ORGANISATION',
    'invitations:CREATE:ORGANISATION',
    'invitations:READ:ORGANISATION',
    'audit_logs:READ:ORGANISATION',
    // Day 4
    'members:CREATE:ORGANISATION',
    'members:READ:ORGANISATION',
    'members:UPDATE:ORGANISATION',
    'members:READ:SELF',
    'members:UPDATE:SELF',
    'onboarding:READ:ORGANISATION',
    'parq:READ:ORGANISATION',
    'health:READ:ORGANISATION',
    'injuries:READ:ORGANISATION',
    'consents:READ:ORGANISATION',
    'documents:READ:ORGANISATION',
    'signatures:READ:ORGANISATION',
    // Day 5
    'membership_plans:CREATE:ORGANISATION',
    'membership_plans:READ:ORGANISATION',
    'membership_plans:UPDATE:ORGANISATION',
    'membership_plans:ARCHIVE:ORGANISATION',
    'memberships:CREATE:ORGANISATION',
    'memberships:READ:ORGANISATION',
    'memberships:UPDATE:ORGANISATION',
    'memberships:ACTIVATE:ORGANISATION',
    'memberships:PAUSE:ORGANISATION',
    'memberships:RESUME:ORGANISATION',
    'memberships:SUSPEND:ORGANISATION',
    'memberships:CANCEL:ORGANISATION',
    'memberships:RENEW:ORGANISATION',
    'entitlements:READ:ORGANISATION',
    'entitlements:MANAGE:ORGANISATION',
    // Day 6
    'invoices:CREATE:ORGANISATION',
    'invoices:READ:ORGANISATION',
    'invoices:VOID:ORGANISATION',
    'payments:CREATE:ORGANISATION',
    'payments:READ:ORGANISATION',
    'payments:REFUND:ORGANISATION',
    'payment_methods:READ:ORGANISATION',
    'discounts:MANAGE:ORGANISATION',
    'discounts:READ:ORGANISATION',
    // Day 7
    'access:VIEW:ORGANISATION',
    'access:CHECK:ORGANISATION',
    'access:MANUAL_CHECKIN:ORGANISATION',
    'access:MANUAL_CHECKOUT:ORGANISATION',
    'access:OVERRIDE:ORGANISATION',
    'access:EVENT_VIEW:ORGANISATION',
    'access_credentials:MANAGE:ORGANISATION',
    'access_credentials:READ:ORGANISATION',
    'access_devices:MANAGE:ORGANISATION',
    'access_devices:READ:ORGANISATION',
    // Day 8
    'classes:VIEW:ORGANISATION',
    'classes:MANAGE:ORGANISATION',
    'class_sessions:VIEW:ORGANISATION',
    'class_sessions:CREATE:ORGANISATION',
    'class_sessions:UPDATE:ORGANISATION',
    'class_sessions:DELETE:ORGANISATION',
    'bookings:VIEW:ORGANISATION',
    'bookings:CREATE:ORGANISATION',
    'bookings:CANCEL:ORGANISATION',
    'bookings:MANUAL:ORGANISATION',
    'bookings:CHECK_IN:ORGANISATION',
    'bookings:NO_SHOW:ORGANISATION',
    'schedules:VIEW:ORGANISATION',
    'schedules:MANAGE:ORGANISATION',
  ];

  for (const k of ownerPerms) {
    await linkRolePerm('ORGANISATION_OWNER', k);
  }

  // Assign permissions to OUTLET_MANAGER
  const managerPerms = [
    'organisations:READ:ORGANISATION',
    'outlets:READ:OUTLET',
    'users:READ:OUTLET',
    'users:CREATE:ORGANISATION',
    'invitations:CREATE:ORGANISATION',
    'invitations:READ:ORGANISATION',
    'users:READ:SELF',
    'users:UPDATE:SELF',
    // Day 4
    'members:READ:OUTLET',
    'members:READ:SELF',
    'members:UPDATE:SELF',
    'onboarding:READ:ORGANISATION',
    'parq:READ:ORGANISATION',
    'health:READ:ORGANISATION',
    'injuries:READ:ORGANISATION',
    'documents:READ:ORGANISATION',
    // Day 5
    'membership_plans:READ:ORGANISATION',
    'memberships:CREATE:OUTLET',
    'memberships:READ:OUTLET',
    'memberships:PAUSE:OUTLET',
    'memberships:RESUME:OUTLET',
    'entitlements:READ:ORGANISATION',
    // Day 6
    'invoices:READ:ORGANISATION',
    'payments:CREATE:ORGANISATION',
    'payments:READ:ORGANISATION',
    // Day 7
    'access:VIEW:ORGANISATION',
    'access:CHECK:ORGANISATION',
    'access:MANUAL_CHECKIN:ORGANISATION',
    'access:MANUAL_CHECKOUT:ORGANISATION',
    'access:OVERRIDE:ORGANISATION',
    'access:EVENT_VIEW:ORGANISATION',
    'access_credentials:READ:ORGANISATION',
    'access_devices:READ:ORGANISATION',
    // Day 8
    'classes:VIEW:ORGANISATION',
    'classes:MANAGE:ORGANISATION',
    'class_sessions:VIEW:ORGANISATION',
    'class_sessions:CREATE:ORGANISATION',
    'class_sessions:UPDATE:ORGANISATION',
    'class_sessions:DELETE:ORGANISATION',
    'bookings:VIEW:ORGANISATION',
    'bookings:MANUAL:ORGANISATION',
    'bookings:CHECK_IN:ORGANISATION',
    'bookings:NO_SHOW:ORGANISATION',
    'bookings:CANCEL:ORGANISATION',
    'schedules:VIEW:ORGANISATION',
    'schedules:MANAGE:ORGANISATION',
  ];

  for (const k of managerPerms) {
    await linkRolePerm('OUTLET_MANAGER', k);
  }

  // Assign permissions to RECEPTION (Strictly NO broad health or sensitive medical document permissions)
  const receptionPerms = [
    'organisations:READ:ORGANISATION',
    'outlets:READ:OUTLET',
    'users:READ:OUTLET',
    'users:READ:SELF',
    'users:UPDATE:SELF',
    'members:READ:OUTLET', // Profile and check-in only
    'members:READ:SELF',
    'members:UPDATE:SELF',
    // Day 5
    'membership_plans:READ:ORGANISATION',
    'memberships:READ:OUTLET',
    'memberships:CREATE:OUTLET',
    'memberships:PAUSE:OUTLET',
    'memberships:RESUME:OUTLET',
    'entitlements:READ:ORGANISATION',
    // Day 6
    'invoices:READ:ORGANISATION',
    'payments:CREATE:ORGANISATION',
    'payments:READ:ORGANISATION',
    // Day 7
    'access:VIEW:ORGANISATION',
    'access:CHECK:ORGANISATION',
    'access:MANUAL_CHECKIN:ORGANISATION',
    'access:MANUAL_CHECKOUT:ORGANISATION',
    'access:OVERRIDE:ORGANISATION',
    'access_credentials:MANAGE:ORGANISATION',
    'access_credentials:READ:ORGANISATION',
    'access_devices:READ:ORGANISATION',
    // Day 8
    'classes:VIEW:ORGANISATION',
    'class_sessions:VIEW:ORGANISATION',
    'bookings:VIEW:ORGANISATION',
    'bookings:MANUAL:ORGANISATION',
    'bookings:CHECK_IN:ORGANISATION',
    'bookings:NO_SHOW:ORGANISATION',
    'bookings:CANCEL:ORGANISATION',
    'schedules:VIEW:ORGANISATION',
  ];

  for (const k of receptionPerms) {
    await linkRolePerm('RECEPTION', k);
  }

  // Assign permissions to FINANCE
  const financePerms = [
    'organisations:READ:ORGANISATION',
    'outlets:READ:ORGANISATION',
    'users:READ:ORGANISATION',
    'invoices:CREATE:ORGANISATION',
    'invoices:READ:ORGANISATION',
    'invoices:VOID:ORGANISATION',
    'payments:CREATE:ORGANISATION',
    'payments:READ:ORGANISATION',
    'payments:REFUND:ORGANISATION',
    'payment_methods:READ:ORGANISATION',
    'discounts:MANAGE:ORGANISATION',
    'discounts:READ:ORGANISATION',
    'memberships:READ:ORGANISATION',
  ];

  for (const k of financePerms) {
    await linkRolePerm('FINANCE', k);
  }

  // Assign permissions to TRAINER
  const trainerPerms = [
    'organisations:READ:ORGANISATION',
    'outlets:READ:OUTLET',
    'users:READ:SELF',
    'users:UPDATE:SELF',
    'members:READ:SELF',
    'members:UPDATE:SELF',
    'parq:READ:ASSIGNED_CLIENTS',
    'health:READ:ASSIGNED_CLIENTS',
    'injuries:READ:ASSIGNED_CLIENTS',
    'documents:READ:ASSIGNED_CLIENTS',
    // Day 5
    'membership_plans:READ:ORGANISATION',
    'memberships:READ:OUTLET',
    'entitlements:READ:ORGANISATION',
    // Day 8
    'classes:VIEW:ORGANISATION',
    'class_sessions:VIEW:ORGANISATION',
    'bookings:VIEW:ORGANISATION',
    'bookings:CHECK_IN:ORGANISATION',
    'schedules:VIEW:ORGANISATION',
    'schedules:MANAGE:ORGANISATION',
  ];

  for (const k of trainerPerms) {
    await linkRolePerm('TRAINER', k);
  }

  // Assign permissions to MEMBER (Self-service only)
  const memberPerms = [
    'users:READ:SELF',
    'users:UPDATE:SELF',
    'members:READ:SELF',
    'members:UPDATE:SELF',
    'onboarding:MANAGE:SELF',
    'onboarding:READ:SELF',
    'parq:CREATE:SELF',
    'parq:READ:SELF',
    'health:READ:SELF',
    'health:UPDATE:SELF',
    'injuries:CREATE:SELF',
    'injuries:READ:SELF',
    'injuries:UPDATE:SELF',
    'consents:CREATE:SELF',
    'consents:READ:SELF',
    'consents:WITHDRAW:SELF',
    'documents:CREATE:SELF',
    'documents:READ:SELF',
    'signatures:CREATE:SELF',
    'signatures:READ:SELF',
    // Day 5
    'membership_plans:READ:ORGANISATION',
    'memberships:READ:SELF',
    'memberships:CANCEL:SELF',
    'memberships:RENEW:SELF',
    'entitlements:READ:SELF',
    // Day 6
    'invoices:READ:SELF',
    'payments:CREATE:SELF',
    'payments:READ:SELF',
    'payment_methods:MANAGE:SELF',
    'payment_methods:READ:SELF',
    // Day 7
    'access:VIEW:SELF',
    'access_credentials:MANAGE:SELF',
    'access_credentials:READ:SELF',
    // Day 8
    'classes:VIEW:SELF',
    'class_sessions:VIEW:SELF',
    'bookings:VIEW:SELF',
    'bookings:CREATE:SELF',
    'bookings:CANCEL:SELF',
  ];

  for (const k of memberPerms) {
    await linkRolePerm('MEMBER', k);
  }

  // 3. Seed Organizations & Outlets
  const secondWind = await prisma.organisation.upsert({
    where: { slug: 'second-wind' },
    update: {},
    create: {
      id: 'org_dev_secondwind_001',
      name: 'Second Wind Athletic Club',
      slug: 'second-wind',
      status: 'ACTIVE',
      timezone: 'Australia/Perth',
      currency: 'AUD',
      country: 'Australia',
    },
  });

  const outletPerth = await prisma.outlet.upsert({
    where: { organisationId_slug: { organisationId: secondWind.id, slug: 'perth-cbd' } },
    update: {},
    create: {
      id: 'outlet_dev_perth_cbd_001',
      organisationId: secondWind.id,
      name: 'Perth CBD',
      slug: 'perth-cbd',
      code: 'SW-PERTH-CBD',
      status: 'ACTIVE',
      timezone: 'Australia/Perth',
      address: '100 St Georges Terrace',
      city: 'Perth',
      state: 'WA',
      postalCode: '6000',
      phone: '+61 8 9000 0001',
      email: 'perth@secondwind.com.au',
    },
  });

  await prisma.outlet.upsert({
    where: { organisationId_slug: { organisationId: secondWind.id, slug: 'fremantle' } },
    update: {},
    create: {
      id: 'outlet_dev_fremantle_002',
      organisationId: secondWind.id,
      name: 'Fremantle',
      slug: 'fremantle',
      code: 'SW-FREMANTLE',
      status: 'ACTIVE',
      timezone: 'Australia/Perth',
      address: '22 Marine Terrace',
      city: 'Fremantle',
      state: 'WA',
      postalCode: '6160',
      phone: '+61 8 9000 0002',
      email: 'fremantle@secondwind.com.au',
    },
  });

  const apexStrength = await prisma.organisation.upsert({
    where: { slug: 'apex-strength' },
    update: {},
    create: {
      id: 'org_dev_apex_002',
      name: 'Apex Strength Co',
      slug: 'apex-strength',
      status: 'ACTIVE',
      timezone: 'Australia/Sydney',
      currency: 'AUD',
      country: 'Australia',
    },
  });

  const outletSydney = await prisma.outlet.upsert({
    where: { organisationId_slug: { organisationId: apexStrength.id, slug: 'sydney-cbd' } },
    update: {},
    create: {
      id: 'outlet_dev_sydney_001',
      organisationId: apexStrength.id,
      name: 'Sydney CBD',
      slug: 'sydney-cbd',
      code: 'APEX-SYD-01',
      status: 'ACTIVE',
      timezone: 'Australia/Sydney',
      address: '200 George Street',
      city: 'Sydney',
      state: 'NSW',
      postalCode: '2000',
      phone: '+61 2 9000 0001',
      email: 'sydney@apexstrength.com.au',
    },
  });

  // 4. Seed PAR-Q Questionnaire (v2024.1)
  const parq = await prisma.questionnaire.upsert({
    where: { type_version: { type: 'PARQ', version: '2024.1' } },
    update: {},
    create: {
      type: 'PARQ',
      name: 'Physical Activity Readiness Questionnaire (PAR-Q+ 2024)',
      version: '2024.1',
      status: 'ACTIVE',
      effectiveFrom: new Date('2024-01-01'),
    },
  });

  const parqQuestions = [
    {
      questionKey: 'heart_condition',
      text: 'Has your doctor ever said that you have a heart condition and that you should only do physical activity recommended by a doctor?',
      sortOrder: 1,
    },
    {
      questionKey: 'chest_pain_activity',
      text: 'Do you feel pain in your chest when you do physical activity?',
      sortOrder: 2,
    },
    {
      questionKey: 'chest_pain_rest',
      text: 'In the past month, have you had chest pain when you were not doing physical activity?',
      sortOrder: 3,
    },
    {
      questionKey: 'dizziness_balance',
      text: 'Do you lose your balance because of dizziness or do you ever lose consciousness?',
      sortOrder: 4,
    },
    {
      questionKey: 'bone_joint_problem',
      text: 'Do you have a bone or joint problem that could be made worse by a change in your physical activity?',
      sortOrder: 5,
    },
    {
      questionKey: 'blood_pressure_meds',
      text: 'Is your doctor currently prescribing drugs (for example, water pills) for your blood pressure or heart condition?',
      sortOrder: 6,
    },
    {
      questionKey: 'other_reason',
      text: 'Do you know of any other reason why you should not do physical activity?',
      sortOrder: 7,
    },
  ];

  for (const q of parqQuestions) {
    await prisma.question.upsert({
      where: { questionnaireId_questionKey: { questionnaireId: parq.id, questionKey: q.questionKey } },
      update: { text: q.text, sortOrder: q.sortOrder },
      create: {
        questionnaireId: parq.id,
        questionKey: q.questionKey,
        text: q.text,
        type: 'BOOLEAN',
        required: true,
        sortOrder: q.sortOrder,
        metadata: { triggersReviewOnYes: true },
      },
    });
  }

  // 5. Seed Consent Types & Versions
  const consentTypesData = [
    {
      key: 'TERMS_AND_CONDITIONS',
      name: 'Terms and Conditions',
      description: 'FitCore and athletic facility membership agreements.',
      isMandatory: true,
      content: 'By accepting, you agree to abide by all club rules, access protocols, and payment terms of Second Wind Athletic Club.',
    },
    {
      key: 'PRIVACY_POLICY',
      name: 'Privacy Policy',
      description: 'Collection and handling of personal information according to Australian Privacy Principles.',
      isMandatory: true,
      content: 'We respect your personal privacy. Data is protected, tenant-isolated, and never sold to third-party brokers.',
    },
    {
      key: 'HEALTH_DATA_PROCESSING',
      name: 'Health Data Processing',
      description: 'Consent to collect PAR-Q and injury notes for exercise safety.',
      isMandatory: true,
      content: 'I consent to the secure collection and processing of my PAR-Q and injury information strictly for fitness readiness and coaching safety.',
    },
    {
      key: 'WEARABLE_DATA',
      name: 'Wearable Biometric Sync',
      description: 'Optional synchronization with Apple Health, Health Connect, or smart devices.',
      isMandatory: false,
      content: 'Allow FitCore to read daily step count, active calories, and heart rate telemetry to personalize fitness insights.',
    },
    {
      key: 'AI_PROCESSING',
      name: 'AI Coaching Insights',
      description: 'Optional anonymized fitness trend coaching recommendations.',
      isMandatory: false,
      content: 'Allow FitCore AI to analyze logged workouts to generate customized recovery recommendations.',
    },
  ];

  const consentVersionMap = new Map<string, string>();
  for (const c of consentTypesData) {
    const cType = await prisma.consentType.upsert({
      where: { key: c.key },
      update: { name: c.name, description: c.description, isMandatory: c.isMandatory },
      create: { key: c.key, name: c.name, description: c.description, isMandatory: c.isMandatory },
    });

    const cVer = await prisma.consentVersion.upsert({
      where: { consentTypeId_version: { consentTypeId: cType.id, version: '1.0' } },
      update: { content: c.content },
      create: {
        consentTypeId: cType.id,
        version: '1.0',
        content: c.content,
        effectiveFrom: new Date('2024-01-01'),
      },
    });

    consentVersionMap.set(c.key, cVer.id);
  }

  // 6. Seed Users & Member Profiles
  const passwordHash = await bcrypt.hash('FitCoreDev2026!', 10);

  const testUsers = [
    { email: 'superadmin@fitcore.io', role: 'SUPERADMIN', firstName: 'Platform', lastName: 'Admin', orgId: secondWind.id, outletId: null, status: 'ACTIVE' },
    { email: 'owner@secondwind.com.au', role: 'ORGANISATION_OWNER', firstName: 'Jack', lastName: 'Darling', orgId: secondWind.id, outletId: null, status: 'ACTIVE' },
    { email: 'manager@secondwind.com.au', role: 'OUTLET_MANAGER', firstName: 'Sarah', lastName: 'Miller', orgId: secondWind.id, outletId: outletPerth.id, status: 'ACTIVE' },
    { email: 'reception@secondwind.com.au', role: 'RECEPTION', firstName: 'Emma', lastName: 'Watson', orgId: secondWind.id, outletId: outletPerth.id, status: 'ACTIVE' },
    { email: 'trainer@secondwind.com.au', role: 'TRAINER', firstName: 'Marcus', lastName: 'Vance', orgId: secondWind.id, outletId: outletPerth.id, status: 'ACTIVE' },
    { email: 'finance@secondwind.com.au', role: 'FINANCE', firstName: 'Oliver', lastName: 'Queen', orgId: secondWind.id, outletId: null, status: 'ACTIVE' },
    
    // Member A: Second Wind — Onboarding NOT_STARTED
    { email: 'member@secondwind.com.au', role: 'MEMBER', firstName: 'Alex', lastName: 'Mercer', orgId: secondWind.id, outletId: outletPerth.id, status: 'ACTIVE', onboardingStatus: 'NOT_STARTED' },
    // Member B: Second Wind — Onboarding IN_PROGRESS
    { email: 'in-progress@secondwind.com.au', role: 'MEMBER', firstName: 'Bella', lastName: 'Swan', orgId: secondWind.id, outletId: outletPerth.id, status: 'ACTIVE', onboardingStatus: 'IN_PROGRESS' },
    // Member C: Second Wind — Onboarding COMPLETED
    { email: 'completed@secondwind.com.au', role: 'MEMBER', firstName: 'Chris', lastName: 'Evans', orgId: secondWind.id, outletId: outletPerth.id, status: 'ACTIVE', onboardingStatus: 'COMPLETED' },
    { email: 'active.member@secondwind.com.au', role: 'MEMBER', firstName: 'Active', lastName: 'Member', orgId: secondWind.id, outletId: outletPerth.id, status: 'ACTIVE', onboardingStatus: 'COMPLETED' },
    { email: 'parq.member@secondwind.com.au', role: 'MEMBER', firstName: 'Parq', lastName: 'Member', orgId: secondWind.id, outletId: outletPerth.id, status: 'ACTIVE', onboardingStatus: 'COMPLETED' },
    { email: 'flagged.member@secondwind.com.au', role: 'MEMBER', firstName: 'Flagged', lastName: 'Member', orgId: secondWind.id, outletId: outletPerth.id, status: 'ACTIVE', onboardingStatus: 'COMPLETED' },

    // Apex Member: Apex Strength — For cross-tenant tests
    { email: 'member@apexstrength.com.au', role: 'MEMBER', firstName: 'Chloe', lastName: 'Price', orgId: apexStrength.id, outletId: outletSydney.id, status: 'ACTIVE', onboardingStatus: 'COMPLETED' },
    { email: 'owner@apexstrength.com.au', role: 'ORGANISATION_OWNER', firstName: 'Apex', lastName: 'Owner', orgId: apexStrength.id, outletId: null, status: 'ACTIVE' },

    // Security Test Accounts
    { email: 'disabled@secondwind.com.au', role: 'MEMBER', firstName: 'Dave', lastName: 'Disabled', orgId: secondWind.id, outletId: outletPerth.id, status: 'DISABLED', onboardingStatus: 'NOT_STARTED' },
    { email: 'suspended@secondwind.com.au', role: 'MEMBER', firstName: 'Sam', lastName: 'Suspended', orgId: secondWind.id, outletId: outletPerth.id, status: 'SUSPENDED', onboardingStatus: 'NOT_STARTED' },
  ];

  for (const u of testUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash, status: u.status },
      create: {
        email: u.email,
        passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        displayName: `${u.firstName} ${u.lastName}`,
        status: u.status,
        emailVerifiedAt: new Date(),
      },
    });

    const roleId = rolesMap.get(u.role);
    if (roleId) {
      const existingUserRole = await prisma.userRole.findFirst({
        where: { userId: user.id, roleId, organisationId: u.orgId },
      });

      if (!existingUserRole) {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId,
            organisationId: u.orgId,
            outletId: u.outletId,
          },
        });
      }

      if (u.outletId) {
        await prisma.userOutlet.upsert({
          where: { userId_outletId: { userId: user.id, outletId: u.outletId } },
          update: {},
          create: { userId: user.id, outletId: u.outletId },
        });
      }
    }

    // If role is MEMBER, create MemberProfile + MemberOutlet + MemberOnboarding
    if (u.role === 'MEMBER') {
      const memberProfile = await prisma.memberProfile.upsert({
        where: { userId: user.id },
        update: { onboardingStatus: u.onboardingStatus, status: u.status === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED' },
        create: {
          userId: user.id,
          organisationId: u.orgId,
          preferredName: u.firstName,
          dateOfBirth: new Date('1995-05-15'),
          gender: 'MALE',
          timezone: 'Australia/Perth',
          status: u.status === 'ACTIVE' ? (u.onboardingStatus === 'COMPLETED' ? 'ACTIVE' : 'ONBOARDING') : 'SUSPENDED',
          onboardingStatus: u.onboardingStatus,
        },
      });

      if (u.outletId) {
        await prisma.memberOutlet.upsert({
          where: { memberProfileId_outletId: { memberProfileId: memberProfile.id, outletId: u.outletId } },
          update: {},
          create: {
            memberProfileId: memberProfile.id,
            outletId: u.outletId,
            status: 'ACTIVE',
          },
        });
      }

      const onboarding = await prisma.memberOnboarding.upsert({
        where: { memberProfileId: memberProfile.id },
        update: {
          status: u.onboardingStatus,
          currentStep: u.onboardingStatus === 'COMPLETED' ? 'COMPLETE' : (u.onboardingStatus === 'IN_PROGRESS' ? 'PARQ' : 'PROFILE'),
        },
        create: {
          memberProfileId: memberProfile.id,
          status: u.onboardingStatus,
          currentStep: u.onboardingStatus === 'COMPLETED' ? 'COMPLETE' : (u.onboardingStatus === 'IN_PROGRESS' ? 'PARQ' : 'PROFILE'),
          startedAt: u.onboardingStatus !== 'NOT_STARTED' ? new Date() : null,
          completedAt: u.onboardingStatus === 'COMPLETED' ? new Date() : null,
        },
      });

      // For completed member, seed completed PAR-Q submission, consents, and signature
      if (u.onboardingStatus === 'COMPLETED') {
        const parqSub = await prisma.parqSubmission.create({
          data: {
            memberProfileId: memberProfile.id,
            questionnaireId: parq.id,
            status: 'APPROVED',
            submittedAt: new Date(),
          },
        });

        const questions = await prisma.question.findMany({ where: { questionnaireId: parq.id } });
        for (const q of questions) {
          await prisma.parqResponse.create({
            data: {
              submissionId: parqSub.id,
              questionId: q.id,
              answer: { value: false },
            },
          });
        }

        // Mandatory consents
        for (const c of consentTypesData.filter(ct => ct.isMandatory)) {
          const vId = consentVersionMap.get(c.key);
          const cType = await prisma.consentType.findUnique({ where: { key: c.key } });
          if (vId && cType) {
            await prisma.consentRecord.create({
              data: {
                memberProfileId: memberProfile.id,
                consentTypeId: cType.id,
                consentVersionId: vId,
                status: 'CONSENTED',
                consentedAt: new Date(),
                ipAddress: '127.0.0.1',
                userAgent: 'FitCore Mobile iOS/1.0',
              },
            });
          }
        }

        // Digital signature
        await prisma.signature.create({
          data: {
            memberProfileId: memberProfile.id,
            documentType: 'ONBOARDING_AGREEMENT',
            documentVersion: '2024.1',
            signatureMethod: 'ELECTRONIC_ACCEPTANCE',
            signerName: `${u.firstName} ${u.lastName}`,
            signatureReference: 'sha256_mock_evidence_reference_123',
            signedAt: new Date(),
          },
        });
      }
    }
  }

  // ==========================================
  // DAY 5: SEED MEMBERSHIP PLANS & TEST MEMBERSHIPS
  // ==========================================
  console.log('Seeding Day 5 Membership Plans & Subscriptions...');

  // 1. Seed Membership Plans for Second Wind
  const basicPlan = await prisma.membershipPlan.upsert({
    where: { organisationId_code: { organisationId: secondWind.id, code: 'SW-BASIC-M' } },
    update: {},
    create: {
      organisationId: secondWind.id,
      name: 'Second Wind Basic',
      description: 'Single-facility access to Second Wind Perth CBD with all standard equipment.',
      code: 'SW-BASIC-M',
      status: 'ACTIVE',
      membershipType: 'STANDARD',
      billingType: 'RECURRING',
      durationValue: 1,
      durationUnit: 'MONTH',
      price: 69.99,
      currency: 'AUD',
      isPublic: true,
      requiresApproval: false,
    },
  });

  const premiumPlan = await prisma.membershipPlan.upsert({
    where: { organisationId_code: { organisationId: secondWind.id, code: 'SW-PREM-M' } },
    update: {},
    create: {
      organisationId: secondWind.id,
      name: 'Second Wind Premium All-Access',
      description: 'Unlimited access to all Second Wind athletic clubs, group training, recovery suites, and AI coach.',
      code: 'SW-PREM-M',
      status: 'ACTIVE',
      membershipType: 'STANDARD',
      billingType: 'RECURRING',
      durationValue: 1,
      durationUnit: 'MONTH',
      price: 119.99,
      currency: 'AUD',
      isPublic: true,
      requiresApproval: false,
    },
  });

  const trialPlan = await prisma.membershipPlan.upsert({
    where: { organisationId_code: { organisationId: secondWind.id, code: 'SW-TRIAL-7D' } },
    update: {},
    create: {
      organisationId: secondWind.id,
      name: '7-Day Experience Pass',
      description: 'Complimentary 7-day trial access to experience Second Wind facilities.',
      code: 'SW-TRIAL-7D',
      status: 'ACTIVE',
      membershipType: 'TRIAL',
      billingType: 'ONE_TIME',
      durationValue: 7,
      durationUnit: 'DAY',
      price: 0.0,
      currency: 'AUD',
      trialDuration: 7,
      isPublic: true,
      requiresApproval: false,
    },
  });

  const eliteAnnualPlan = await prisma.membershipPlan.upsert({
    where: { organisationId_code: { organisationId: secondWind.id, code: 'SW-ELITE-Y' } },
    update: {},
    create: {
      organisationId: secondWind.id,
      name: 'Second Wind Annual Elite',
      description: 'Annual VIP membership including unlimited multi-outlet access, classes, sauna, and priority PT.',
      code: 'SW-ELITE-Y',
      status: 'ACTIVE',
      membershipType: 'STANDARD',
      billingType: 'ONE_TIME',
      durationValue: 1,
      durationUnit: 'YEAR',
      price: 1199.0,
      currency: 'AUD',
      isPublic: true,
      requiresApproval: false,
    },
  });

  // 2. Link Plans to Outlets
  const perthCbd = await prisma.outlet.findFirstOrThrow({ where: { organisationId: secondWind.id, slug: 'perth-cbd' } });
  const fremantle = await prisma.outlet.findFirstOrThrow({ where: { organisationId: secondWind.id, slug: 'fremantle' } });

  // Basic: Perth CBD only
  await prisma.membershipPlanOutlet.upsert({
    where: { membershipPlanId_outletId: { membershipPlanId: basicPlan.id, outletId: perthCbd.id } },

    update: {},
    create: { membershipPlanId: basicPlan.id, outletId: perthCbd.id },
  });

  // Premium & Elite: Perth CBD + Fremantle
  for (const plan of [premiumPlan, eliteAnnualPlan]) {
    await prisma.membershipPlanOutlet.upsert({
      where: { membershipPlanId_outletId: { membershipPlanId: plan.id, outletId: perthCbd.id } },
      update: {},
      create: { membershipPlanId: plan.id, outletId: perthCbd.id },
    });
    await prisma.membershipPlanOutlet.upsert({
      where: { membershipPlanId_outletId: { membershipPlanId: plan.id, outletId: fremantle.id } },
      update: {},
      create: { membershipPlanId: plan.id, outletId: fremantle.id },
    });
  }

  // Trial: Perth CBD
  await prisma.membershipPlanOutlet.upsert({
    where: { membershipPlanId_outletId: { membershipPlanId: trialPlan.id, outletId: perthCbd.id } },
    update: {},
    create: { membershipPlanId: trialPlan.id, outletId: perthCbd.id },
  });

  // 3. Seed Entitlements
  const entitlementsData = [
    { planId: basicPlan.id, type: 'GYM_ACCESS', name: 'Standard Gym Access', value: null, metadata: { access: 'standard' } },
    { planId: premiumPlan.id, type: 'GYM_ACCESS', name: 'Multi-Outlet Gym Access', value: null, metadata: { allOutlets: true } },
    { planId: premiumPlan.id, type: 'GROUP_CLASSES', name: 'High-Performance Group Classes', value: 12, metadata: { period: 'MONTH' } },
    { planId: premiumPlan.id, type: 'SAUNA', name: 'Infrared & Traditional Sauna', value: null, metadata: { unlimited: true } },
    { planId: premiumPlan.id, type: 'AI_COACH', name: 'FitCore Adaptive AI Coach', value: null, metadata: { fullAccess: true } },
    { planId: trialPlan.id, type: 'GYM_ACCESS', name: 'Trial Gym Access', value: null, metadata: { trial: true } },
    { planId: eliteAnnualPlan.id, type: 'GYM_ACCESS', name: 'VIP All-Facility Access', value: null, metadata: { vip: true } },
    { planId: eliteAnnualPlan.id, type: 'GROUP_CLASSES', name: 'Unlimited Group Classes', value: null, metadata: { unlimited: true } },
    { planId: eliteAnnualPlan.id, type: 'SAUNA', name: 'Recovery Suite Access', value: null, metadata: { unlimited: true } },
    { planId: eliteAnnualPlan.id, type: 'AI_COACH', name: 'FitCore Adaptive AI Coach', value: null, metadata: { fullAccess: true } },
  ];

  for (const ent of entitlementsData) {
    const existing = await prisma.membershipEntitlement.findFirst({
      where: { membershipPlanId: ent.planId, type: ent.type },
    });
    if (!existing) {
      await prisma.membershipEntitlement.create({
        data: {
          membershipPlanId: ent.planId,
          type: ent.type,
          name: ent.name,
          value: ent.value,
          metadata: ent.metadata,
        },
      });
    }
  }

  // 4. Seed MemberMemberships for Test Accounts
  const activeUser = await prisma.user.findUnique({ where: { email: 'active.member@secondwind.com.au' } });
  const parqUser = await prisma.user.findUnique({ where: { email: 'parq.member@secondwind.com.au' } });
  const flaggedUser = await prisma.user.findUnique({ where: { email: 'flagged.member@secondwind.com.au' } });

  if (activeUser) {
    const profile = await prisma.memberProfile.findUnique({ where: { userId: activeUser.id } });
    if (profile) {
      // Historical expired membership (preserve history)
      const pastStart = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const pastEnd = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      const pastM = await prisma.memberMembership.create({
        data: {
          organisationId: secondWind.id,
          memberProfileId: profile.id,
          membershipPlanId: basicPlan.id,
          status: 'EXPIRED',
          accessScope: 'SINGLE_OUTLET',
          originOutletId: perthCbd.id,
          startDate: pastStart,
          endDate: pastEnd,
          activatedAt: pastStart,
          autoRenew: false,
          planNameAtPurchase: basicPlan.name,
          priceAtPurchase: basicPlan.price,
          currencyAtPurchase: basicPlan.currency,
          billingTypeAtPurchase: basicPlan.billingType,
          durationValueAtPurchase: basicPlan.durationValue,
          durationUnitAtPurchase: basicPlan.durationUnit,
        },
      });

      await prisma.memberMembershipHistory.create({
        data: {
          memberMembershipId: pastM.id,
          fromStatus: 'ACTIVE',
          toStatus: 'EXPIRED',
          action: 'EXPIRE',
          reason: 'Term completed without renewal',
        },
      });

      // Current active membership (Premium All-Access)
      const currentStart = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
      const currentEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      const currentM = await prisma.memberMembership.create({
        data: {
          organisationId: secondWind.id,
          memberProfileId: profile.id,
          membershipPlanId: premiumPlan.id,
          status: 'ACTIVE',
          accessScope: 'ALL_ORGANISATION_OUTLETS',
          originOutletId: perthCbd.id,
          startDate: currentStart,
          endDate: currentEnd,
          activatedAt: currentStart,
          autoRenew: true,
          planNameAtPurchase: premiumPlan.name,
          priceAtPurchase: premiumPlan.price,
          currencyAtPurchase: premiumPlan.currency,
          billingTypeAtPurchase: premiumPlan.billingType,
          durationValueAtPurchase: premiumPlan.durationValue,
          durationUnitAtPurchase: premiumPlan.durationUnit,
        },
      });

      await prisma.memberMembershipHistory.create({
        data: {
          memberMembershipId: currentM.id,
          fromStatus: 'PENDING',
          toStatus: 'ACTIVE',
          action: 'ACTIVATE',
          reason: 'Initial activation upon completion of onboarding',
        },
      });
    }
  }

  if (parqUser) {
    const profile = await prisma.memberProfile.findUnique({ where: { userId: parqUser.id } });
    if (profile) {
      const trialStart = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const trialEnd = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      const trialM = await prisma.memberMembership.create({
        data: {
          organisationId: secondWind.id,
          memberProfileId: profile.id,
          membershipPlanId: trialPlan.id,
          status: 'TRIAL',
          accessScope: 'SINGLE_OUTLET',
          originOutletId: perthCbd.id,
          startDate: trialStart,
          endDate: trialEnd,
          activatedAt: trialStart,
          trialEndsAt: trialEnd,
          autoRenew: false,
          planNameAtPurchase: trialPlan.name,
          priceAtPurchase: trialPlan.price,
          currencyAtPurchase: trialPlan.currency,
          billingTypeAtPurchase: trialPlan.billingType,
          durationValueAtPurchase: trialPlan.durationValue,
          durationUnitAtPurchase: trialPlan.durationUnit,
        },
      });

      await prisma.memberMembershipOutlet.create({
        data: {
          memberMembershipId: trialM.id,
          outletId: perthCbd.id,
        },
      });

      await prisma.memberMembershipHistory.create({
        data: {
          memberMembershipId: trialM.id,
          fromStatus: 'PENDING',
          toStatus: 'TRIAL',
          action: 'ACTIVATE',
          reason: '7-Day Experience Pass activated',
        },
      });
    }
  }

  if (flaggedUser) {
    const profile = await prisma.memberProfile.findUnique({ where: { userId: flaggedUser.id } });
    if (profile) {
      const now = new Date();
      const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await prisma.memberMembership.create({
        data: {
          organisationId: secondWind.id,
          memberProfileId: profile.id,
          membershipPlanId: basicPlan.id,
          status: 'PENDING',
          accessScope: 'SINGLE_OUTLET',
          originOutletId: perthCbd.id,
          startDate: now,
          endDate: in30,
          autoRenew: false,
          planNameAtPurchase: basicPlan.name,
          priceAtPurchase: basicPlan.price,
          currencyAtPurchase: basicPlan.currency,
          billingTypeAtPurchase: basicPlan.billingType,
          durationValueAtPurchase: basicPlan.durationValue,
          durationUnitAtPurchase: basicPlan.durationUnit,
        },
      });
    }
  }

  // ==========================================
  // DAY 6: Payments, Invoices, Billing Seeding
  // ==========================================
  console.log('💳 Seeding Day 6 Financial Data...');

  // 1. Seed Promotional Discounts
  await prisma.discount.upsert({
    where: { organisationId_code: { organisationId: secondWind.id, code: 'WELCOME10' } },
    update: {},
    create: {
      organisationId: secondWind.id,
      code: 'WELCOME10',
      name: 'Welcome Special 10% Off',
      type: 'PERCENTAGE',
      percentage: 10,
      active: true,
      usageLimit: 500,
      startsAt: new Date(),
    },
  });

  await prisma.discount.upsert({
    where: { organisationId_code: { organisationId: secondWind.id, code: 'FOUNDER50' } },
    update: {},
    create: {
      organisationId: secondWind.id,
      code: 'FOUNDER50',
      name: 'Founding Member $50 Credit',
      type: 'FIXED_AMOUNT',
      valueMinor: 5000,
      active: true,
      usageLimit: 100,
      startsAt: new Date(),
    },
  });

  // 2. Seed Payment Method and Invoices for Active Member
  if (activeUser) {
    const activeProfile = await prisma.memberProfile.findUnique({
      where: { userId: activeUser.id },
    });

    if (activeProfile) {
      // Tokenized Mock Card
      const defaultCard = await prisma.paymentMethod.create({
        data: {
          organisationId: secondWind.id,
          memberProfileId: activeProfile.id,
          type: 'CARD',
          provider: 'MOCK',
          providerPaymentMethodId: 'pm_mock_visa_4242',
          brand: 'VISA',
          last4: '4242',
          expiryMonth: 12,
          expiryYear: 2028,
          isDefault: true,
          status: 'ACTIVE',
        },
      });

      // Invoice 1: Fully Paid Membership Invoice
      let paidInvoice = await prisma.invoice.findFirst({
        where: { organisationId: secondWind.id, invoiceNumber: 'INV-202608-0001-SW' },
      });

      if (!paidInvoice) {
        paidInvoice = await prisma.invoice.create({
          data: {
            organisationId: secondWind.id,
            memberProfileId: activeProfile.id,
            invoiceNumber: 'INV-202608-0001-SW',
            status: 'PAID',
            currency: 'AUD',
            subtotalMinor: 11999,
            discountMinor: 0,
            taxMinor: 1091,
            feeMinor: 0,
            totalMinor: 11999,
            amountPaidMinor: 11999,
            amountDueMinor: 0,
            dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
            paidAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
            description: 'Second Wind Premium All-Access Monthly Dues',
            lineItems: {
              create: [
                {
                  description: 'Second Wind Premium Monthly Membership',
                  quantity: 1,
                  unitAmountMinor: 11999,
                  discountMinor: 0,
                  taxMinor: 1091,
                  totalMinor: 11999,
                  membershipPlanId: premiumPlan.id,
                },
              ],
            },
          },
        });
      }

      // Succeeded Transaction for Invoice 1
      const existingTx = await prisma.paymentTransaction.findFirst({
        where: { organisationId: secondWind.id, providerTransactionId: 'mock_tx_seed_paid_001' },
      });

      if (!existingTx) {
        await prisma.paymentTransaction.create({
          data: {
            organisationId: secondWind.id,
            memberProfileId: activeProfile.id,
            invoiceId: paidInvoice.id,
            paymentMethodId: defaultCard.id,
            amountMinor: 11999,
            currency: 'AUD',
            status: 'SUCCEEDED',
            provider: 'MOCK',
            providerTransactionId: 'mock_tx_seed_paid_001',
            paymentMethodType: 'CARD',
            description: 'Payment for INV-202608-0001-SW',
            processedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
            metadata: {
              receiptUrl: 'https://fitcore.local/receipts/mock_tx_seed_paid_001',
            },
          },
        });
      }

      // Invoice 2: Open Assessment Invoice
      const existingInv2 = await prisma.invoice.findFirst({
        where: { organisationId: secondWind.id, invoiceNumber: 'INV-202609-0002-SW' },
      });

      if (!existingInv2) {
        await prisma.invoice.create({
          data: {
            organisationId: secondWind.id,
            memberProfileId: activeProfile.id,
            invoiceNumber: 'INV-202609-0002-SW',
            status: 'OPEN',
            currency: 'AUD',
            subtotalMinor: 5000,
            discountMinor: 0,
            taxMinor: 455,
            feeMinor: 0,
            totalMinor: 5000,
            amountPaidMinor: 0,
            amountDueMinor: 5000,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            description: 'Personal Training Physical Performance Assessment',
            lineItems: {
              create: [
                {
                  description: 'Initial 60-Minute Biomechanics & Conditioning Assessment',
                  quantity: 1,
                  unitAmountMinor: 5000,
                  discountMinor: 0,
                  taxMinor: 455,
                  totalMinor: 5000,
                },
              ],
            },
          },
        });
      }

      // ==========================================
      // DAY 7 SEED: PHYSICAL ACCESS & HARDWARE
      // ==========================================
      console.log('🚪 Seeding Day 7 Physical Access, Points, Devices & Credentials...');

      // 1. Access Policies (Standard Facility Hours: 06:00 to 22:00, 7 days)
      const perthPolicy = await prisma.accessPolicy.upsert({
        where: { id: 'policy_seed_perth_cbd' },
        update: {},
        create: {
          id: 'policy_seed_perth_cbd',
          organisationId: secondWind.id,
          outletId: perthCbd.id,
          name: 'Perth CBD Standard Operating Hours',
          enabled: true,
          allowedStartTime: '06:00',
          allowedEndTime: '22:00',
          allowedDays: [1, 2, 3, 4, 5, 6, 7],
          guestAllowed: false,
          staffOverrideAllowed: true,
        },
      });

      // 2. Access Points
      const perthMainPoint = await prisma.accessPoint.upsert({
        where: { id: 'point_seed_perth_main' },
        update: {},
        create: {
          id: 'point_seed_perth_main',
          organisationId: secondWind.id,
          outletId: perthCbd.id,
          name: 'Ground Floor Main Turnstile Entry',
          type: 'TURNSTILE',
          location: 'Main Lobby',
          status: 'ACTIVE',
        },
      });

      const perthStudioPoint = await prisma.accessPoint.upsert({
        where: { id: 'point_seed_perth_studio' },
        update: {},
        create: {
          id: 'point_seed_perth_studio',
          organisationId: secondWind.id,
          outletId: perthCbd.id,
          name: 'Level 2 Reformer Studio Access',
          type: 'DOOR',
          location: 'Level 2',
          status: 'ACTIVE',
        },
      });

      const fremantleMainPoint = await prisma.accessPoint.upsert({
        where: { id: 'point_seed_freo_main' },
        update: {},
        create: {
          id: 'point_seed_freo_main',
          organisationId: secondWind.id,
          outletId: fremantle.id,
          name: 'Harbor Gate Front Entrance',
          type: 'GATE',
          location: 'Courtyard Entrance',
          status: 'ACTIVE',
        },
      });

      // 3. Access Devices (Mock Turnstiles & Doors)
      const perthTurnstile = await prisma.accessDevice.upsert({
        where: { provider_providerDeviceId: { provider: 'MOCK', providerDeviceId: 'mock_dev_turnstile_perth_01' } },
        update: {},
        create: {
          id: 'dev_seed_turnstile_perth_01',
          organisationId: secondWind.id,
          outletId: perthCbd.id,
          accessPointId: perthMainPoint.id,
          name: 'SpeedGate Lane 1 (Entry)',
          type: 'TURNSTILE',
          status: 'ONLINE',
          provider: 'MOCK',
          providerDeviceId: 'mock_dev_turnstile_perth_01',
          direction: 'ENTRY',
          location: 'Lobby Lane 1',
          lastHeartbeatAt: new Date(),
        },
      });

      const perthStudioDoor = await prisma.accessDevice.upsert({
        where: { provider_providerDeviceId: { provider: 'MOCK', providerDeviceId: 'mock_dev_door_perth_studio' } },
        update: {},
        create: {
          id: 'dev_seed_door_perth_studio',
          organisationId: secondWind.id,
          outletId: perthCbd.id,
          accessPointId: perthStudioPoint.id,
          name: 'Studio Smart MagLock Reader',
          type: 'DOOR',
          status: 'ONLINE',
          provider: 'MOCK',
          providerDeviceId: 'mock_dev_door_perth_studio',
          direction: 'BOTH',
          location: 'Level 2 Door',
          lastHeartbeatAt: new Date(),
        },
      });

      const fremantleTurnstile = await prisma.accessDevice.upsert({
        where: { provider_providerDeviceId: { provider: 'MOCK', providerDeviceId: 'mock_dev_gate_freo_01' } },
        update: {},
        create: {
          id: 'dev_seed_gate_freo_01',
          organisationId: secondWind.id,
          outletId: fremantle.id,
          accessPointId: fremantleMainPoint.id,
          name: 'Harbor Entry RFID Scanner',
          type: 'READER',
          status: 'ONLINE',
          provider: 'MOCK',
          providerDeviceId: 'mock_dev_gate_freo_01',
          direction: 'ENTRY',
          location: 'Main Gate',
          lastHeartbeatAt: new Date(),
        },
      });

      // 4. Access Credentials for Active Member
      const qrCredHash = require('crypto').createHash('sha256').update('seed_qr_token_active_member').digest('hex');
      const rfidCredHash = require('crypto').createHash('sha256').update('RFID_A1B2C3D4_ACTIVE').digest('hex');

      const qrCred = await prisma.accessCredential.upsert({
        where: { organisationId_credentialReference: { organisationId: secondWind.id, credentialReference: qrCredHash } },
        update: {},
        create: {
          id: 'cred_seed_qr_active_member',
          organisationId: secondWind.id,
          memberProfileId: activeProfile.id,
          type: 'QR_CODE',
          status: 'ACTIVE',
          credentialReference: qrCredHash,
          displayIdentifier: 'Dynamic Pass Active',
          issuedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          activatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      });

      const rfidCred = await prisma.accessCredential.upsert({
        where: { organisationId_credentialReference: { organisationId: secondWind.id, credentialReference: rfidCredHash } },
        update: {},
        create: {
          id: 'cred_seed_rfid_active_member',
          organisationId: secondWind.id,
          memberProfileId: activeProfile.id,
          type: 'RFID',
          status: 'ACTIVE',
          credentialReference: rfidCredHash,
          displayIdentifier: '••••C3D4 (Key Fob)',
          issuedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          activatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      });

      // 5. Seed Historical Check-Ins and Completed Visit
      await prisma.checkIn.upsert({
        where: { id: 'checkin_seed_completed_001' },
        update: {},
        create: {
          id: 'checkin_seed_completed_001',
          organisationId: secondWind.id,
          outletId: perthCbd.id,
          memberProfileId: activeProfile.id,
          credentialId: qrCred.id,
          accessPointId: perthMainPoint.id,
          deviceId: perthTurnstile.id,
          method: 'QR',
          status: 'SUCCESS',
          checkedInAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          checkedOutAt: new Date(Date.now() - 24 * 60 * 60 * 1000 + 75 * 60 * 1000), // 75 minute workout
          source: 'TURNSTILE',
          deviceEventId: 'dev_event_seed_yesterday_001',
        },
      });

      // Seed Access Event
      const existingEvent = await prisma.accessEvent.findFirst({
        where: {
          organisationId: secondWind.id,
          memberProfileId: activeProfile.id,
          deviceId: perthTurnstile.id,
          eventType: 'CHECK_IN',
        },
      });

      if (!existingEvent) {
        await prisma.accessEvent.create({
          data: {
            organisationId: secondWind.id,
            outletId: perthCbd.id,
            memberProfileId: activeProfile.id,
            credentialId: qrCred.id,
            deviceId: perthTurnstile.id,
            accessPointId: perthMainPoint.id,
            eventType: 'CHECK_IN',
            decision: 'ALLOWED',
            reason: 'ALLOWED',
            occurredAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        });
      }
    }
  }

  // =========================================================================
  // DAY 8: BOOKING & SCHEDULING FOUNDATION SEED
  // =========================================================================
  console.log('Seeding Day 8: Booking & Scheduling Foundation...');

  // 1. Default Booking Policy
  const defaultPolicy = await prisma.bookingPolicy.upsert({
    where: { id: 'policy_seed_default_001' },
    update: {},
    create: {
      id: 'policy_seed_default_001',
      organisationId: secondWind.id,
      name: 'Standard Club Booking Policy',
      maxAdvanceBookingHours: 168, // 7 days
      minimumCancellationNoticeHours: 2, // 2 hours
      maxActiveBookings: 5,
      allowWaitlist: true,
      maxWaitlistSize: 10,
      allowLateBooking: true,
      allowCancellation: true,
      isDefault: true,
    },
  });

  // 2. Class Types
  const classTypesData = [
    {
      id: 'class_type_hiit_001',
      name: 'HIIT Surge',
      description: 'High-intensity interval training designed to push your aerobic and anaerobic limits.',
      category: 'HIIT',
      durationMinutes: 45,
      defaultCapacity: 20,
      bookingRequired: true,
      membershipEntitlementKey: 'GROUP_CLASSES',
    },
    {
      id: 'class_type_yoga_001',
      name: 'Vinyasa Flow Yoga',
      description: 'Dynamic breath-to-movement flow focusing on mobility, core stability, and mindfulness.',
      category: 'YOGA',
      durationMinutes: 60,
      defaultCapacity: 25,
      bookingRequired: true,
      membershipEntitlementKey: 'GROUP_CLASSES',
    },
    {
      id: 'class_type_strength_001',
      name: 'Strength & Conditioning Lab',
      description: 'Barbell and dumbbell structured periodization for building lean muscle and athletic power.',
      category: 'STRENGTH',
      durationMinutes: 60,
      defaultCapacity: 16,
      bookingRequired: true,
      membershipEntitlementKey: 'GROUP_CLASSES',
    },
    {
      id: 'class_type_spin_001',
      name: 'Rhythm Spin Cycle',
      description: 'High-energy indoor cycling workout synchronized to curated playlists and power intervals.',
      category: 'SPIN',
      durationMinutes: 45,
      defaultCapacity: 20,
      bookingRequired: true,
      membershipEntitlementKey: 'GROUP_CLASSES',
    },
    {
      id: 'class_type_pilates_001',
      name: 'Mat Pilates Core',
      description: 'Classical core and pelvic floor conditioning for posture, tone, and functional alignment.',
      category: 'PILATES',
      durationMinutes: 50,
      defaultCapacity: 18,
      bookingRequired: true,
      membershipEntitlementKey: 'GROUP_CLASSES',
    },
  ];

  const classTypeMap = new Map<string, any>();
  for (const ct of classTypesData) {
    const created = await prisma.classType.upsert({
      where: { id: ct.id },
      update: {},
      create: {
        ...ct,
        organisationId: secondWind.id,
        status: 'ACTIVE',
      },
    });
    classTypeMap.set(ct.id, created);
  }

  // 3. Resources (Rooms / Studios)
  const resourcesData = [
    {
      id: 'res_perth_studio_1',
      outletId: perthCbd.id,
      name: 'Studio 1 - Main Floor',
      type: 'STUDIO',
      capacity: 30,
    },
    {
      id: 'res_perth_spin_room',
      outletId: perthCbd.id,
      name: 'Spin Studio',
      type: 'ROOM',
      capacity: 22,
    },
    {
      id: 'res_perth_strength_bay',
      outletId: perthCbd.id,
      name: 'Functional Strength Bay',
      type: 'AREA',
      capacity: 20,
    },
    {
      id: 'res_freo_ocean_studio',
      outletId: fremantle.id,
      name: 'Ocean Studio',
      type: 'STUDIO',
      capacity: 25,
    },
  ];

  const resourceMap = new Map<string, any>();
  for (const res of resourcesData) {
    const created = await prisma.resource.upsert({
      where: { id: res.id },
      update: {},
      create: {
        ...res,
        organisationId: secondWind.id,
        status: 'ACTIVE',
      },
    });
    resourceMap.set(res.id, created);
  }

  // 4. Class Templates
  const templatesData = [
    {
      id: 'tmpl_hiit_morning',
      classTypeId: 'class_type_hiit_001',
      name: 'Morning HIIT Surge',
      durationMinutes: 45,
      defaultCapacity: 20,
    },
    {
      id: 'tmpl_yoga_sunrise',
      classTypeId: 'class_type_yoga_001',
      name: 'Sunrise Vinyasa Flow',
      durationMinutes: 60,
      defaultCapacity: 25,
    },
    {
      id: 'tmpl_strength_evening',
      classTypeId: 'class_type_strength_001',
      name: 'Evening Strength Lab',
      durationMinutes: 60,
      defaultCapacity: 16,
    },
    {
      id: 'tmpl_spin_lunch',
      classTypeId: 'class_type_spin_001',
      name: 'Express Lunch Spin',
      durationMinutes: 45,
      defaultCapacity: 20,
    },
  ];

  for (const tmpl of templatesData) {
    await prisma.classTemplate.upsert({
      where: { id: tmpl.id },
      update: {},
      create: {
        ...tmpl,
        organisationId: secondWind.id,
        defaultBookingPolicyId: defaultPolicy.id,
        status: 'ACTIVE',
      },
    });
  }

  // 5. Trainer Availability for Mike
  const trainerMike = await prisma.user.findFirst({
    where: { email: 'trainer.mike@secondwind.com.au' },
  });

  if (trainerMike) {
    for (let day = 1; day <= 5; day++) {
      await prisma.trainerAvailability.upsert({
        where: { id: `avail_mike_weekday_${day}` },
        update: {},
        create: {
          id: `avail_mike_weekday_${day}`,
          organisationId: secondWind.id,
          trainerId: trainerMike.id,
          dayOfWeek: day,
          startTime: '06:00',
          endTime: '18:00',
          isAvailable: true,
          timezone: 'Australia/Perth',
          notes: 'Standard weekday coaching shift',
        },
      });
    }
  }

  // 6. Scheduled Class Sessions for Today and Upcoming Days
  const now = new Date();
  const todayMorning = new Date(now);
  todayMorning.setHours(9, 0, 0, 0);

  const todayNoon = new Date(now);
  todayNoon.setHours(12, 0, 0, 0);

  const todayEvening = new Date(now);
  todayEvening.setHours(17, 30, 0, 0);

  const tomorrowMorning = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  tomorrowMorning.setHours(7, 0, 0, 0);

  const sessionsToSeed = [
    {
      id: 'session_seed_hiit_today_morning',
      outletId: perthCbd.id,
      classTypeId: 'class_type_hiit_001',
      classTemplateId: 'tmpl_hiit_morning',
      trainerId: trainerMike?.id,
      resourceId: 'res_perth_studio_1',
      bookingPolicyId: defaultPolicy.id,
      name: 'HIIT Surge - Morning Blast',
      startsAt: todayMorning,
      endsAt: new Date(todayMorning.getTime() + 45 * 60 * 1000),
      capacity: 20,
      status: 'OPEN',
      bookingOpensAt: new Date(todayMorning.getTime() - 7 * 24 * 60 * 60 * 1000),
      bookingClosesAt: new Date(todayMorning.getTime() - 15 * 60 * 1000),
      cancellationClosesAt: new Date(todayMorning.getTime() - 2 * 60 * 60 * 1000),
    },
    {
      id: 'session_seed_spin_today_noon',
      outletId: perthCbd.id,
      classTypeId: 'class_type_spin_001',
      classTemplateId: 'tmpl_spin_lunch',
      trainerId: trainerMike?.id,
      resourceId: 'res_perth_spin_room',
      bookingPolicyId: defaultPolicy.id,
      name: 'Express Lunch Spin',
      startsAt: todayNoon,
      endsAt: new Date(todayNoon.getTime() + 45 * 60 * 1000),
      capacity: 20,
      status: 'OPEN',
      bookingOpensAt: new Date(todayNoon.getTime() - 7 * 24 * 60 * 60 * 1000),
      bookingClosesAt: new Date(todayNoon.getTime() - 15 * 60 * 1000),
      cancellationClosesAt: new Date(todayNoon.getTime() - 2 * 60 * 60 * 1000),
    },
    {
      id: 'session_seed_strength_today_evening',
      outletId: perthCbd.id,
      classTypeId: 'class_type_strength_001',
      classTemplateId: 'tmpl_strength_evening',
      trainerId: trainerMike?.id,
      resourceId: 'res_perth_strength_bay',
      bookingPolicyId: defaultPolicy.id,
      name: 'Evening Strength & Conditioning Lab',
      startsAt: todayEvening,
      endsAt: new Date(todayEvening.getTime() + 60 * 60 * 1000),
      capacity: 16,
      status: 'OPEN',
      bookingOpensAt: new Date(todayEvening.getTime() - 7 * 24 * 60 * 60 * 1000),
      bookingClosesAt: new Date(todayEvening.getTime() - 15 * 60 * 1000),
      cancellationClosesAt: new Date(todayEvening.getTime() - 2 * 60 * 60 * 1000),
    },
    {
      id: 'session_seed_yoga_tomorrow_freo',
      outletId: fremantle.id,
      classTypeId: 'class_type_yoga_001',
      classTemplateId: 'tmpl_yoga_sunrise',
      trainerId: trainerMike?.id,
      resourceId: 'res_freo_ocean_studio',
      bookingPolicyId: defaultPolicy.id,
      name: 'Fremantle Sunrise Vinyasa Flow',
      startsAt: tomorrowMorning,
      endsAt: new Date(tomorrowMorning.getTime() + 60 * 60 * 1000),
      capacity: 25,
      status: 'OPEN',
      bookingOpensAt: new Date(tomorrowMorning.getTime() - 7 * 24 * 60 * 60 * 1000),
      bookingClosesAt: new Date(tomorrowMorning.getTime() - 15 * 60 * 1000),
      cancellationClosesAt: new Date(tomorrowMorning.getTime() - 2 * 60 * 60 * 1000),
    },
  ];

  for (const sess of sessionsToSeed) {
    await prisma.classSession.upsert({
      where: { id: sess.id },
      update: {},
      create: {
        ...sess,
        organisationId: secondWind.id,
      },
    });
  }

  // 7. Seed Sample Confirmed Booking for Active Member
  const bookingSeedUser = await prisma.user.findFirst({
    where: { email: 'active.member@secondwind.com.au' },
  });
  if (bookingSeedUser) {
    const bookingSeedProfile = await prisma.memberProfile.findFirst({
      where: { userId: bookingSeedUser.id, organisationId: secondWind.id },
    });

    if (bookingSeedProfile) {
      await prisma.booking.upsert({
        where: { id: 'booking_seed_active_member_001' },
        update: {},
        create: {
          id: 'booking_seed_active_member_001',
          organisationId: secondWind.id,
          outletId: perthCbd.id,
          memberProfileId: bookingSeedProfile.id,
          classSessionId: 'session_seed_hiit_today_morning',
          status: 'CONFIRMED',
          bookedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
        },
      });
    }
  }

  console.log('✅ FitCore Database Seeding Completed (Day 8: Booking & Scheduling Foundation).');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


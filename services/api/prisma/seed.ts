import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding FitCore Multi-Tenant Database (Day 3)...');

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
    // Users & Members
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

  // Helper to link role and permission
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

  // Assign permissions to SUPERADMIN
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
  ];
  for (const k of managerPerms) {
    await linkRolePerm('OUTLET_MANAGER', k);
  }

  // Assign permissions to RECEPTION
  const receptionPerms = [
    'organisations:READ:ORGANISATION',
    'outlets:READ:OUTLET',
    'users:READ:OUTLET',
    'users:READ:SELF',
    'users:UPDATE:SELF',
  ];
  for (const k of receptionPerms) {
    await linkRolePerm('RECEPTION', k);
  }

  // Assign permissions to TRAINER
  const trainerPerms = [
    'organisations:READ:ORGANISATION',
    'outlets:READ:OUTLET',
    'users:READ:SELF',
    'users:UPDATE:SELF',
  ];
  for (const k of trainerPerms) {
    await linkRolePerm('TRAINER', k);
  }

  // Assign permissions to MEMBER
  const memberPerms = [
    'users:READ:SELF',
    'users:UPDATE:SELF',
  ];
  for (const k of memberPerms) {
    await linkRolePerm('MEMBER', k);
  }

  // 3. Seed Primary Demo Tenant: Second Wind Athletic Club
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

  const outletFremantle = await prisma.outlet.upsert({
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

  // 4. Seed Secondary Tenant (Apex Strength Co)
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

  await prisma.outlet.upsert({
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

  // 5. Seed Users
  const passwordHash = await bcrypt.hash('FitCoreDev2026!', 10);

  const testUsers = [
    { email: 'superadmin@fitcore.io', role: 'SUPERADMIN', firstName: 'Platform', lastName: 'Admin', orgId: secondWind.id, outletId: null, status: 'ACTIVE' },
    { email: 'owner@secondwind.com.au', role: 'ORGANISATION_OWNER', firstName: 'Jack', lastName: 'Darling', orgId: secondWind.id, outletId: null, status: 'ACTIVE' },
    { email: 'manager@secondwind.com.au', role: 'OUTLET_MANAGER', firstName: 'Sarah', lastName: 'Miller', orgId: secondWind.id, outletId: outletPerth.id, status: 'ACTIVE' },
    { email: 'reception@secondwind.com.au', role: 'RECEPTION', firstName: 'Emma', lastName: 'Watson', orgId: secondWind.id, outletId: outletPerth.id, status: 'ACTIVE' },
    { email: 'trainer@secondwind.com.au', role: 'TRAINER', firstName: 'Marcus', lastName: 'Vance', orgId: secondWind.id, outletId: outletPerth.id, status: 'ACTIVE' },
    { email: 'finance@secondwind.com.au', role: 'FINANCE', firstName: 'Oliver', lastName: 'Queen', orgId: secondWind.id, outletId: null, status: 'ACTIVE' },
    { email: 'member@secondwind.com.au', role: 'MEMBER', firstName: 'Alex', lastName: 'Mercer', orgId: secondWind.id, outletId: outletPerth.id, status: 'ACTIVE' },
    // Apex Strength member for isolation tests
    { email: 'member@apexstrength.com.au', role: 'MEMBER', firstName: 'Chloe', lastName: 'Price', orgId: apexStrength.id, outletId: null, status: 'ACTIVE' },
    // Disabled and suspended accounts for security tests
    { email: 'disabled@secondwind.com.au', role: 'MEMBER', firstName: 'Dave', lastName: 'Disabled', orgId: secondWind.id, outletId: outletPerth.id, status: 'DISABLED' },
    { email: 'suspended@secondwind.com.au', role: 'MEMBER', firstName: 'Sam', lastName: 'Suspended', orgId: secondWind.id, outletId: outletPerth.id, status: 'SUSPENDED' },
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
  }

  console.log('✅ FitCore Database Seeding Completed.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

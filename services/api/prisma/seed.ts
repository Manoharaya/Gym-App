import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding FitCore Multi-Tenant Database...');

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

  // 2. Seed Baseline Permissions
  const permissionsData = [
    { resource: 'organisations', action: 'MANAGE', scope: 'PLATFORM', description: 'Manage all organisations globally' },
    { resource: 'organisations', action: 'READ', scope: 'PLATFORM', description: 'Read all organisations globally' },
    { resource: 'outlets', action: 'MANAGE', scope: 'ORGANISATION', description: 'Manage outlets within own organisation' },
    { resource: 'outlets', action: 'READ', scope: 'ORGANISATION', description: 'Read outlets within own organisation' },
    { resource: 'outlets', action: 'READ', scope: 'OUTLET', description: 'Read assigned outlet details' },
    { resource: 'members', action: 'MANAGE', scope: 'ORGANISATION', description: 'Manage members across all outlets' },
    { resource: 'members', action: 'READ', scope: 'OUTLET', description: 'Read members at assigned outlet' },
    { resource: 'members', action: 'READ', scope: 'ASSIGNED_CLIENTS', description: 'Read trainer assigned clients' },
    { resource: 'members', action: 'READ', scope: 'SELF', description: 'Read own member profile' },
    { resource: 'members', action: 'UPDATE', scope: 'SELF', description: 'Update own member profile' },
    { resource: 'workouts', action: 'MANAGE', scope: 'ASSIGNED_CLIENTS', description: 'Manage workouts for assigned clients' },
    { resource: 'workouts', action: 'READ', scope: 'SELF', description: 'Read own workout logs' },
    { resource: 'workouts', action: 'CREATE', scope: 'SELF', description: 'Log own workout' },
    { resource: 'reports', action: 'READ', scope: 'ORGANISATION', description: 'Read executive financial reports' },
    { resource: 'reports', action: 'READ', scope: 'OUTLET', description: 'Read branch attendance reports' },
    { resource: 'audit_logs', action: 'READ', scope: 'ORGANISATION', description: 'Read compliance audit logs' },
  ];

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

    // Link baseline permissions to roles
    if (p.scope === 'PLATFORM') {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: rolesMap.get('SUPERADMIN')!, permissionId: perm.id } },
        update: {},
        create: { roleId: rolesMap.get('SUPERADMIN')!, permissionId: perm.id },
      });
    } else if (p.scope === 'ORGANISATION') {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: rolesMap.get('ORGANISATION_OWNER')!, permissionId: perm.id } },
        update: {},
        create: { roleId: rolesMap.get('ORGANISATION_OWNER')!, permissionId: perm.id },
      });
    } else if (p.scope === 'SELF') {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: rolesMap.get('MEMBER')!, permissionId: perm.id } },
        update: {},
        create: { roleId: rolesMap.get('MEMBER')!, permissionId: perm.id },
      });
    }
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

  // 4. Seed Secondary Tenant (for Cross-Tenant Security Isolation Testing)
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

  // 5. Seed Test Users (Standard test password: "FitCoreDev2026!")
  const passwordHash = await bcrypt.hash('FitCoreDev2026!', 10);

  const testUsers = [
    { email: 'superadmin@fitcore.io', role: 'SUPERADMIN', firstName: 'Platform', lastName: 'Admin', orgId: secondWind.id, outletId: null },
    { email: 'owner@secondwind.com.au', role: 'ORGANISATION_OWNER', firstName: 'Jack', lastName: 'Darling', orgId: secondWind.id, outletId: null },
    { email: 'manager@secondwind.com.au', role: 'OUTLET_MANAGER', firstName: 'Sarah', lastName: 'Miller', orgId: secondWind.id, outletId: outletPerth.id },
    { email: 'reception@secondwind.com.au', role: 'RECEPTION', firstName: 'Emma', lastName: 'Watson', orgId: secondWind.id, outletId: outletPerth.id },
    { email: 'trainer@secondwind.com.au', role: 'TRAINER', firstName: 'Marcus', lastName: 'Vance', orgId: secondWind.id, outletId: outletPerth.id },
    { email: 'finance@secondwind.com.au', role: 'FINANCE', firstName: 'Oliver', lastName: 'Queen', orgId: secondWind.id, outletId: null },
    { email: 'member@secondwind.com.au', role: 'MEMBER', firstName: 'Alex', lastName: 'Mercer', orgId: secondWind.id, outletId: outletPerth.id },
    // User belonging to Apex Strength for cross-tenant tests
    { email: 'member@apexstrength.com.au', role: 'MEMBER', firstName: 'Chloe', lastName: 'Price', orgId: apexStrength.id, outletId: null },
  ];

  for (const u of testUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash },
      create: {
        email: u.email,
        passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        displayName: `${u.firstName} ${u.lastName}`,
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
      },
    });

    const roleId = rolesMap.get(u.role);
    if (roleId) {
      // Upsert UserRole
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

      // Assign to outlet if specified
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

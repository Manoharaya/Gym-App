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

  console.log('✅ FitCore Database Seeding Completed (Day 5).');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


import { hasPermission } from '@fitcore/utils';
import { DEFAULT_ROLE_PERMISSIONS } from '@fitcore/constants';
import type { UserPermissionContext } from '@fitcore/types';

describe('Role & Permission Evaluation Engine', () => {
  it('allows Superadmin to access any resource across platform scope', () => {
    const superadminContext: UserPermissionContext = {
      role: 'SUPERADMIN',
      permissions: DEFAULT_ROLE_PERMISSIONS.SUPERADMIN,
      allowedOutlets: [],
    };

    const allowed = hasPermission({
      context: superadminContext,
      resource: 'organisations',
      action: 'manage',
      targetScope: 'PLATFORM',
    });

    expect(allowed).toBe(true);
  });

  it('allows Members to write their own workouts under SELF scope', () => {
    const memberContext: UserPermissionContext = {
      role: 'MEMBER',
      permissions: DEFAULT_ROLE_PERMISSIONS.MEMBER,
      allowedOutlets: ['outlet_dev_perth_cbd_001'],
    };

    const allowed = hasPermission({
      context: memberContext,
      resource: 'workouts',
      action: 'write',
      targetUserId: 'usr_member_123',
      currentUserId: 'usr_member_123',
    });

    expect(allowed).toBe(true);
  });

  it('denies Members from accessing other members workouts', () => {
    const memberContext: UserPermissionContext = {
      role: 'MEMBER',
      permissions: DEFAULT_ROLE_PERMISSIONS.MEMBER,
      allowedOutlets: ['outlet_dev_perth_cbd_001'],
    };

    const allowed = hasPermission({
      context: memberContext,
      resource: 'workouts',
      action: 'write',
      targetUserId: 'usr_another_member_456',
      currentUserId: 'usr_member_123',
    });

    expect(allowed).toBe(false);
  });

  it('denies Members from managing outlet facilities', () => {
    const memberContext: UserPermissionContext = {
      role: 'MEMBER',
      permissions: DEFAULT_ROLE_PERMISSIONS.MEMBER,
      allowedOutlets: ['outlet_dev_perth_cbd_001'],
    };

    const allowed = hasPermission({
      context: memberContext,
      resource: 'outlets',
      action: 'manage',
    });

    expect(allowed).toBe(false);
  });
});

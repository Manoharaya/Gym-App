/**
 * DEVELOPMENT SEED DATA ONLY
 *
 * IMPORTANT ARCHITECTURAL RULE:
 * This data is strictly for local development, tests, and preview shells.
 * Second Wind Athletic Club and Perth CBD are NEVER hardcoded as platform assumptions.
 */

import type { TenantContext } from '@fitcore/types';

export const DEV_SEED_TENANT: TenantContext = {
  organisationId: 'org_dev_secondwind_001',
  organisationName: 'Second Wind Athletic Club',
  outletId: 'outlet_dev_perth_cbd_001',
  outletName: 'Perth CBD',
  userId: 'usr_dev_member_001',
  role: 'MEMBER',
  isDevSeed: true,
  branding: {
    primaryColor: '#E63946',
    secondaryColor: '#1D3557',
    accentColor: '#457B9D',
    appName: 'Second Wind',
    tagline: 'Elite Strength & Conditioning',
    currencyCode: 'AUD',
    timezone: 'Australia/Perth',
  },
};

export const DEV_SEED_OUTLETS = [
  {
    id: 'outlet_dev_perth_cbd_001',
    organisationId: 'org_dev_secondwind_001',
    name: 'Perth CBD',
    code: 'SW-PERTH-CBD',
    timezone: 'Australia/Perth',
    currency: 'AUD',
    status: 'ACTIVE' as const,
    address: {
      street: '100 St Georges Terrace',
      city: 'Perth',
      state: 'WA',
      postalCode: '6000',
      country: 'Australia',
    },
    contact: {
      phone: '+61 8 9000 0001',
      email: 'perth@secondwind.com.au',
    },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'outlet_dev_fremantle_002',
    organisationId: 'org_dev_secondwind_001',
    name: 'Fremantle',
    code: 'SW-FREMANTLE',
    timezone: 'Australia/Perth',
    currency: 'AUD',
    status: 'ACTIVE' as const,
    address: {
      street: '22 Marine Terrace',
      city: 'Fremantle',
      state: 'WA',
      postalCode: '6160',
      country: 'Australia',
    },
    contact: {
      phone: '+61 8 9000 0002',
      email: 'fremantle@secondwind.com.au',
    },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

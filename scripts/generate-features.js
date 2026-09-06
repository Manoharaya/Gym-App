const fs = require('fs');
const path = require('path');

const features = [
  {
    id: 'auth',
    name: 'Authentication & Session',
    desc: 'Handles credential verification, tokens, session restoration, and password management.',
  },
  {
    id: 'onboarding',
    name: 'Member Onboarding',
    desc: 'Guides new members through health profiling, waivers, and orientation tours.',
  },
  {
    id: 'profile',
    name: 'Profile & Identity',
    desc: 'Manages member biographical details, emergency contacts, and fitness goals.',
  },
  {
    id: 'membership',
    name: 'Membership & Subscriptions',
    desc: 'Coordinates membership plans, billing intervals, pauses, and renewals.',
  },
  {
    id: 'payments',
    name: 'Payments & Billing',
    desc: 'Processes direct debits, card transactions, invoices, and Xero sync.',
  },
  {
    id: 'access',
    name: 'Access Control & Entry',
    desc: 'Manages door access, QR badge scanning, and NFC turnstile authentication.',
  },
  {
    id: 'booking',
    name: 'Appointments & Booking',
    desc: 'Schedules personal training, consultations, and class reservations.',
  },
  {
    id: 'training',
    name: 'Training Programs & Workouts',
    desc: 'Manages workout prescriptions, active session tracking, and exercise logs.',
  },
  {
    id: 'exercises',
    name: 'Exercise Library',
    desc: 'Curated exercise video demonstrations, muscle mappings, and cues.',
  },
  {
    id: 'progress',
    name: 'Progress & Body Metrics',
    desc: 'Visualizes weight, body fat %, measurements, and strength milestones.',
  },
  {
    id: 'nutrition',
    name: 'Nutrition & Macros',
    desc: 'Tracks dietary intake, caloric goals, and macronutrient breakdowns.',
  },
  {
    id: 'ai-coach',
    name: 'AI Fitness Coach',
    desc: 'Orchestrates generative advice through backend FitCore AI gateway.',
  },
  {
    id: 'check-ins',
    name: 'Coach Check-Ins',
    desc: 'Structured periodic feedback loops between members and assigned trainers.',
  },
  {
    id: 'wearables',
    name: 'Wearables & Telemetry',
    desc: 'Synchronizes biometric data from Apple Health, Garmin, Whoop, and Oura.',
  },
  {
    id: 'communication',
    name: 'Direct & Club Messaging',
    desc: 'Enables 1-on-1 trainer chat and broadcast announcements.',
  },
  {
    id: 'notifications',
    name: 'Notification Center',
    desc: 'Delivers push notifications, in-app alerts, and quiet hours preferences.',
  },
  {
    id: 'retail',
    name: 'Retail & POS Store',
    desc: 'Facilitates front-desk and in-app purchases for supplements and club merchandise.',
  },
  {
    id: 'trainer',
    name: 'Trainer Portal',
    desc: 'Staff portal for trainers to monitor client rosters, programs, and schedules.',
  },
  {
    id: 'reception',
    name: 'Reception & Front Desk',
    desc: 'Staff portal for check-in verification, fast POS, and facility walk-ins.',
  },
  {
    id: 'dashboard',
    name: 'Role Dashboards',
    desc: 'Aggregated analytics and operational summaries tailored to user role.',
  },
  {
    id: 'settings',
    name: 'Club & App Settings',
    desc: 'Tenant customization, device permissions, and security configuration.',
  },
  {
    id: 'documents',
    name: 'Documents & Waivers',
    desc: 'Encrypted medical clearances, liability waivers, and contract archives.',
  },
  {
    id: 'consent',
    name: 'Legal Consent & Terms',
    desc: 'Tracks regulatory privacy policy, terms of service, and health data agreements.',
  },
  {
    id: 'support',
    name: 'Member Support & Help',
    desc: 'In-app FAQs, ticket submissions, and facility staff assistance.',
  },
];

const baseDir = path.resolve(__dirname, '../apps/mobile/src/features');

features.forEach((f) => {
  const fDir = path.join(baseDir, f.id);
  const subdirs = [
    'components',
    'screens',
    'hooks',
    'services',
    'store',
    'types',
    'validation',
    'constants',
  ];

  subdirs.forEach((sd) => {
    fs.mkdirSync(path.join(fDir, sd), { recursive: true });
  });

  // types/index.ts
  fs.writeFileSync(
    path.join(fDir, 'types', 'index.ts'),
    `/**
 * ${f.name} Types
 * ${f.desc}
 */

export interface ${capitalize(camelCase(f.id))}State {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}
`
  );

  // constants/index.ts
  fs.writeFileSync(
    path.join(fDir, 'constants', 'index.ts'),
    `/**
 * ${f.name} Constants
 */

export const ${f.id.toUpperCase().replace(/-/g, '_')}_FEATURE_KEY = '${f.id}' as const;
`
  );

  // validation/index.ts
  fs.writeFileSync(
    path.join(fDir, 'validation', 'index.ts'),
    `/**
 * ${f.name} Validation Schemas
 * Specific input validators will be defined in subsequent development phases.
 */

import { z } from 'zod';

export const ${camelCase(f.id)}QuerySchema = z.object({
  featureId: z.literal('${f.id}'),
});
`
  );

  // services/index.ts
  fs.writeFileSync(
    path.join(fDir, 'services', 'index.ts'),
    `/**
 * ${f.name} Service
 * Strict boundary: routes through FitCore ApiClient, never calling raw fetch or external LLMs.
 */

import { apiClient } from '../../../services/api';

export class ${capitalize(camelCase(f.id))}Service {
  // TODO: Implement domain-specific endpoints in feature milestone
  static async getStatus(): Promise<{ enabled: boolean }> {
    const res = await apiClient.get<{ enabled: boolean }>('/features/${f.id}/status');
    return res.data;
  }
}
`
  );

  // store/index.ts
  fs.writeFileSync(
    path.join(fDir, 'store', 'index.ts'),
    `/**
 * ${f.name} State Store
 */

import { create } from 'zustand';
import type { ${capitalize(camelCase(f.id))}State } from '../types';

export const use${capitalize(camelCase(f.id))}Store = create<${capitalize(camelCase(f.id))}State>(() => ({
  isInitialized: false,
  isLoading: false,
  error: null,
}));
`
  );

  // hooks/index.ts
  fs.writeFileSync(
    path.join(fDir, 'hooks', 'index.ts'),
    `/**
 * ${f.name} Custom Hooks
 */

import { use${capitalize(camelCase(f.id))}Store } from '../store';

export function use${capitalize(camelCase(f.id))}() {
  const store = use${capitalize(camelCase(f.id))}Store();
  return {
    ...store,
  };
}
`
  );

  // components/index.ts
  fs.writeFileSync(
    path.join(fDir, 'components', 'index.ts'),
    `/**
 * ${f.name} Presentation Components
 * Reusable domain components for this feature module.
 */

export {};
`
  );

  // screens/index.ts
  fs.writeFileSync(
    path.join(fDir, 'screens', 'index.ts'),
    `/**
 * ${f.name} Screens
 * Screen implementations deferred to feature milestone.
 */

export {};
`
  );

  // index.ts
  fs.writeFileSync(
    path.join(fDir, 'index.ts'),
    `/**
 * Feature Module: ${f.name}
 * ${f.desc}
 */

export * from './types';
export * from './constants';
export * from './validation';
export * from './services';
export * from './store';
export * from './hooks';
export * from './components';
export * from './screens';
`
  );
});

function camelCase(str) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

console.log('Successfully generated all 24 feature modules with strict architectural boundaries.');

/**
 * FitCore — Day 50: Marketplace Constants
 */

export const MARKETPLACE_DEFAULT_CATEGORIES = [
  {
    slug: 'business-apps',
    name: 'Business Apps',
    description: 'Third-party SaaS tools, member portals, and business workflow automations',
    icon: 'Briefcase',
    sortOrder: 1,
  },
  {
    slug: 'integrations',
    name: 'Hardware & Platform Integrations',
    description: 'Turnstiles, wearable biometrics, smart locks, payment gateways, and accounting tools',
    icon: 'Layers',
    sortOrder: 2,
  },
  {
    slug: 'ai-agents',
    name: 'AI Agents & Assistants',
    description: 'Autonomous voice receptionists, churn predictors, workout co-pilots, and sales agents',
    icon: 'Bot',
    sortOrder: 3,
  },
  {
    slug: 'trainers-coaches',
    name: 'Trainers & Coaches',
    description: 'Certified personal trainers, nutrition coaches, and strength specialists',
    icon: 'UserCheck',
    sortOrder: 4,
  },
  {
    slug: 'training-programs',
    name: 'Training Programs',
    description: 'Periodised strength templates, 12-week hypertrophy splits, and rehabilitation protocols',
    icon: 'Activity',
    sortOrder: 5,
  },
  {
    slug: 'wellness-services',
    name: 'Wellness & Recovery Services',
    description: 'Physiotherapy, remedial massage, cryotherapy, and DXA body composition scans',
    icon: 'Heart',
    sortOrder: 6,
  },
];

export const MARKETPLACE_PERMISSIONS_CATALOG = [
  'members:read',
  'members:write',
  'bookings:read',
  'bookings:write',
  'classes:read',
  'classes:write',
  'checkins:read',
  'checkins:write',
  'payments:read',
  'payments:write',
  'communications:send',
  'devices:access',
  'webhooks:receive',
  'health:parq:read', // SENSITIVE HEALTH PII
  'health:biometrics:read', // SENSITIVE HEALTH PII
  'health:wearables:read', // SENSITIVE HEALTH PII
];

export const HEALTH_PII_PERMISSIONS = new Set([
  'health:parq:read',
  'health:biometrics:read',
  'health:wearables:read',
]);

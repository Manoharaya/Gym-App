/**
 * FitCore — Day 48: Integration Registry Service
 *
 * Central registry of all supported external integrations, their capabilities,
 * authentication types, supported scopes, and operational metadata.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import {
  IntegrationMetadata,
  IntegrationCategory,
  IntegrationCapability,
  IntegrationScope,
} from '@fitcore/types';

@Injectable()
export class IntegrationRegistry {
  private readonly providers: Map<string, IntegrationMetadata> = new Map();

  constructor() {
    this.registerCoreProviders();
  }

  private registerCoreProviders(): void {
    const catalog: IntegrationMetadata[] = [
      // PAYMENTS
      {
        integrationKey: 'STRIPE',
        displayName: 'Stripe Payments',
        category: 'PAYMENTS',
        provider: 'STRIPE',
        description: 'Global credit card, direct debit, and Apple Pay payment processing.',
        version: '1.0.0',
        author: 'FitCore Core Team',
        capabilities: ['PAYMENTS', 'REFUNDS', 'WEBHOOKS'],
        supportedScopes: ['ORGANISATION'],
        supportedEnvironments: ['DEVELOPMENT', 'STAGING', 'PRODUCTION'],
        authenticationType: 'API_KEY',
        webhookSupport: true,
        syncSupport: false,
        status: 'GA',
      },
      // ACCOUNTING
      {
        integrationKey: 'XERO',
        displayName: 'Xero Cloud Accounting',
        category: 'ACCOUNTING',
        provider: 'XERO',
        description: 'Synchronize invoices, payments, tax rates, and customer contacts to Xero.',
        version: '1.2.0',
        author: 'FitCore Financial Team',
        capabilities: ['CONTACTS', 'INVOICES', 'PAYMENTS', 'REFUNDS', 'CREDIT_NOTES', 'WEBHOOKS', 'ACCOUNTING_SYNC'],
        supportedScopes: ['ORGANISATION'],
        supportedEnvironments: ['DEVELOPMENT', 'STAGING', 'PRODUCTION'],
        authenticationType: 'OAUTH2',
        webhookSupport: true,
        syncSupport: true,
        status: 'GA',
      },
      {
        integrationKey: 'QUICKBOOKS',
        displayName: 'QuickBooks Online',
        category: 'ACCOUNTING',
        provider: 'QUICKBOOKS',
        description: 'Automated general ledger syncing for sales, refunds, and customer accounts.',
        version: '1.1.0',
        author: 'FitCore Financial Team',
        capabilities: ['CONTACTS', 'INVOICES', 'PAYMENTS', 'REFUNDS', 'ACCOUNTING_SYNC'],
        supportedScopes: ['ORGANISATION'],
        supportedEnvironments: ['DEVELOPMENT', 'STAGING', 'PRODUCTION'],
        authenticationType: 'OAUTH2',
        webhookSupport: true,
        syncSupport: true,
        status: 'GA',
      },
      // COMMUNICATIONS - SMS & MESSAGING
      {
        integrationKey: 'TWILIO',
        displayName: 'Twilio SMS & Messaging',
        category: 'SMS',
        provider: 'TWILIO',
        description: 'High-throughput SMS delivery and delivery receipt tracking.',
        version: '1.0.0',
        author: 'FitCore Communications',
        capabilities: ['SMS', 'MESSAGES', 'WEBHOOKS'],
        supportedScopes: ['ORGANISATION', 'OUTLET'],
        supportedEnvironments: ['DEVELOPMENT', 'STAGING', 'PRODUCTION'],
        authenticationType: 'API_KEY',
        webhookSupport: true,
        syncSupport: false,
        status: 'GA',
      },
      {
        integrationKey: 'WHATSAPP',
        displayName: 'WhatsApp Business API',
        category: 'MESSAGING',
        provider: 'WHATSAPP',
        description: 'Interactive WhatsApp messaging, session notifications, and member alerts.',
        version: '1.0.0',
        author: 'FitCore Communications',
        capabilities: ['WHATSAPP', 'MESSAGES', 'WEBHOOKS'],
        supportedScopes: ['ORGANISATION', 'OUTLET'],
        supportedEnvironments: ['DEVELOPMENT', 'STAGING', 'PRODUCTION'],
        authenticationType: 'API_KEY',
        webhookSupport: true,
        syncSupport: false,
        status: 'GA',
      },
      // COMMUNICATIONS - EMAIL
      {
        integrationKey: 'SENDGRID',
        displayName: 'SendGrid Email',
        category: 'EMAIL',
        provider: 'SENDGRID',
        description: 'Transactional and marketing email delivery with bounce and open tracking.',
        version: '1.0.0',
        author: 'FitCore Communications',
        capabilities: ['EMAIL', 'WEBHOOKS'],
        supportedScopes: ['ORGANISATION', 'OUTLET'],
        supportedEnvironments: ['DEVELOPMENT', 'STAGING', 'PRODUCTION'],
        authenticationType: 'API_KEY',
        webhookSupport: true,
        syncSupport: false,
        status: 'GA',
      },
      {
        integrationKey: 'RESEND',
        displayName: 'Resend Email API',
        category: 'EMAIL',
        provider: 'RESEND',
        description: 'Modern developer-first transactional email provider.',
        version: '1.0.0',
        author: 'FitCore Communications',
        capabilities: ['EMAIL', 'WEBHOOKS'],
        supportedScopes: ['ORGANISATION', 'OUTLET'],
        supportedEnvironments: ['DEVELOPMENT', 'STAGING', 'PRODUCTION'],
        authenticationType: 'API_KEY',
        webhookSupport: true,
        syncSupport: false,
        status: 'GA',
      },
      // WEARABLES
      {
        integrationKey: 'APPLE_HEALTH',
        displayName: 'Apple HealthKit',
        category: 'WEARABLE',
        provider: 'APPLE_HEALTH',
        description: 'Direct mobile sync of heart rate, steps, sleep, and workout telemetry.',
        version: '1.0.0',
        author: 'FitCore Health Team',
        capabilities: ['HEALTH_DATA_READ', 'SYNC'],
        supportedScopes: ['MEMBER'],
        supportedEnvironments: ['DEVELOPMENT', 'STAGING', 'PRODUCTION'],
        authenticationType: 'DEVICE_TOKEN',
        webhookSupport: false,
        syncSupport: true,
        status: 'GA',
      },
      {
        integrationKey: 'HEALTH_CONNECT',
        displayName: 'Google Health Connect',
        category: 'WEARABLE',
        provider: 'HEALTH_CONNECT',
        description: 'Android Health Connect telemetry synchronization.',
        version: '1.0.0',
        author: 'FitCore Health Team',
        capabilities: ['HEALTH_DATA_READ', 'SYNC'],
        supportedScopes: ['MEMBER'],
        supportedEnvironments: ['DEVELOPMENT', 'STAGING', 'PRODUCTION'],
        authenticationType: 'DEVICE_TOKEN',
        webhookSupport: false,
        syncSupport: true,
        status: 'GA',
      },
      {
        integrationKey: 'FITBIT',
        displayName: 'Fitbit Web API',
        category: 'WEARABLE',
        provider: 'FITBIT',
        description: 'Cloud synchronization of member wearable activity, calories, and resting HR.',
        version: '1.0.0',
        author: 'FitCore Health Team',
        capabilities: ['HEALTH_DATA_READ', 'SYNC'],
        supportedScopes: ['MEMBER'],
        supportedEnvironments: ['DEVELOPMENT', 'STAGING', 'PRODUCTION'],
        authenticationType: 'OAUTH2',
        webhookSupport: true,
        syncSupport: true,
        status: 'GA',
      },
      // CALENDARS
      {
        integrationKey: 'GOOGLE_CALENDAR',
        displayName: 'Google Calendar',
        category: 'CALENDAR',
        provider: 'GOOGLE_CALENDAR',
        description: 'Staff and trainer schedule synchronization with Google Workspace.',
        version: '1.0.0',
        author: 'FitCore Scheduling',
        capabilities: ['CALENDAR_READ', 'CALENDAR_WRITE', 'SYNC'],
        supportedScopes: ['STAFF', 'ORGANISATION'],
        supportedEnvironments: ['DEVELOPMENT', 'STAGING', 'PRODUCTION'],
        authenticationType: 'OAUTH2',
        webhookSupport: true,
        syncSupport: true,
        status: 'GA',
      },
      {
        integrationKey: 'MICROSOFT_CALENDAR',
        displayName: 'Microsoft Outlook Calendar',
        category: 'CALENDAR',
        provider: 'MICROSOFT_CALENDAR',
        description: 'Microsoft 365 calendar synchronization for personal training and classes.',
        version: '1.0.0',
        author: 'FitCore Scheduling',
        capabilities: ['CALENDAR_READ', 'CALENDAR_WRITE', 'SYNC'],
        supportedScopes: ['STAFF', 'ORGANISATION'],
        supportedEnvironments: ['DEVELOPMENT', 'STAGING', 'PRODUCTION'],
        authenticationType: 'OAUTH2',
        webhookSupport: true,
        syncSupport: true,
        status: 'GA',
      },
      // ACCESS CONTROL
      {
        integrationKey: 'ACCESS_CONTROL_PROVIDER',
        displayName: 'Access Control & Turnstiles',
        category: 'ACCESS_CONTROL',
        provider: 'ACCESS_CONTROL_PROVIDER',
        description: 'Biometric, RFID, and barcode door turnstile hardware controllers.',
        version: '1.0.0',
        author: 'FitCore Access Team',
        capabilities: ['ACCESS_CONTROL', 'DEVICE_TELEMETRY', 'WEBHOOKS'],
        supportedScopes: ['OUTLET'],
        supportedEnvironments: ['DEVELOPMENT', 'STAGING', 'PRODUCTION'],
        authenticationType: 'API_KEY',
        webhookSupport: true,
        syncSupport: false,
        status: 'GA',
      },
    ];

    for (const provider of catalog) {
      this.providers.set(provider.integrationKey.toUpperCase(), provider);
    }
  }

  getProvider(key: string): IntegrationMetadata {
    const meta = this.providers.get(key.toUpperCase());
    if (!meta) {
      throw new NotFoundException(`Integration provider '${key}' is not registered`);
    }
    return meta;
  }

  listProviders(filters?: {
    category?: IntegrationCategory;
    scope?: IntegrationScope;
    capability?: IntegrationCapability;
  }): IntegrationMetadata[] {
    let result = Array.from(this.providers.values());

    if (filters?.category) {
      result = result.filter((p) => p.category === filters.category);
    }
    if (filters?.scope) {
      result = result.filter((p) => p.supportedScopes.includes(filters.scope!));
    }
    if (filters?.capability) {
      result = result.filter((p) => p.capabilities.includes(filters.capability!));
    }

    return result;
  }

  getAllCapabilities(): { capability: IntegrationCapability; description: string }[] {
    return [
      { capability: 'CONTACTS', description: 'Synchronize member and lead contacts' },
      { capability: 'INVOICES', description: 'Create and synchronize billing invoices' },
      { capability: 'PAYMENTS', description: 'Execute payments and synchronize transactions' },
      { capability: 'REFUNDS', description: 'Process and record customer refunds' },
      { capability: 'CREDIT_NOTES', description: 'Issue and synchronize credit notes' },
      { capability: 'WEBHOOKS', description: 'Receive real-time external notifications' },
      { capability: 'SYNC', description: 'Bi-directional entity synchronization' },
      { capability: 'MESSAGES', description: 'Send and receive conversational messages' },
      { capability: 'EMAIL', description: 'Deliver transactional and bulk emails' },
      { capability: 'SMS', description: 'Send SMS alerts and notifications' },
      { capability: 'WHATSAPP', description: 'Deliver WhatsApp messages and alerts' },
      { capability: 'PUSH', description: 'Send mobile push notifications' },
      { capability: 'CALENDAR_READ', description: 'Read busy/free and calendar events' },
      { capability: 'CALENDAR_WRITE', description: 'Schedule and update calendar bookings' },
      { capability: 'HEALTH_DATA_READ', description: 'Ingest wearable and biometric telemetry' },
      { capability: 'ACCESS_CONTROL', description: 'Hardware door and turnstile lock control' },
      { capability: 'DEVICE_TELEMETRY', description: 'Monitor physical device health and status' },
      { capability: 'ACCOUNTING_SYNC', description: 'General ledger reconciliation and synchronization' },
    ];
  }
}

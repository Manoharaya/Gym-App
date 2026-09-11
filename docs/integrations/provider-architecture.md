# FitCore Integration Provider Architecture

## Overview

The FitCore Integrations Platform provides a unified abstraction across heterogeneous third-party service providers. Rather than each feature domain maintaining its own direct API integrations, all external platforms are accessed through consistent provider adapters adhering to the `IntegrationProviderAdapter` contract.

---

## 1. Provider Adapter Contract

Every integration provider implements the core `IntegrationProviderAdapter` interface:

```typescript
export interface IntegrationProviderAdapter {
  readonly integrationKey: string;
  readonly provider: string;

  getMetadata(): IntegrationMetadata;
  getCapabilities(): IntegrationCapability[];

  connect(context: IntegrationAdapterContext): Promise<IntegrationAdapterConnectResult>;
  disconnect(context: IntegrationAdapterContext): Promise<void>;
  healthCheck(context: IntegrationAdapterContext): Promise<boolean>;

  verifyWebhook?(
    headers: Record<string, any>,
    rawBody: string | Buffer,
    secret?: string,
  ): Promise<IntegrationAdapterWebhookResult>;

  sync?(
    context: IntegrationAdapterContext,
    syncType: string,
    cursor?: string,
  ): Promise<IntegrationAdapterSyncResult>;
}
```

---

## 2. Consolidation of Existing Provider Domains

Rather than replacing or duplicating existing FitCore domains, Day 48 consolidates them into adapters:

| Domain | Underlying Subsystem | Integration Adapter | Key Capabilities |
| :--- | :--- | :--- | :--- |
| **Payments** | Day 6 `PaymentProviderFactory` / `IPaymentProvider` | `PaymentIntegrationAdapter` | `PAYMENTS`, `REFUNDS`, `WEBHOOKS` |
| **Accounting** | Day 43 `AccountingProviderRegistry` / `AccountingProvider` | `AccountingIntegrationAdapter` | `CONTACTS`, `INVOICES`, `PAYMENTS`, `REFUNDS`, `ACCOUNTING_SYNC` |
| **Communications** | Day 28 `CommunicationProviderFactory` / `CommunicationOrchestrator` | `CommunicationIntegrationAdapter` | `SMS`, `MESSAGES`, `EMAIL`, `WHATSAPP`, `WEBHOOKS` |
| **Wearables** | Day 23 `ProviderRegistryService` / `IWearableProvider` | `WearableIntegrationAdapter` | `HEALTH_DATA_READ`, `SYNC`, `WEBHOOKS` |
| **Access Control** | Day 7 `IAccessDeviceProvider` | `AccessIntegrationAdapter` | `ACCESS_CONTROL`, `DEVICE_TELEMETRY`, `WEBHOOKS` |
| **Calendars** | Day 48 Foundation (Google Calendar / Microsoft Calendar) | `CalendarIntegrationAdapter` | `CALENDAR_READ`, `CALENDAR_WRITE`, `SYNC`, `WEBHOOKS` |

---

## 3. Provider Metadata & Capabilities

Each provider advertises its supported scopes, environments, authentication mechanisms, and capability set via the `IntegrationRegistry`.

```json
{
  "integrationKey": "XERO",
  "displayName": "Xero Cloud Accounting",
  "category": "ACCOUNTING",
  "capabilities": [
    "CONTACTS",
    "INVOICES",
    "PAYMENTS",
    "REFUNDS",
    "CREDIT_NOTES",
    "WEBHOOKS",
    "ACCOUNTING_SYNC"
  ],
  "supportedScopes": ["ORGANISATION"],
  "supportedEnvironments": ["DEVELOPMENT", "STAGING", "PRODUCTION"],
  "authenticationType": "OAUTH2",
  "webhookSupport": true,
  "syncSupport": true,
  "status": "GA"
}
```

Features query the registry before attempting external interactions to ensure capability support.

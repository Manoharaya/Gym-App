# Provider Development Guide

## Overview
This guide instructs software engineers on how to build and register a new external provider adapter within FitCore's Integration Platform, preparing for Day 49 (Developer Platform) and Day 50 (Marketplace).

---

## 1. Implement `BaseIntegrationAdapter`

Create a new file under `services/api/src/integrations/adapters/your-provider.adapter.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { BaseIntegrationAdapter } from './base.adapter';
import { IntegrationMetadata, IntegrationCapability } from '@fitcore/types';

@Injectable()
export class YourProviderAdapter extends BaseIntegrationAdapter {
  readonly provider = 'your_provider_key';

  getMetadata(): IntegrationMetadata {
    return {
      integrationKey: 'your_provider_key',
      displayName: 'Your Provider Name',
      category: 'PAYMENTS', // or ACCOUNTING, COMMUNICATIONS, WEARABLES, CALENDAR, ACCESS_CONTROL
      provider: 'your_provider_key',
      description: 'Production integration with Your Provider',
      version: '1.0.0',
      capabilities: [
        'PAYMENT_PROCESSING',
        'WEBHOOK_INGESTION',
      ] as IntegrationCapability[],
      supportedScopes: ['ORGANISATION'],
      supportedEnvironments: ['PRODUCTION', 'SANDBOX'],
      authenticationType: 'API_KEY',
      webhookSupport: true,
      syncSupport: true,
      status: 'GA',
    };
  }

  async testConnection(credentials: Record<string, any>): Promise<{ success: boolean; latencyMs?: number; error?: string }> {
    // Ping external API endpoint
    return { success: true, latencyMs: 120 };
  }

  async verifyWebhookSignature(payload: any, signature: string, secret: string): Promise<boolean> {
    // Verify HMAC or token
    return true;
  }

  async normalizeWebhook(rawPayload: any): Promise<any> {
    return {
      externalEventId: rawPayload.id,
      eventType: rawPayload.type,
      normalizedType: 'PAYMENT_RECEIVED',
      timestamp: new Date().toISOString(),
      data: rawPayload.data,
    };
  }
}
```

---

## 2. Register in `IntegrationRegistryService`

Add your adapter to `services/api/src/integrations/core/integration-registry.service.ts`:

```typescript
constructor(
  // ... other adapters
  private readonly yourProviderAdapter: YourProviderAdapter,
) {
  this.register(this.yourProviderAdapter);
}
```

---

## 3. Register in `IntegrationsModule`

Include your adapter in `providers` and `exports` within `services/api/src/integrations/integrations.module.ts`.

---

## 4. Run Verification Suite

Ensure types build and tests pass:
```bash
pnpm --filter @fitcore/types build
pnpm --filter @fitcore/api test test/integrations.e2e-spec.ts
```

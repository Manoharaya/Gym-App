# Enterprise Integration Policies

## 1. Overview
Enterprise integration policies govern the connection of third-party systems (accounting software, CRM tools, access control hardware, payment gateways) across the organization.

## 2. Policy Enforcements
* `requireEnterpriseApproval`: Outlets cannot independently connect third-party integrations without centralized review.
* `whitelistedProviders`: Restricts active integrations to pre-vetted vendors (e.g. Xero, Stripe, Gympass).
* `syncFrequencyLimit`: Caps synchronization jobs to prevent upstream API throttling.
* `allowCustomWebhooks`: Controls whether individual locations can emit arbitrary webhook payloads.

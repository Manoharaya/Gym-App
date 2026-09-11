# Privacy Preferences & Governance

## 1. Member Privacy Controls
FitCore provides granular, member-facing privacy preference toggles:
- **`aiPersonalization`**: Controls whether AI models can ingest past workout logs, nutrition tracking, and progress metrics.
- **`wearables`**: Controls continuous biometric data streaming and insight generation.
- **`analytics`**: Controls participation in optional product usage analytics.
- **`marketing`**: Controls delivery of promotional discounts and partner offers.
- **`dataSharing`**: Controls integration with third-party fitness ecosystem partners.

## 2. Integration with Day 28 Communication Preferences
Privacy preferences integrate directly with Day 28 `CommunicationPreference` entities without duplicating storage.

### Security & Compliance Invariant
Privacy preferences **cannot** disable mandatory operational or security messaging:
- Password resets, step-up MFA codes, and session revocation alerts remain active.
- Financial tax invoices and transaction receipts remain mandatory.
- Urgent facility emergency alerts cannot be opted out of.

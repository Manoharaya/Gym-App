# Enterprise AI Governance & Safety Policies

## 1. Overview
As fitness platforms integrate AI agents (fitness coaches, receptionists, sales assistants, finance advisors), enterprise governance must ensure member privacy, medical safety, and strict compliance with health data protection laws.

## 2. AI Policy Schema & Guardrails
Enterprise AI policies govern:
* `allowExternalLlmProviders`: Prohibits sending member data to external foundation models without private tenancy agreements.
* `piiMaskingRequired`: Enforces automated anonymization of member names, email addresses, and phone numbers before AI prompt execution.
* `medicalDisclaimerEnforced`: Mandates medical safety disclaimers on workout/nutrition recommendations.
* `trainerApprovalRequired`: Requires certified human coach sign-off on AI-generated training programs before member delivery.
* `tokenBudgetMonthly`: Sets hard monthly token quotas per brand or outlet.

## 3. Hard Ceiling Enforcement
Because AI safety directly impacts member health liability and regulatory compliance, the AI safety policy at the `ORGANISATION` level operates as an immutable hard ceiling (`isHardCeiling: true`). Outlets cannot bypass safety disclaimers or disable PII masking.

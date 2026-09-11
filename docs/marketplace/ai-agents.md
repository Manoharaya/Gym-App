# Marketplace AI Agents Integration (Day 19 Alignment)

## 1. AI Orchestrator Decoupling
AI Agents published on the marketplace (e.g. Aura AI Voice Receptionist, Churn Predictor, Retention Co-Pilot) leverage the existing **Day 19 AI Orchestrator platform**.
* The marketplace handles discovery, installation scope, configuration parameters, and permission grants.
* The Day 19 AI Orchestrator executes agent logic, LLM model routing, token quotas, and conversation session persistence.
* Zero duplicate LLM client code is introduced in the marketplace module.

## 2. Configuration Schema for AI Agents
When an organization installs an AI agent, they configure tenant-specific parameters:
```json
{
  "voiceModel": "nova-2",
  "businessHoursOnly": false,
  "emergencyEscalationPhone": "+61 400 123 456",
  "defaultTrialMembershipPlanId": "plan_trial_7day",
  "greetingMessage": "Welcome to IronPeak Fitness Perth! How can I assist your workout goals today?"
}
```
Stored in `MarketplaceInstallation.config` and injected into the AI agent context at runtime.

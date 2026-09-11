# Marketplace Listings Specification

## 1. Product Archetypes
The marketplace engine models 6 distinct product archetypes under a unified manifest:
* **`APP`**: Third-party SaaS web and mobile applications (e.g. member challenge portals, custom reporting dashboards). Linked optionally to a Day 49 `DeveloperApplication`.
* **`INTEGRATION`**: Turnstiles, optical gates, IoT access controllers, payment gateways, and accounting synchronizers. Links to Day 48 `IntegrationProvider`.
* **`AI_AGENT`**: Autonomous receptionists, sales qualifying bots, retention predictive agents, and workout co-pilots. Powered by Day 19 AI Orchestrator.
* **`TRAINER`**: Certified personal trainers, strength coaches, and clinical dietitians. Linked optionally to `TrainerProfile`.
* **`PROGRAM`**: 12-week hypertrophy splits, post-rehab stability plans, and athletic periodisation templates.
* **`SERVICE`**: Mobile DXA body scanning clinics, physiotherapy sessions, and recovery van pop-ups.

## 2. Listing Metadata & Manifest Schema
Each listing contains:
```json
{
  "slug": "aura-ai-receptionist",
  "title": "Aura AI Voice Receptionist",
  "tagline": "Autonomous 24/7 inbound phone receptionist",
  "description": "Answers gym calls, books trial passes, answers inquiries, and escalates emergencies.",
  "listingType": "AI_AGENT",
  "publisherType": "FIRST_PARTY",
  "status": "PUBLISHED",
  "visibility": "PUBLIC",
  "categoryId": "cat_ai_agents",
  "currentVersion": "3.1.2",
  "pricingType": "USAGE_BASED",
  "pricingModel": { "unit": "minute", "rate": 0.08, "currency": "AUD" },
  "requiredPermissions": ["bookings:read", "bookings:write", "classes:read", "communications:send"],
  "supportedScopes": ["ORGANISATION", "OUTLET"],
  "healthPiiRequested": false,
  "capabilities": ["Bilingual phone conversation", "Live trial booking", "Emergency transfer"],
  "dependencies": [],
  "conflicts": []
}
```

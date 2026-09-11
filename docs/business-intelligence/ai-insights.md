# Grounded AI Business Insights & Management Q&A

## Overview
FitCore Day 45 incorporates an AI business advisory engine (`business_intelligence.v1`) integrated into the Day 19 AI platform. The advisory model operates on verified in-memory metric snapshots to synthesize executive observations, diagnose anomalies, and respond to strategic management inquiries.

---

## Safety & Grounding Directives

### 1. Authoritative Grounding
The AI cannot access raw external tools or make ungrounded database mutations. It is provided with a verified, structured context payload containing:
* Current & previous period KPIs.
* Active, new, reactivated, and cancelled member counts.
* Partitioned revenue and refund totals.
* Attendance frequency and class capacity fill rates.
* Churn risk population counts.

### 2. Prompt Injection & Fabrication Defense
Managers or users attempting to manipulate financial figures or prompt the AI to invent metrics are intercepted:
```ts
if (this.detectFabricationAttempt(userQuery)) {
  return {
    summary: 'Request Refused: AI cannot fabricate, override, or invent business metrics.',
    isGrounded: true,
    // ...
  };
}
```
Directives strictly prohibit:
* Simulating hypothetical revenue as actual numbers.
* Altering member counts.
* Overriding compliance restrictions.

### 3. Non-Punitive, Constructive Guidance
Recommendations focus on operational optimization rather than punitive staff blaming:
* Suggesting adjustments to class capacity during peak hours.
* Recommending follow-up protocols for declining attendance cohorts.
* Proposing automated re-engagement workflows for at-risk members.

---

## Multi-Lingual Support (English & Nepali)
The advisory engine supports English and Nepali (`ne`) responses natively:
* English: `"Overall business performance is stable with positive net momentum."`
* Nepali: `"समग्र व्यवसाय प्रदर्शन स्थिर छ र नयाँ सदस्य वृद्धि सकारात्मक छ।"`

---

## Output Contract (`BusinessAIInsight`)

```typescript
export interface BusinessAIInsight {
  summary: string;
  observations: Array<{
    metric: string;
    value: string | number;
    comparison?: string;
    evidence: string;
  }>;
  possibleExplanations?: string[];
  recommendations?: Array<{
    recommendation: string;
    reason: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
  limitations?: string[];
  confidence: number;
  isGrounded: boolean;
}
```

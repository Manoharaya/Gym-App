# AI Receptionist Conversation & Session Management

## 1. Overview
The AI Receptionist maintains persistent, multi-turn state across customer inquiries. Each customer engagement is tracked in a `ReceptionistConversation` session, with sequential `ReceptionistMessage` events capturing user questions, AI responses, citations, tool outputs, and telemetry.

---

## 2. Conversation Lifecycle

```
[ Inbound Message ]
        │
        ▼
[ Session Resolution ] ──► Existing conversationId?
        │                       │
        │                       ├── YES ──► Verify tenant & load recent transcript
        │                       └── NO  ──► Create new ReceptionistConversation
        ▼
[ Context Hydration ]
  ├── Organisation profile & operating outlets
  ├── Customer identity (Authenticated member vs. Anonymous guest)
  ├── Retrieved authoritative knowledge articles
  └── Recent message history (sliding window of last 6 messages)
        ▼
[ Intent & Ambiguity Resolution ]
  ├── If multi-outlet & outlet not specified ──► requiresClarification: true
  └── If grounded answer available ──────────► Formulate response + citations
        ▼
[ AI Response Persistence ]
  ├── Record user message in ReceptionistMessage
  ├── Record assistant message with latency & tokens
  └── Update conversation message count & lastActivityAt
        ▼
[ Escalation & Background Jobs ]
  ├── If handoff recommended ───────────────► Create ReceptionistHandoff (PENDING)
  └── If conversation idle (>10 messages) ──► ConversationSummaryJob generates summary
```

---

## 3. Data Models

### 3.1 `ReceptionistConversation`
| Field | Type | Description |
|---|---|---|
| `id` | String (CUID) | Unique session identifier |
| `organisationId` | String | Multi-tenant gym organisation |
| `outletId` | String? | Current resolved outlet (null if multi-outlet inquiry) |
| `channel` | ReceptionistChannel | `WEB_CHAT`, `MOBILE_APP`, `SMS`, `WHATSAPP`, `VOICE` |
| `status` | ReceptionistConversationStatus | `ACTIVE`, `HANDOFF_PENDING`, `HANDOFF_IN_PROGRESS`, `CLOSED`, `ARCHIVED` |
| `customerId` | String? | Member profile ID if authenticated |
| `metadata` | JSON | Prospect contact details (name, phone, email, notes) |
| `summary` | String? | Rolling LLM summary of conversation |
| `messageCount` | Int | Total messages exchanged |

### 3.2 `ReceptionistMessage`
| Field | Type | Description |
|---|---|---|
| `id` | String (CUID) | Unique message identifier |
| `conversationId` | String | Parent conversation reference |
| `role` | MessageRole | `USER`, `ASSISTANT`, `SYSTEM`, `HUMAN_STAFF` |
| `content` | String | Message text content |
| `intent` | ReceptionistIntent? | Classified conversational intent |
| `confidenceScore`| Float? | Confidence score (0.0 to 1.0) |
| `citations` | JSON | Array of authoritative source citations |
| `toolResults` | JSON | Executed read-only tool references |
| `safetyFlag` | String? | Safety flags triggered (`PROMPT_INJECTION`, etc.) |
| `tokensUsed` | Int? | Token count for cost accounting |
| `latencyMs` | Int? | Response latency in milliseconds |

---

## 4. Human Handoff Queue

When a customer asks to speak with a manager, files a complaint, or asks about an unsupported capability:
1. `handoffRecommended: true` is returned by the AI.
2. A `ReceptionistHandoff` ticket is generated in status `PENDING`.
3. The conversation status transitions to `HANDOFF_PENDING`.
4. Front desk staff can view, claim (`IN_PROGRESS`), and resolve (`RESOLVED`) the handoff ticket via the staff console (`ReceptionistAdminScreen`).

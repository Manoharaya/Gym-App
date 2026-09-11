# Privacy Requests Lifecycle

## 1. Request Types
FitCore supports standard privacy request types:
- `ACCESS`: Retrieve human-readable inventory of stored personal information.
- `EXPORT`: Generate encrypted machine-readable ZIP/JSON archive.
- `CORRECTION`: Route member to authoritative profile update screens or compliance review.
- `DELETION`: Controlled multi-domain deletion workflow.
- `RESTRICTION`: Restrict processing for AI, marketing, or analytics.
- `CONSENT_WITHDRAWAL`: Formally withdraw an optional consent.

## 2. Explicit State Machine
$$\begin{matrix}
\text{SUBMITTED} \\
\downarrow \\
\text{IDENTITY\_VERIFICATION\_REQUIRED} \\
\downarrow \\
\text{VERIFICATION\_PENDING} \\
\downarrow \\
\text{APPROVED} \\
\downarrow \\
\text{PROCESSING} \\
\downarrow \\
\text{COMPLETED}
\end{matrix}$$

- **Rejection Path**: `WAITING_FOR_REVIEW` or `VERIFICATION_PENDING` $\longrightarrow$ `REJECTED`
- **Cancellation Path**: Active requests in non-executing states can be cancelled by the requester $\longrightarrow$ `CANCELLED`
- **Failure Path**: Execution failures transition to $\longrightarrow$ `FAILED`

## 3. Identity Verification & Step-Up Integration
Sensitive privacy operations (`EXPORT`, `DELETION`) require step-up authentication using Day 52's `StepUpService`. Unverified requests remain suspended until the member satisfies the authentication challenge.

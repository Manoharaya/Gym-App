# Enterprise Administrator Security

## Guardrails
1. **No Backdoor Credential Access**: Superadmins and enterprise admins **cannot** view user passwords, MFA secrets, recovery codes, or private member health data.
2. **Server-Side Authorization**: Administrative endpoints strictly enforce role checks (`SUPERADMIN`, `ORGANISATION_OWNER`, `ENTERPRISE_ADMIN`).
3. **Mandatory Step-Up**: High-risk actions (modifying security policies, disabling MFA, deleting accounts) mandate a short-lived step-up token.
4. **Tenant Isolation**: Admins can only view and manage sessions, devices, alerts, and policies within their own organisation boundary.

# FitCore Member Lifecycle API Specification

## Base URL
`/api/v1/members`

All endpoints require Bearer JWT authentication and evaluate tenant context through `TenantGuard` and role permissions through `PermissionsGuard`.

---

## 1. Endpoints

### Member Profile
- **`GET /api/v1/members/me`**
  - **Permissions**: `member.profile:read`
  - **Description**: Returns the authenticated user's profile, member number, home outlet, and onboarding state.
  - **Responses**: `200 OK`, `404 Not Found`

- **`PUT /api/v1/members/me`**
  - **Permissions**: `member.profile:update`
  - **Description**: Updates profile details (preferred name, emergency contact details, phone number).
  - **Body**:
    ```json
    {
      "preferredName": "Alex",
      "emergencyContactName": "Sarah Doe",
      "emergencyContactPhone": "+61 400 999 888",
      "emergencyContactRelation": "Spouse"
    }
    ```
  - **Responses**: `200 OK`, `400 Bad Request`

- **`GET /api/v1/members/:id`**
  - **Permissions**: `member.profile:read`
  - **Description**: Fetches member profile by ID. Staff can view within outlet/org scope; members can only view self.
  - **Responses**: `200 OK`, `403 Forbidden`, `404 Not Found`

---

### Onboarding Lifecycle
- **`GET /api/v1/members/onboarding/status`**
  - **Permissions**: `member.onboarding:read`
  - **Description**: Fetches the member's current onboarding progress, step completion flags, and overall status.
  - **Responses**: `200 OK`

- **`POST /api/v1/members/onboarding/step`**
  - **Permissions**: `member.onboarding:update`
  - **Description**: Advances or saves progress on an onboarding step.
  - **Body**:
    ```json
    {
      "step": "PARQ",
      "stepData": { "status": "completed" }
    }
    ```
  - **Responses**: `200 OK`

- **`POST /api/v1/members/onboarding/complete`**
  - **Permissions**: `member.onboarding:complete`
  - **Description**: Verifies all required onboarding gates (Profile, PAR-Q, mandatory consents, signature) and marks onboarding complete, promoting member status to `ACTIVE`.
  - **Responses**: `200 OK`, `400 Bad Request` (if required gates unmet)

---

### Physical Activity Readiness Questionnaire (PAR-Q)
- **`GET /api/v1/members/parq/active`**
  - **Permissions**: `member.parq:read`
  - **Description**: Retrieves the active PAR-Q questionnaire with ordered questions.
  - **Responses**: `200 OK`

- **`POST /api/v1/members/parq/submit`**
  - **Permissions**: `member.parq:submit`
  - **Description**: Submits answers to the active questionnaire. Automatically evaluates risk flags.
  - **Body**:
    ```json
    {
      "questionnaireId": "uuid",
      "responses": [
        { "questionId": "q1", "answerBoolean": false },
        { "questionId": "q2", "answerBoolean": true, "notes": "Mild dizziness during high heat" }
      ]
    }
    ```
  - **Responses**: `201 Created`

- **`GET /api/v1/members/parq/submissions`**
  - **Permissions**: `member.parq:read`
  - **Description**: Returns all historical PAR-Q submissions for the member.
  - **Responses**: `200 OK`

---

### Health Screening & Injuries
- **`GET /api/v1/members/health/screening`**
  - **Permissions**: `member.health:read`
  - **Description**: Retrieves latest health screening, conditions, medications, and vitals.
  - **Responses**: `200 OK`

- **`POST /api/v1/members/health/screening`**
  - **Permissions**: `member.health:write`
  - **Description**: Submits or updates health screening records.
  - **Responses**: `201 Created`

- **`GET /api/v1/members/health/injuries`**
  - **Permissions**: `member.health:read`
  - **Description**: Lists reported injuries.
  - **Responses**: `200 OK`

- **`POST /api/v1/members/health/injuries`**
  - **Permissions**: `member.health:write`
  - **Description**: Records a new injury with severity, body area, and restrictions.
  - **Responses**: `201 Created`

---

### Legal Consent & Signatures
- **`GET /api/v1/members/consents/required`**
  - **Permissions**: `member.consent:read`
  - **Description**: Returns all active consent types and versions, flagging whether accepted by member.
  - **Responses**: `200 OK`

- **`POST /api/v1/members/consents/accept`**
  - **Permissions**: `member.consent:accept`
  - **Description**: Records acceptance of a specific consent version with client IP and user agent.
  - **Responses**: `201 Created`

- **`POST /api/v1/members/signatures`**
  - **Permissions**: `member.signature:create`
  - **Description**: Stores digital touch/stylus signature with cryptographic audit metadata.
  - **Body**:
    ```json
    {
      "signatureType": "ONBOARDING_AGREEMENT",
      "signatureData": "data:image/png;base64,iVBORw0KGgo...",
      "documentHash": "sha256-hash..."
    }
    ```
  - **Responses**: `201 Created`

---

### Secure Document Storage
- **`POST /api/v1/members/documents/upload-url`**
  - **Permissions**: `member.document:upload`
  - **Description**: Generates a secure, time-limited presigned upload URL and records pending document metadata.
  - **Body**:
    ```json
    {
      "fileName": "physician_clearance.pdf",
      "contentType": "application/pdf",
      "category": "MEDICAL_CLEARANCE"
    }
    ```
  - **Responses**: `201 Created` (returns `uploadUrl` and `documentId`)

- **`GET /api/v1/members/documents/:documentId/download-url`**
  - **Permissions**: `member.document:read`
  - **Description**: Generates a secure time-limited presigned download URL. Strictly forbids `RECEPTION` staff on medical documents.
  - **Responses**: `200 OK` (returns `downloadUrl`), `403 Forbidden`

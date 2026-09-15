# FitBeat Exercise Media & Asset Management Architecture

## 1. System Overview

The FitBeat Exercise Media & Asset Management System is designed to securely manage, validate, process, publish, and deliver rich visual assets for exercises at scale.

```text
FITBEAT MULTIMEDIA PIPELINE
┌─────────────────┐       ┌────────────────────────┐       ┌──────────────────────┐
│  Client/Admin   │ ────> │ Validation Engine      │ ────> │ Storage Layer        │
│  (Upload/Attach)│       │ (MIME/Magic/Size/Keys) │       │ (Local/S3/R2 Bucket) │
└─────────────────┘       └────────────────────────┘       └──────────────────────┘
         │                                                            │
         ▼                                                            ▼
┌─────────────────┐                                        ┌──────────────────────┐
│ RBAC & Tenant   │                                        │ Signed Temporary URLs│
│ Boundary Checks │                                        │ (HMAC Pre-signed)    │
└─────────────────┘                                        └──────────────────────┘
         │                                                            │
         ▼                                                            ▼
┌─────────────────┐                                        ┌──────────────────────┐
│ PostgreSQL DB   │ ─────────────────────────────────────> │ Mobile & Web Clients │
│ (ExerciseMedia) │                                        │ (Cards, Gallery, 3D) │
└─────────────────┘                                        └──────────────────────┘
```

---

## 2. Separation of Metadata vs. Binary Storage

FitBeat enforces an absolute separation between **Media Metadata** (relational data in PostgreSQL) and **Media Binary Blobs** (unstructured object storage):

* **PostgreSQL (`ExerciseMedia`)**:
  * `id`: Unique identifier (CUID)
  * `exerciseId`: Foreign key to `Exercise`
  * `organisationId`: Tenant ID for fast indexed isolation
  * `mediaType`: `IMAGE`, `VIDEO`, `ANIMATION`, `MODEL_3D`, `AUDIO`, `CAPTION`, etc.
  * `purpose`: Biomechanical and visual purpose (`PRIMARY_DEMONSTRATION`, `STEP_VIDEO`, etc.)
  * `storageKey`: Deterministic key in storage provider
  * `mimeType`: Verified MIME type
  * `fileExtension`: Lowercase normalized extension (`.mp4`, `.glb`, `.jpg`, `.webp`)
  * `fileSize`: Byte size
  * `durationSeconds` & `frameRate`: For videos and animations
  * `width` & `height`: Visual pixel dimensions
  * `format3d` & `modelLod`: For 3D meshes (`GLB`, `GLTF`, `USDZ`, `HIGH`, `MEDIUM`)
  * `altText`: Accessibility screen-reader description
  * `isPrimary`: Boolean enforcing single primary asset per purpose
  * `status`: Processing state (`UPLOADING`, `PROCESSING`, `READY`, `FAILED`, `ARCHIVED`)
  * `isPublished`: Publication flag governing member visibility

* **Storage Provider (`StorageProvider`)**:
  * Local development: `LocalStorageProvider` writes files to `<cwd>/uploads` and issues HMAC SHA-256 signed URLs.
  * Production: S3 / Cloudflare R2 / Google Cloud Storage with private bucket pre-signing.

---

## 3. Supported Media Types & Formats

| Media Type | Allowed MIME Types | Allowed Extensions | Max File Size |
| :--- | :--- | :--- | :--- |
| **IMAGE** | `image/jpeg`, `image/png`, `image/webp`, `image/gif` | `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif` | 15 MB |
| **THUMBNAIL** | `image/jpeg`, `image/png`, `image/webp` | `.jpg`, `.jpeg`, `.png`, `.webp` | 5 MB |
| **VIDEO** | `video/mp4`, `video/webm`, `video/quicktime` | `.mp4`, `.webm`, `.mov` | 150 MB |
| **ANIMATION** | `image/gif`, `video/webm`, `application/json` (Lottie) | `.gif`, `.webm`, `.json` | 25 MB |
| **MODEL_3D** | `model/gltf-binary`, `model/gltf+json`, `model/vnd.usdz+zip`, `application/octet-stream` | `.glb`, `.gltf`, `.usdz` | 50 MB |
| **AUDIO** | `audio/mpeg`, `audio/mp4`, `audio/ogg`, `audio/wav`, `audio/webm` | `.mp3`, `.wav`, `.ogg`, `.webm` | 25 MB |
| **CAPTION** | `text/vtt`, `application/x-subrip`, `text/plain` | `.vtt`, `.srt`, `.txt` | 5 MB |

---

## 4. Media Purposes

A single exercise supports multiple visual assets mapped to specific biomechanical roles:
1. `PRIMARY_DEMONSTRATION`: Master demonstration visual for the exercise
2. `SECONDARY_DEMONSTRATION`: Alternate camera angle (e.g. side profile, 45-degree angle)
3. `THUMBNAIL`: Card thumbnail displayed on browse lists and workout plans
4. `STEP_IMAGE`: Key frame image linked to a specific step
5. `STEP_VIDEO`: Micro-clip demonstrating a specific movement step
6. `MOVEMENT_PHASE`: Clip tied to a phase (Setup, Descent, Bottom, Lockout)
7. `COMMON_MISTAKE`: Video or photo demonstrating a form breakdown
8. `SAFETY`: Visual highlighting contraindicated joint angles or safety warnings
9. `EQUIPMENT`: Machine setup, pin placement, or barbell collar safety
10. `ANATOMY`: Anatomical muscle heatmap or schematic illustration
11. `INSTRUCTION`: Pedagogical visual breakdown
12. `PREVIEW`: Lightweight quick-loading preview
13. `3D_MODEL`: Interactive 3D GLB/GLTF mesh for 360-degree joint analysis
14. `AUDIO_GUIDANCE`: Spoken cadence, breathing cues, and tempo narration
15. `CAPTION`: Subtitle track for hearing-impaired accessibility

---

## 5. Storage Key Hierarchy & Multi-Tenancy

Storage keys are deterministically generated and strictly isolated:

* **System Exercises (Global)**:
  `fitbeat/exercises/{exerciseId}/{categoryFolder}/{timestamp}_{randomUUID}.{ext}`

* **Custom Exercises (Tenant-Isolated)**:
  `fitbeat/tenants/{organisationId}/exercises/{exerciseId}/{categoryFolder}/{timestamp}_{randomUUID}.{ext}`

Under zero-trust multi-tenancy:
* System exercises are read-only for tenants.
* Tenant A cannot view, modify, or delete Tenant B's private media assets.
* Directory traversal characters (`../`, `..\`), control characters, and null bytes are stripped.

---

## 6. API Endpoints

### Exercise Media Endpoints (`/exercise-media`)
* `GET /api/v1/exercise-media/:id` — Retrieve single media asset with pre-signed access URL
* `PATCH /api/v1/exercise-media/:id` — Update media metadata, altText, or primary status
* `DELETE /api/v1/exercise-media/:id` — Delete media and coordinate storage cleanup
* `POST /api/v1/exercise-media/:id/publish` — Publish media to make visible to members
* `POST /api/v1/exercise-media/:id/archive` — Archive media

### Exercise-Scoped Endpoints (`/exercises`)
* `GET /api/v1/exercises/:id/media` — List media gallery for exercise (role-aware visibility)
* `POST /api/v1/exercises/:id/media/presign-upload` — Generate temporary pre-signed upload URL
* `POST /api/v1/exercises/:id/media` — Attach or create media record in database
* `POST /api/v1/exercises/:id/media/upload` — Direct multipart file buffer upload

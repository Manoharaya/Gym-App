# ADR-038: Exercise Media & Asset Management System

## Status
Accepted

## Context
Day 61 established the visual exercise library taxonomy, relational models (instruction steps, movement phases, common mistakes, safety contraindications, equipment relations, variations), and grounded AI tool integration. Today (Day 62), FitBeat required an enterprise-grade Exercise Media & Asset Management System capable of securely storing, validating, transforming, publishing, and delivering multimedia visual assets (images, high-speed videos, animations, thumbnails, 3D GLB/GLTF meshes, audio coaching, and closed captions) with strict multi-tenant isolation and zero-trust security.

## Decisions

### 1. Absolute Separation of Media Metadata from Media File Storage
- Relational metadata (`ExerciseMedia` in PostgreSQL) records IDs, dimensions, framerate, duration, MIME types, format specs, purposes, and publication status.
- Binary blobs reside strictly outside the database within the storage layer managed via `StorageProvider`.
- Local development utilizes `LocalStorageProvider` (saving files into `<cwd>/uploads` with HMAC SHA-256 pre-signed URLs and directory traversal protection).
- Production environments drop in S3 or Cloudflare R2 adapters without modifying controller or business service logic.

### 2. Deterministic, Tenant-Isolated Storage Key Structure
Keys are generated programmatically using a deterministic hierarchy:
- System assets: `fitbeat/exercises/{exerciseId}/{categoryFolder}/{timestamp}_{randomUUID}.{ext}`
- Tenant assets: `fitbeat/tenants/{orgId}/exercises/{exerciseId}/{categoryFolder}/{timestamp}_{randomUUID}.{ext}`
This enforces strict isolation at the filesystem/bucket prefix level, preventing cross-tenant file collisions or enumeration attacks.

### 3. Zero-Trust Server-Side Validation Pipeline
All incoming uploads are verified server-side via `ExerciseMediaValidatorService`:
- Strict MIME-type whitelists per category (Image, Video, 3D Model, Audio, Animation, Caption).
- Extension verification ensuring declared extension matches genuine MIME type.
- Category-specific file size ceilings (15MB for Images, 150MB for Videos, 50MB for 3D Meshes, 25MB for Audio, 5MB for Captions).
- Magic byte header inspection for JPEG (`FF D8 FF`), PNG (`89 50 4E 47`), GIF (`47 49 46 38`), MP4 (`ftyp`), and GLB (`glTF`).
- Filename sanitization stripping path traversal sequences (`../`, `..\`) and dangerous shell/script extensions.

### 4. Publication Lifecycle & Primary Asset Uniqueness
- Status flow: `UPLOADING` -> `PROCESSING` -> `READY` -> `FAILED` -> `ARCHIVED`.
- Only `READY` and `isPublished: true` assets are returned in member queries. Admins and trainers have visibility into drafts and uploading assets.
- Primary visual flag (`isPrimary: true`) is enforced as unique per purpose and exercise at the service layer, automatically demoting previous primaries upon designation.

### 5. Coordinated Storage & Database Lifecycle
- Deletion is coordinated: when an asset record is deleted from PostgreSQL, `storageService.deleteStorageFile` is invoked to eliminate orphaned files from storage.
- System exercises remain strictly immutable to tenant actors, returning `403 Forbidden` on unauthorized mutation attempts.

## Consequences
- **Positive**: Resilient, scalable asset pipeline supporting up to millions of requests; zero-trust multi-tenancy; zero broken card thumbnails; rich accessibility with screen-reader `altText`.
- **Trade-offs**: Multi-step direct presigned uploads require clients to call `/presign-upload` and then `/media` (or use the server-side multipart direct upload endpoint for simple workflows).

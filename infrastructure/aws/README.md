# AWS Production Infrastructure

Target production deployment architecture:

- AWS ECS Fargate for API and AI Orchestrator containers.
- AWS Aurora Serverless v2 PostgreSQL with multi-tenant row-level security.
- AWS S3 encrypted buckets for medical clearances, progress photos, and contracts.
- AWS CloudFront CDN for web portal and static assets.
- AWS KMS for key management and hardware encryption.

# Secret Management & Credential Recovery

## 1. Zero Plaintext Invariant
> **INVARIANT**: Production secrets are never stored in Git repositories, documentation, plaintext environment dumps, or unencrypted database tables.

---

## 2. Secret Inventory & Storage System

| Secret Identifier | Primary Storage | Rotation Procedure | Recovery Dependency |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | AWS Secrets Manager | Auto-rotate every 90 days | RDS Instance Endpoint |
| `REDIS_PASSWORD` | AWS Secrets Manager | Manual rotation | Redis Cluster Auth |
| `JWT_SECRET` | AWS Secrets Manager | Invalidate & reissue tokens | None |
| `STRIPE_SECRET_KEY` | AWS Secrets Manager | Rotate in Stripe Dashboard | Stripe Gateway |
| `OPENAI_API_KEY` | AWS Secrets Manager | Rotate in OpenAI Platform | None |
| `KMS_BACKUP_KEY` | AWS KMS (`kms-key-fitcore-primary`) | Multi-region replica key | AWS IAM |

---

## 3. Secret Compromise & Ransomware Recovery
If credentials are suspected compromised:
1. Immediately invoke AWS Secrets Manager rotation lambdas.
2. Invalidate all active JWT tokens by updating `Session` table (`status: 'COMPROMISED'`).
3. Re-issue database credentials and redeploy ECS/Kubernetes tasks with updated secret references.

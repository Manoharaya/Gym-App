# Application Infrastructure & Golden Build Recovery

## 1. Golden Build Definition
The FitCore API and Web/Admin clients are built as immutable, stateless container images tagged with unique semantic versions and Git commit SHAs:
- **Registry**: AWS ECR (`fitcore/api:v1.58.0`, `fitcore/admin:v1.58.0`).
- **Configuration**: Injected exclusively via environment variables from AWS Systems Manager Parameter Store and AWS Secrets Manager at container runtime.

---

## 2. Infrastructure as Code (IaC) Recovery
1. Container definitions (Task Definitions / Helm Charts) are version-controlled in the repository.
2. In the event of cluster failure:
   ```bash
   terraform apply -var-file="environments/production.tfvars"
   ```
3. Stateless pods launch and perform readiness checks (`GET /health/ready`), verifying database and Redis connections before receiving ingress traffic.

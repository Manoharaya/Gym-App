# FitCore Cloud & Deployment Infrastructure

## Overview

Infrastructure as Code (IaC) and containerization definitions for FitCore:

- `docker/`: Local development environments (PostgreSQL, Redis, Mock API, Localstack).
- `aws/`: Production and Staging AWS CDK / Terraform manifests (ECS Fargate, Aurora PostgreSQL Serverless, CloudFront, S3, SQS).

## Multi-Tenant Security Standards

- VPC isolation with strict database security groups.
- Encryption at rest for all database volumes, S3 buckets, and telemetry data.
- Automated daily point-in-time recovery (PITR) backups.

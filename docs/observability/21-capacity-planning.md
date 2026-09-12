# 21 — Capacity Planning & Resource Forecasting

## Forecasting Signals
FitCore tracks resource growth curves across 4 key dimensions:
1. **Database Disk Growth**: Data growth per active gym organisation and member check-in history.
2. **Worker Concurrency**: Job volume distribution across peak hours (06:00 - 09:00 and 17:00 - 20:00 local gym time).
3. **AI Gateway Cost & Quotas**: Monthly token burn trajectories against provider rate limits.
4. **Network Egress**: Image/media streaming and webhook delivery throughput.

## Scaling Thresholds
- **Auto-Scale API Containers**: When CPU > 70% or average latency > 150ms over 3 minutes.
- **Auto-Scale Worker Threads**: When queue depth > 1,000 jobs or job latency > 45 seconds.
- **PostgreSQL Read-Replicas**: When read IOPs reach 75% of provisioned capacity.

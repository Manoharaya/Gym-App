# 15 — Database Observability (PostgreSQL)

## Metrics Tracked
- **Active & Idle Pool Connections**: Monitored to prevent connection starvation (`max_connections: 100`).
- **Slow Query Log**: Queries exceeding 250ms threshold are captured with normalized SQL queries (parameter values stripped).
- **Transaction Rollback Rate**: Elevated rollback rates indicate locking contention during concurrent booking rushes.
- **Table Bloat & Dead Tuples**: Autovacuum health monitored to prevent table scan degradation.
- **Replication Lag**: Monitored across read-replicas in seconds (< 1s target).

## Fail-Open Database Telemetry Invariant
Query logging wraps execution in diagnostic handlers. If the metrics reservoir fills or logging buffer overflows, queries still complete successfully without throwing exceptions back to caller.

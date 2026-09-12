# 16 — Redis & Cache Observability

## Key Telemetry Indicators
- **Memory Consumption (`used_memory_rss`)**: Monitored against `maxmemory` limit with `volatile-lru` eviction policy.
- **Cache Hit / Miss Ratio**: Maintained above 92% for session lookups and permission caches.
- **Command Latency**: Tracked via `INFO commandstats` for `GET`, `SET`, `HGETALL`, `LPUSH`.
- **Connected Clients**: Monitored to detect connection leaks in BullMQ worker threads.
- **Evicted Keys Count**: Sudden spikes indicate memory pressure requiring cluster vertical scaling.

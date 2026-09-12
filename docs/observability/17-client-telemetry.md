# 17 — Client & Mobile Telemetry

## Mobile App & Web Client Signals
The React Native mobile apps and Vite web frontends capture client-side health signals:
- **Crash Rate**: Target < 0.1% crash-free sessions.
- **Time to Interactive (TTI)**: Monitored on key member views (Dashboard, Timetable, Barcode Pass).
- **Network Request Failures**: Client-side HTTP timeouts and network drops logged with anonymized error signatures.
- **Offline Sync Health**: Outlets and apps syncing offline scans report queue flush latencies upon reconnection.

## Privacy Rules for Client Telemetry
Client telemetry never collects biometric data, location coordinates, or full member names. Client logs are anonymized with non-reversible random session IDs.

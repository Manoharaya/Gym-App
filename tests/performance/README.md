# FitCore Performance & Load Testing Framework

## Overview
The `tests/performance/` suite provides automated, repeatable load testing and performance benchmarking for FitCore without modifying production data or exposing sensitive member health PII.

## Directory Structure
```text
tests/performance/
├── config/
│   └── perf.config.ts        # Environment configurations and SLA targets
├── fixtures/
│   └── load-profiles.fixture.ts # Workload distributions (30% member, 15% booking, etc.)
├── generators/
│   └── synthetic-data.generator.ts # Synthetic datasets (Scenarios A through E)
├── scenarios/
│   ├── booking-concurrency.scenario.ts # 50 concurrent booking attempts / anti-overbooking
│   ├── access-decision.scenario.ts     # Physical access sub-50ms latency checks
│   ├── multi-tenant-isolation.scenario.ts # Noisy neighbour and cross-tenant tests
│   └── multi-outlet-analytics.scenario.ts # 1 to 100+ outlet analytics scaling
├── reports/                  # Benchmark JSON & Markdown output reports
└── runner.ts                 # Master benchmark execution runner
```

## Running Benchmarks
To run the performance benchmark scenarios:
```bash
npx tsx tests/performance/runner.ts
```

## Synthetic Scenarios Supported
- **Scenario A (Small)**: 1 organisation, 1 outlet, 500 members.
- **Scenario B (Medium)**: 1 organisation, 10 outlets, 5,000 members.
- **Scenario C (Large)**: 1 organisation, 50 outlets, 25,000 members.
- **Scenario D (Scale)**: 1 organisation, 100+ outlets, 60,000 members.
- **Scenario E (Multi-Tenant)**: Mixed multi-organisation noisy neighbour benchmark.

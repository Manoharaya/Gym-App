import { Injectable } from '@nestjs/common';
import { MetricDefinition, MetricSnapshot } from '@fitcore/types';

@Injectable()
export class MetricRegistryService {
  private readonly counters = new Map<string, number>();
  private readonly gauges = new Map<string, number>();
  private readonly histograms = new Map<string, number[]>();

  private readonly definitions: MetricDefinition[] = [
    {
      key: 'api.requests.total',
      name: 'Total API Requests',
      description: 'Aggregate count of incoming HTTP requests',
      type: 'COUNTER',
      unit: 'requests',
      service: 'API_GATEWAY',
      dimensions: ['route', 'method', 'statusClass'],
    },
    {
      key: 'api.latency.ms',
      name: 'API Latency',
      description: 'End-to-end request latency distribution',
      type: 'HISTOGRAM',
      unit: 'milliseconds',
      service: 'API_GATEWAY',
      dimensions: ['route', 'method'],
    },
    {
      key: 'api.errors.5xx',
      name: 'Server 5xx Errors',
      description: 'Count of internal server or gateway error responses',
      type: 'COUNTER',
      unit: 'errors',
      service: 'API_GATEWAY',
      dimensions: ['route', 'errorCode'],
    },
    {
      key: 'db.query.duration.ms',
      name: 'Database Query Duration',
      description: 'Execution duration for PostgreSQL queries',
      type: 'HISTOGRAM',
      unit: 'milliseconds',
      service: 'DATABASE',
      dimensions: ['operation', 'model'],
    },
    {
      key: 'redis.cache.hit_ratio',
      name: 'Redis Cache Hit Ratio',
      description: 'Ratio of cache hits over total cache accesses',
      type: 'GAUGE',
      unit: 'percent',
      service: 'REDIS',
      dimensions: ['environment'],
    },
    {
      key: 'queue.jobs.backlog',
      name: 'Queue Job Backlog',
      description: 'Total jobs queued and waiting for worker pickup',
      type: 'GAUGE',
      unit: 'jobs',
      service: 'WORKER',
      dimensions: ['queueName'],
    },
    {
      key: 'ai.requests.total',
      name: 'AI Gateway Requests',
      description: 'Total LLM requests handled by AI Gateway',
      type: 'COUNTER',
      unit: 'requests',
      service: 'AI',
      dimensions: ['feature', 'model', 'provider'],
    },
    {
      key: 'ai.tokens.total',
      name: 'AI Token Consumption',
      description: 'Input and output tokens processed across LLM models',
      type: 'COUNTER',
      unit: 'tokens',
      service: 'AI',
      dimensions: ['provider', 'model'],
    },
  ];

  getDefinitions(): MetricDefinition[] {
    return this.definitions;
  }

  incrementCounter(key: string, value: number = 1) {
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
  }

  setGauge(key: string, value: number) {
    this.gauges.set(key, value);
  }

  recordHistogram(key: string, value: number) {
    let list = this.histograms.get(key);
    if (!list) {
      list = [];
      this.histograms.set(key, list);
    }
    list.push(value);
    // Keep max 1,000 samples to avoid unbounded memory
    if (list.length > 1000) {
      list.shift();
    }
  }

  getSnapshot(key: string): MetricSnapshot | null {
    if (this.counters.has(key)) {
      return {
        key,
        value: this.counters.get(key)!,
        unit: this.findUnit(key),
        timestamp: new Date().toISOString(),
      };
    }

    if (this.gauges.has(key)) {
      return {
        key,
        value: this.gauges.get(key)!,
        unit: this.findUnit(key),
        timestamp: new Date().toISOString(),
      };
    }

    if (this.histograms.has(key)) {
      const samples = this.histograms.get(key)!;
      const avg = samples.length > 0 ? samples.reduce((a, b) => a + b, 0) / samples.length : 0;
      return {
        key,
        value: Math.round(avg * 100) / 100,
        unit: this.findUnit(key),
        timestamp: new Date().toISOString(),
      };
    }

    return null;
  }

  getPercentiles(key: string): { p50: number; p95: number; p99: number } {
    const list = [...(this.histograms.get(key) || [])].sort((a, b) => a - b);
    if (list.length === 0) return { p50: 0, p95: 0, p99: 0 };

    const p50Idx = Math.floor(list.length * 0.5);
    const p95Idx = Math.floor(list.length * 0.95);
    const p99Idx = Math.floor(list.length * 0.99);

    return {
      p50: list[p50Idx] || 0,
      p95: list[p95Idx] || list[list.length - 1],
      p99: list[p99Idx] || list[list.length - 1],
    };
  }

  getAllSnapshots(): MetricSnapshot[] {
    const results: MetricSnapshot[] = [];
    for (const d of this.definitions) {
      const snap = this.getSnapshot(d.key);
      if (snap) results.push(snap);
    }
    return results;
  }

  private findUnit(key: string): string {
    const d = this.definitions.find((item) => item.key === key);
    return d ? d.unit : 'units';
  }
}

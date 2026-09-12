/**
 * FitCore Performance & Load Testing Configuration
 */

export interface PerfEnvironmentConfig {
  name: 'development' | 'performance' | 'staging' | 'production';
  apiBaseUrl: string;
  databaseUrl?: string;
  redisHost?: string;
  redisPort?: number;
  workerConcurrency: number;
  hardware: {
    cpuCores: number;
    memoryGb: number;
    nodeVersion: string;
    databaseVersion: string;
  };
  targets: {
    apiP50Ms: number;
    apiP95Ms: number;
    apiP99Ms: number;
    accessDecisionP95Ms: number;
    bookingP95Ms: number;
    maxHttp5xxRate: number;
    minThroughputRps: number;
  };
}

export const perfEnvironments: Record<string, PerfEnvironmentConfig> = {
  development: {
    name: 'development',
    apiBaseUrl: process.env.PERF_API_URL || 'http://localhost:3000/api/v1',
    workerConcurrency: 4,
    hardware: {
      cpuCores: 8,
      memoryGb: 16,
      nodeVersion: process.version,
      databaseVersion: 'PostgreSQL 16 (Local)',
    },
    targets: {
      apiP50Ms: 25,
      apiP95Ms: 120,
      apiP99Ms: 250,
      accessDecisionP95Ms: 50,
      bookingP95Ms: 150,
      maxHttp5xxRate: 0.05,
      minThroughputRps: 150,
    },
  },
  performance: {
    name: 'performance',
    apiBaseUrl: process.env.PERF_API_URL || 'http://localhost:3000/api/v1',
    workerConcurrency: 8,
    hardware: {
      cpuCores: 16,
      memoryGb: 32,
      nodeVersion: 'v20.x',
      databaseVersion: 'PostgreSQL 16 Multi-AZ',
    },
    targets: {
      apiP50Ms: 15,
      apiP95Ms: 80,
      apiP99Ms: 180,
      accessDecisionP95Ms: 25,
      bookingP95Ms: 100,
      maxHttp5xxRate: 0.01,
      minThroughputRps: 500,
    },
  },
};

export const defaultPerfConfig = perfEnvironments[process.env.PERF_ENV || 'development'];

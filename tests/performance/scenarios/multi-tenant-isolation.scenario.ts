/**
 * Scenario: Multi-Tenant Noisy Neighbour & Cross-Tenant Isolation
 * Simulates heavy burst traffic on Organisation A while measuring response times and data isolation on Organisation B.
 */

export interface MultiTenantScenarioResult {
  tenantARequests: number;
  tenantBRequests: number;
  tenantAP95Ms: number;
  tenantBP95Ms: number;
  crossTenantContaminationDetected: boolean;
  tenantBSuccessRate: number;
}

export class MultiTenantIsolationScenario {
  static async execute(
    callTenantA: () => Promise<{ success: boolean; latencyMs: number; orgId: string }>,
    callTenantB: () => Promise<{ success: boolean; latencyMs: number; orgId: string }>,
    burstCount: number = 50
  ): Promise<MultiTenantScenarioResult> {
    const latenciesA: number[] = [];
    const latenciesB: number[] = [];
    let crossContamination = false;
    let successfulB = 0;

    // Launch Tenant A high burst and Tenant B parallel requests simultaneously
    const tasksA = Array.from({ length: burstCount }, async () => {
      const res = await callTenantA();
      latenciesA.push(res.latencyMs);
      if (res.orgId !== 'ORG_A') crossContamination = true;
    });

    const tasksB = Array.from({ length: 10 }, async () => {
      const res = await callTenantB();
      latenciesB.push(res.latencyMs);
      if (res.orgId !== 'ORG_B') crossContamination = true;
      if (res.success) successfulB++;
    });

    await Promise.all([...tasksA, ...tasksB]);

    latenciesA.sort((a, b) => a - b);
    latenciesB.sort((a, b) => a - b);

    const tenantAP95Ms = latenciesA[Math.floor(latenciesA.length * 0.95)] || 0;
    const tenantBP95Ms = latenciesB[Math.floor(latenciesB.length * 0.95)] || 0;

    return {
      tenantARequests: burstCount,
      tenantBRequests: 10,
      tenantAP95Ms,
      tenantBP95Ms,
      crossTenantContaminationDetected: crossContamination,
      tenantBSuccessRate: (successfulB / 10) * 100,
    };
  }
}

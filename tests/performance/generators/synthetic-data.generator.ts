/**
 * Synthetic Scale Data Generator for FitCore Load Testing
 * Never uses real member PII or real payment credentials.
 */

export interface SyntheticOrganisationScenario {
  scenarioId: 'A_SMALL' | 'B_MEDIUM' | 'C_LARGE' | 'D_SCALE' | 'E_MULTI_TENANT';
  organisation: {
    id: string;
    name: string;
    slug: string;
  };
  outletsCount: number;
  membersCount: number;
  classesCount: number;
  trainersCount: number;
  bookingsCount: number;
  accessEventsCount: number;
}

export class SyntheticDataGenerator {
  /**
   * Generates plan parameters for the 5 mandated testing scenarios.
   */
  static getScenarioPlan(scenario: 'A' | 'B' | 'C' | 'D' | 'E'): SyntheticOrganisationScenario {
    switch (scenario) {
      case 'A':
        return {
          scenarioId: 'A_SMALL',
          organisation: {
            id: 'syn_org_small_001',
            name: 'Synthetic Small Gym',
            slug: 'syn-small-gym',
          },
          outletsCount: 1,
          membersCount: 500,
          trainersCount: 10,
          classesCount: 20,
          bookingsCount: 800,
          accessEventsCount: 1500,
        };

      case 'B':
        return {
          scenarioId: 'B_MEDIUM',
          organisation: {
            id: 'syn_org_medium_002',
            name: 'Synthetic Medium Fitness Network',
            slug: 'syn-medium-fitness',
          },
          outletsCount: 10,
          membersCount: 5000,
          trainersCount: 50,
          classesCount: 150,
          bookingsCount: 8000,
          accessEventsCount: 15000,
        };

      case 'C':
        return {
          scenarioId: 'C_LARGE',
          organisation: {
            id: 'syn_org_large_003',
            name: 'Synthetic Large National Franchise',
            slug: 'syn-large-franchise',
          },
          outletsCount: 50,
          membersCount: 25000,
          trainersCount: 250,
          classesCount: 600,
          bookingsCount: 45000,
          accessEventsCount: 80000,
        };

      case 'D':
        return {
          scenarioId: 'D_SCALE',
          organisation: {
            id: 'syn_org_scale_004',
            name: 'Synthetic Global Cloud Enterprise',
            slug: 'syn-scale-enterprise',
          },
          outletsCount: 100,
          membersCount: 60000,
          trainersCount: 600,
          classesCount: 1500,
          bookingsCount: 120000,
          accessEventsCount: 250000,
        };

      case 'E':
      default:
        return {
          scenarioId: 'E_MULTI_TENANT',
          organisation: {
            id: 'syn_org_noisy_005',
            name: 'Synthetic Multi-Tenant Benchmark',
            slug: 'syn-multi-tenant',
          },
          outletsCount: 25,
          membersCount: 15000,
          trainersCount: 120,
          classesCount: 300,
          bookingsCount: 25000,
          accessEventsCount: 50000,
        };
    }
  }

  /**
   * Generates an array of synthetic member descriptors for load tests.
   */
  static generateMemberPool(orgId: string, count: number) {
    const pool = [];
    for (let i = 1; i <= count; i++) {
      pool.push({
        id: `${orgId}_mem_${i.toString().padStart(5, '0')}`,
        email: `member_${i}@synthetic-fitcore.test`,
        firstName: `SyntheticMember`,
        lastName: `${i}`,
        barcode: `SYN-BARCODE-${orgId.slice(-4)}-${i.toString().padStart(6, '0')}`,
        status: i % 20 === 0 ? 'SUSPENDED' : i % 50 === 0 ? 'EXPIRED' : 'ACTIVE',
      });
    }
    return pool;
  }

  /**
   * Generates synthetic outlets.
   */
  static generateOutletPool(orgId: string, count: number) {
    const outlets = [];
    for (let i = 1; i <= count; i++) {
      outlets.push({
        id: `${orgId}_outlet_${i.toString().padStart(3, '0')}`,
        name: `Club Outlet #${i}`,
        timezone: 'Australia/Perth',
        status: 'ACTIVE',
      });
    }
    return outlets;
  }
}

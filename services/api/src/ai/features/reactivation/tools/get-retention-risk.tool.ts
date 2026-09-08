import { AIToolContext } from '@fitcore/types';
import { PrismaService } from '../../../../database/prisma.service';
import { RetentionRiskService } from '../../engagement-intelligence/risk/retention-risk.service';
import { EngagementSignalService } from '../../engagement-intelligence/signals/engagement-signal.service';
import { MemberEngagementBaselineService } from '../../engagement-intelligence/profile/member-engagement-baseline.service';
import { authorizeReactivationToolAccess } from './reactivation-tool-auth';

export async function executeGetRetentionRiskTool(
  input: { memberId?: string },
  context: AIToolContext,
  prisma: PrismaService,
  signalService: EngagementSignalService,
  baselineService: MemberEngagementBaselineService,
  retentionRiskService: RetentionRiskService,
) {
  const memberId = await authorizeReactivationToolAccess(input.memberId, context, prisma);

  const [signals, baseline] = await Promise.all([
    signalService.collectAllSignals(memberId, context.organisationId),
    baselineService.computeBaseline(memberId, context.organisationId),
  ]);

  const assessment = retentionRiskService.evaluateRetentionRisk(
    signals,
    baseline,
    'NO_ACTION',
  );

  return {
    memberId,
    riskLevel: assessment.riskLevel,
    dataQuality: assessment.dataQuality,
    contributingReasons: assessment.contributingReasons,
    observedSignals: assessment.observedSignals,
  };
}

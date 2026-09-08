import { RetentionAgentService } from '../features/retention/services/retentionAgentService';
import { apiClient } from '../services/api';

jest.mock('../services/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('Day 29: Mobile AI Retention Agent Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls GET /ai/retention-agent/queue with query params', async () => {
    const mockQueue = {
      items: [
        {
          id: 'outreach-1',
          memberId: 'm-1',
          status: 'PENDING_APPROVAL',
          interventionType: 'TRAINER_CHECK_IN',
          selectedChannel: 'WHATSAPP',
          messageDraft: 'Hi Alex, noticed you haven\'t been in recently.',
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
    };
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockQueue });

    const res = await RetentionAgentService.getQueue({ status: 'PENDING_APPROVAL' });
    expect(apiClient.get).toHaveBeenCalledWith('/ai/retention-agent/queue', {
      params: { status: 'PENDING_APPROVAL' },
    });
    expect(res.items.length).toBe(1);
    expect(res.items[0].id).toBe('outreach-1');
  });

  it('calls GET /ai/retention-agent/member/:memberId', async () => {
    const mockAnalysis = {
      latestAnalysis: {
        id: 'ana-1',
        riskLevel: 'ELEVATED',
        recommendedInterventions: ['TRAINER_CHECK_IN'],
      },
      pendingOutreach: null,
    };
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockAnalysis });

    const res = await RetentionAgentService.getMemberAnalysis('m-123');
    expect(apiClient.get).toHaveBeenCalledWith('/ai/retention-agent/member/m-123');
    expect(res.latestAnalysis?.riskLevel).toBe('ELEVATED');
  });

  it('calls POST /ai/retention-agent/outreach/:id/approve', async () => {
    const mockApproved = {
      id: 'outreach-1',
      status: 'APPROVED',
      approvalStatus: 'APPROVED',
      finalMessage: 'Custom staff message',
    };
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: mockApproved });

    const res = await RetentionAgentService.approveOutreach('outreach-1', {
      editedMessage: 'Custom staff message',
    });
    expect(apiClient.post).toHaveBeenCalledWith('/ai/retention-agent/outreach/outreach-1/approve', {
      editedMessage: 'Custom staff message',
    });
    expect(res.status).toBe('APPROVED');
  });

  it('calls POST /ai/retention-agent/outreach/:id/reject with rationale', async () => {
    const mockRejected = {
      id: 'outreach-1',
      status: 'DECLINED',
      approvalStatus: 'REJECTED',
    };
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: mockRejected });

    const res = await RetentionAgentService.rejectOutreach('outreach-1', 'Member is traveling abroad');
    expect(apiClient.post).toHaveBeenCalledWith('/ai/retention-agent/outreach/outreach-1/reject', {
      reason: 'Member is traveling abroad',
    });
    expect(res.approvalStatus).toBe('REJECTED');
  });

  it('calls GET /ai/retention-agent/analytics', async () => {
    const mockAnalytics = {
      totalAnalysesGenerated: 45,
      pendingApprovalCount: 8,
      approvedCount: 30,
      rejectedCount: 4,
      reengagedCount: 12,
      reengagementRate: 40.0,
      averageReviewTimeHours: 2.5,
    };
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockAnalytics });

    const res = await RetentionAgentService.getAnalytics('outlet-1');
    expect(apiClient.get).toHaveBeenCalledWith('/ai/retention-agent/analytics', {
      params: { outletId: 'outlet-1' },
    });
    expect(res.reengagedCount).toBe(12);
  });
});

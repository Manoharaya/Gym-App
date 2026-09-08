/**
 * Day 31 — Mobile AI Receptionist Tests
 */

import { ReceptionistService } from '../features/ai-receptionist/receptionistService';
import { apiClient } from '../services/api/apiClient';

jest.mock('../services/api/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

describe('Day 31: Mobile AI Receptionist Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches active receptionist config', async () => {
    const mockConfig = {
      id: 'rec_1',
      name: 'FitCore AI Receptionist',
      status: 'ACTIVE',
      language: 'en',
      tone: 'FRIENDLY',
    };
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockConfig });

    const res = await ReceptionistService.getConfig('outlet-123');
    expect(apiClient.get).toHaveBeenCalledWith('/ai/receptionist/config?outletId=outlet-123');
    expect(res.id).toBe('rec_1');
    expect(res.status).toBe('ACTIVE');
  });

  it('lists active conversations', async () => {
    const mockConversations = {
      total: 1,
      items: [
        {
          id: 'conv_1',
          channel: 'WEB_CHAT',
          status: 'ACTIVE',
          lastMessageAt: new Date().toISOString(),
          summary: 'Membership inquiry answered with citations',
        },
      ],
    };
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockConversations });

    const res = await ReceptionistService.listConversations({ limit: 10 });
    expect(apiClient.get).toHaveBeenCalledWith('/ai/receptionist/conversations?limit=10');
    expect(res.items.length).toBe(1);
    expect(res.items[0].id).toBe('conv_1');
  });

  it('dispatches chat query and receives grounded response', async () => {
    const mockChatResult = {
      conversationId: 'conv_1',
      messageId: 'msg_1',
      response: {
        message: 'We offer flexible membership options including Standard ($49/mo) and Premium ($89/mo).',
        intent: 'PRICING_INQUIRY',
        confidence: 0.96,
        requiresClarification: false,
        citations: [
          {
            sourceType: 'MEMBERSHIP_PLAN',
            title: 'Membership Plans & Pricing',
          },
        ],
        handoffRecommended: false,
      },
    };
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: mockChatResult });

    const res = await ReceptionistService.chat({
      message: 'What are your membership options?',
      channel: 'WEB_CHAT',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/ai/receptionist/chat', {
      message: 'What are your membership options?',
      channel: 'WEB_CHAT',
    });
    expect(res.response.intent).toBe('PRICING_INQUIRY');
    expect(res.response.confidence).toBeGreaterThan(0.9);
    expect(res.response.citations.length).toBe(1);
  });

  it('retrieves pending handoffs queue and updates status to resolved', async () => {
    const mockHandoffs = {
      total: 1,
      items: [
        {
          id: 'handoff_1',
          reason: 'CUSTOMER_REQUESTED',
          status: 'PENDING',
          customerSummary: 'Customer requested front-desk staff assistance',
        },
      ],
    };
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockHandoffs });
    (apiClient.patch as jest.Mock).mockResolvedValueOnce({ data: { success: true } });

    const listRes = await ReceptionistService.listHandoffs({ status: 'PENDING' });
    expect(apiClient.get).toHaveBeenCalledWith('/ai/receptionist/handoffs?status=PENDING');
    expect(listRes.items[0].id).toBe('handoff_1');

    await ReceptionistService.updateHandoff('handoff_1', { status: 'RESOLVED' });
    expect(apiClient.patch).toHaveBeenCalledWith('/ai/receptionist/handoffs/handoff_1', {
      status: 'RESOLVED',
    });
  });

  it('fetches dashboard metrics', async () => {
    const mockMetrics = {
      totalConversations: 42,
      activeConversations: 3,
      pendingHandoffs: 1,
      publishedKnowledgeSources: 12,
      unresolvedGaps: 2,
    };
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockMetrics });

    const res = await ReceptionistService.getMetrics();
    expect(apiClient.get).toHaveBeenCalledWith('/ai/receptionist/metrics');
    expect(res.totalConversations).toBe(42);
    expect(res.pendingHandoffs).toBe(1);
  });
});

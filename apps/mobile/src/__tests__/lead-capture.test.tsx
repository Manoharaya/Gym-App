/**
 * Day 33 — Mobile AI Lead Capture & Qualification Tests
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

describe('Day 33: Mobile Lead Capture & Qualification Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists leads with filtering parameters', async () => {
    const mockLeads = {
      total: 2,
      items: [
        {
          id: 'lead_1',
          firstName: 'Maya',
          lastName: 'Sharma',
          email: 'maya@example.com',
          phone: '+9779841234567',
          status: 'QUALIFIED',
          score: 85,
          source: 'AI_RECEPTIONIST',
          preferredContactChannel: 'WHATSAPP',
          qualificationProfile: {
            goals: ['fitness', 'strength'],
            readiness: 'READY_TO_JOIN',
            recommendedNextAction: 'OFFER_TRIAL',
          },
        },
        {
          id: 'lead_2',
          firstName: 'Liam',
          lastName: 'Smith',
          email: 'liam@example.com',
          status: 'NEW',
          score: 45,
          source: 'WEB_CHAT',
          preferredContactChannel: 'EMAIL',
        },
      ],
    };

    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockLeads });

    const result = await ReceptionistService.listLeads({ status: 'QUALIFIED', limit: 10 });

    expect(apiClient.get).toHaveBeenCalledWith('/leads?status=QUALIFIED&limit=10');
    expect(result.items.length).toBe(2);
    expect(result.items[0].id).toBe('lead_1');
    expect(result.items[0].score).toBe(85);
  });

  it('fetches single lead details with qualification profile and scoring factors', async () => {
    const mockLead = {
      id: 'lead_1',
      firstName: 'Maya',
      lastName: 'Sharma',
      email: 'maya@example.com',
      phone: '+9779841234567',
      status: 'QUALIFIED',
      score: 85,
      scoreFactors: [
        { factor: 'EMAIL_VERIFIED', weight: 15, description: 'Valid email address provided' },
        { factor: 'PHONE_VERIFIED', weight: 15, description: 'Valid mobile number provided' },
        { factor: 'READINESS_HIGH', weight: 20, description: 'Prospect declared ready to join' },
      ],
      qualificationProfile: {
        qualificationStatus: 'QUALIFIED',
        goals: ['fitness', 'strength'],
        serviceInterests: ['PERSONAL_TRAINING', 'GROUP_CLASSES'],
        readiness: 'READY_TO_JOIN',
        priceSensitivity: 'VALUE_FOCUSED',
        recommendedNextAction: 'OFFER_TRAINER_INFORMATION',
        aiSummary: 'Prospect interested in personal training with high readiness.',
      },
    };

    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockLead });

    const result = await ReceptionistService.getLead('lead_1');

    expect(apiClient.get).toHaveBeenCalledWith('/leads/lead_1');
    expect(result.firstName).toBe('Maya');
    expect(result.scoreFactors.length).toBe(3);
    expect(result.qualificationProfile.recommendedNextAction).toBe('OFFER_TRAINER_INFORMATION');
  });

  it('retrieves lead pipeline metrics', async () => {
    const mockMetrics = {
      totalLeads: 42,
      qualifiedLeads: 28,
      contactedLeads: 12,
      convertedLeads: 8,
      disqualifiedLeads: 2,
      averageScore: 73.5,
    };

    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockMetrics });

    const result = await ReceptionistService.getLeadMetrics('outlet_1');

    expect(apiClient.get).toHaveBeenCalledWith('/leads/metrics?outletId=outlet_1');
    expect(result.totalLeads).toBe(42);
    expect(result.qualifiedLeads).toBe(28);
  });

  it('creates a new lead via API client', async () => {
    const newLeadDto = {
      firstName: 'Rohan',
      lastName: 'KC',
      email: 'rohan@example.com',
      phone: '+9779851000000',
      initialGoals: ['strength'],
      source: 'AI_RECEPTIONIST',
    };

    const mockResponse = { id: 'lead_rohan', ...newLeadDto, status: 'NEW', score: 60 };
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: mockResponse });

    const result = await ReceptionistService.createLead(newLeadDto);

    expect(apiClient.post).toHaveBeenCalledWith('/leads', newLeadDto);
    expect(result.id).toBe('lead_rohan');
  });

  it('updates lead lifecycle status to CONTACTED', async () => {
    (apiClient.patch as jest.Mock).mockResolvedValueOnce({
      data: { id: 'lead_1', status: 'CONTACTED' },
    });

    const result = await ReceptionistService.updateLead('lead_1', { status: 'CONTACTED' });

    expect(apiClient.patch).toHaveBeenCalledWith('/leads/lead_1', { status: 'CONTACTED' });
    expect(result.status).toBe('CONTACTED');
  });

  it('updates lead qualification profile', async () => {
    const qualUpdate = {
      goals: ['weight_management'],
      readiness: 'READY_TO_JOIN',
    };

    (apiClient.patch as jest.Mock).mockResolvedValueOnce({
      data: { id: 'lead_1', qualificationProfile: qualUpdate },
    });

    const result = await ReceptionistService.updateLeadQualification('lead_1', qualUpdate);

    expect(apiClient.patch).toHaveBeenCalledWith('/leads/lead_1/qualification', qualUpdate);
    expect(result.qualificationProfile.readiness).toBe('READY_TO_JOIN');
  });

  it('qualifies lead with conversational trigger', async () => {
    const qualifyDto = { userMessage: 'Can I start my membership tomorrow morning?' };
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        lead: { id: 'lead_1', status: 'QUALIFIED' },
        analysis: { readiness: 'READY_TO_JOIN', recommendedNextAction: 'OFFER_SIGNUP' },
      },
    });

    const result = await ReceptionistService.qualifyLead('lead_1', qualifyDto);

    expect(apiClient.post).toHaveBeenCalledWith('/leads/lead_1/qualify', qualifyDto);
    expect(result.lead.status).toBe('QUALIFIED');
  });

  it('assigns staff member to lead', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { id: 'lead_1', assignedStaffId: 'staff_123' },
    });

    const result = await ReceptionistService.assignLeadStaff('lead_1', { staffId: 'staff_123' });

    expect(apiClient.post).toHaveBeenCalledWith('/leads/lead_1/assign', { staffId: 'staff_123' });
    expect(result.assignedStaffId).toBe('staff_123');
  });

  it('requests human handoff for high-value prospect', async () => {
    const handoffDto = {
      reason: 'VIP prospect requested custom executive membership package',
      notes: 'Available for call after 4 PM',
    };

    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { id: 'lead_1', handoffCreated: true },
    });

    const result = await ReceptionistService.requestLeadHandoff('lead_1', handoffDto);

    expect(apiClient.post).toHaveBeenCalledWith('/leads/lead_1/handoff', handoffDto);
    expect(result.handoffCreated).toBe(true);
  });
});

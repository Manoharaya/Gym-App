import { AutomationService } from '../features/automation/automationService';
import { apiClient } from '../services/api';

jest.mock('../services/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('Day 30: Mobile Staff Automation Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls GET /automation/workflows with filter query params', async () => {
    const mockWorkflows = [
      {
        id: 'wf-1',
        name: '14-Day Inactivity Check-in',
        category: 'RETENTION',
        triggerType: 'MEMBER_INACTIVE',
        status: 'ACTIVE',
        version: 1,
        totalExecutions: 42,
        successfulExecutions: 40,
        activeInstances: 2,
      },
    ];
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockWorkflows });

    const res = await AutomationService.listWorkflows({ status: 'ACTIVE' });
    expect(apiClient.get).toHaveBeenCalledWith('/automation/workflows', {
      params: { status: 'ACTIVE' },
    });
    expect(res.length).toBe(1);
    expect(res[0]?.name).toBe('14-Day Inactivity Check-in');
  });

  it('calls GET /automation/workflows/:id', async () => {
    const mockDetail = {
      id: 'wf-1',
      name: '14-Day Inactivity Check-in',
      triggerType: 'MEMBER_INACTIVE',
      status: 'ACTIVE',
      version: 1,
      actions: [
        { id: 'step-1', type: 'CREATE_RETENTION_FOLLOWUP', params: {} },
      ],
    };
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockDetail });

    const res = await AutomationService.getWorkflow('wf-1');
    expect(apiClient.get).toHaveBeenCalledWith('/automation/workflows/wf-1');
    expect(res.name).toBe('14-Day Inactivity Check-in');
  });

  it('calls POST /automation/workflows/:id/activate', async () => {
    const mockActivated = { id: 'wf-1', status: 'ACTIVE' };
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: mockActivated });

    const res = await AutomationService.activateWorkflow('wf-1');
    expect(apiClient.post).toHaveBeenCalledWith('/automation/workflows/wf-1/activate');
    expect(res.status).toBe('ACTIVE');
  });

  it('calls POST /automation/workflows/:id/pause', async () => {
    const mockPaused = { id: 'wf-1', status: 'PAUSED' };
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: mockPaused });

    const res = await AutomationService.pauseWorkflow('wf-1');
    expect(apiClient.post).toHaveBeenCalledWith('/automation/workflows/wf-1/pause');
    expect(res.status).toBe('PAUSED');
  });

  it('calls GET /automation/templates', async () => {
    const mockTemplates = [
      {
        templateKey: 'INACTIVE_MEMBER_14D',
        name: '14-Day Inactivity Check-in',
        description: 'Re-engage inactive members',
        triggerType: 'MEMBER_INACTIVE',
        tags: ['retention', 'attendance'],
      },
    ];
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockTemplates });

    const res = await AutomationService.listTemplates();
    expect(apiClient.get).toHaveBeenCalledWith('/automation/templates');
    expect(res.length).toBe(1);
    expect(res[0]?.templateKey).toBe('INACTIVE_MEMBER_14D');
  });

  it('calls POST /automation/templates/instantiate', async () => {
    const mockCreated = { id: 'wf-new', name: 'Custom 14D Inactivity' };
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: mockCreated });

    const res = await AutomationService.instantiateTemplate('INACTIVE_MEMBER_14D', 'Custom 14D Inactivity');
    expect(apiClient.post).toHaveBeenCalledWith('/automation/templates/instantiate', {
      templateKey: 'INACTIVE_MEMBER_14D',
      customName: 'Custom 14D Inactivity',
    });
    expect(res.id).toBe('wf-new');
  });

  it('calls GET /automation/approvals', async () => {
    const mockApprovals = [
      {
        instanceId: 'inst-1',
        workflowId: 'wf-1',
        workflowName: '14-Day Inactivity Check-in',
        memberId: 'mem-1',
        memberName: 'Aarav Sharma',
        stepId: 'step-comm',
        actionType: 'SEND_COMMUNICATION',
        actionDetails: { channel: 'SMS', message: 'Hi Aarav' },
        queuedAt: new Date().toISOString(),
      },
    ];
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockApprovals });

    const res = await AutomationService.getPendingApprovals();
    expect(apiClient.get).toHaveBeenCalledWith('/automation/approvals');
    expect(res.length).toBe(1);
    expect(res[0]?.memberName).toBe('Aarav Sharma');
  });

  it('calls POST /automation/instances/:id/approve', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { success: true } });

    const res = await AutomationService.approveAction('inst-1', 'Approved by trainer');
    expect(apiClient.post).toHaveBeenCalledWith('/automation/instances/inst-1/approve', {
      approved: true,
      notes: 'Approved by trainer',
    });
    expect(res.success).toBe(true);
  });

  it('calls POST /automation/instances/:id/reject with reason', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { success: true } });

    const res = await AutomationService.rejectAction('inst-1', 'Member requested no contact');
    expect(apiClient.post).toHaveBeenCalledWith('/automation/instances/inst-1/reject', {
      reason: 'Member requested no contact',
    });
    expect(res.success).toBe(true);
  });

  it('calls POST /automation/workflows/:id/dry-run', async () => {
    const mockDryRun = {
      workflowId: 'wf-1',
      memberId: 'mem-1',
      triggered: true,
      triggerReason: 'inactivityDays >= 14',
      conditionsEvaluated: [],
      actionsPlanned: [],
      safeguardChecks: [],
      outcome: 'WOULD_EXECUTE',
    };
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: mockDryRun });

    const res = await AutomationService.dryRun('wf-1', 'mem-1');
    expect(apiClient.post).toHaveBeenCalledWith('/automation/workflows/wf-1/dry-run', {
      memberId: 'mem-1',
    });
    expect(res.outcome).toBe('WOULD_EXECUTE');
  });

  it('calls GET /automation/workflows/:id/analytics', async () => {
    const mockAnalytics = {
      workflowId: 'wf-1',
      totalTriggered: 100,
      completedInstances: 80,
      subsequentVisitsFollowingWorkflow: 45,
      subsequentBookingsFollowingWorkflow: 20,
      engagementTrendFollowingWorkflow: 'INCREASED',
    };
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockAnalytics });

    const res = await AutomationService.getWorkflowAnalytics('wf-1');
    expect(apiClient.get).toHaveBeenCalledWith('/automation/workflows/wf-1/analytics');
    expect(res.engagementTrendFollowingWorkflow).toBe('INCREASED');
  });

  it('calls POST /automation/ai/draft', async () => {
    const mockDraft = {
      recommendedName: 'Missed Class Follow-Up',
      recommendedDescription: 'Checks in when a class is missed',
      triggerType: 'CLASS_MISSED',
      category: 'ENGAGEMENT',
      triggerConfig: {},
      actions: [],
      safetyPolicy: {},
      messageTemplates: {
        en: 'Hey, missed you today!',
        ne: 'नमस्ते, आज तपाईंलाई सम्झियौं!',
      },
    };
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: mockDraft });

    const res = await AutomationService.draftWithAI('Follow up when class is missed', 'SUPPORTIVE', 'ne');
    expect(apiClient.post).toHaveBeenCalledWith('/automation/ai/draft', {
      intent: 'Follow up when class is missed',
      preferredTone: 'SUPPORTIVE',
      language: 'ne',
    });
    expect(res.recommendedName).toBe('Missed Class Follow-Up');
  });
});

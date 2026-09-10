/**
 * Day 31 — Mobile AI Receptionist API Service
 */

import { apiClient } from '../../services/api/apiClient';
import type {
  AIReceptionistDto,
  ReceptionistConversationDto,
  ReceptionistHandoffDto,
  ReceptionistKnowledgeSourceDto,
  ReceptionistResponseDto,
} from '@fitcore/types';

export class ReceptionistService {
  static async getConfig(outletId?: string): Promise<AIReceptionistDto> {
    const params = outletId ? `?outletId=${outletId}` : '';
    const res = await apiClient.get<AIReceptionistDto>(`/ai/receptionist/config${params}`);
    return (res as any).data || res;
  }

  static async updateConfig(id: string, dto: any): Promise<AIReceptionistDto> {
    const res = await apiClient.patch<AIReceptionistDto>(`/ai/receptionist/config/${id}`, dto);
    return (res as any).data || res;
  }

  static async listConversations(params?: {
    outletId?: string;
    status?: string;
    channel?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ total: number; items: ReceptionistConversationDto[] }> {
    const query = new URLSearchParams(params as any).toString();
    const res = await apiClient.get<{ total: number; items: ReceptionistConversationDto[] }>(
      `/ai/receptionist/conversations${query ? `?${query}` : ''}`,
    );
    return (res as any).data || res;
  }

  static async getConversation(id: string): Promise<ReceptionistConversationDto> {
    const res = await apiClient.get<ReceptionistConversationDto>(`/ai/receptionist/conversations/${id}`);
    return (res as any).data || res;
  }

  static async getMessages(conversationId: string): Promise<any[]> {
    const res = await apiClient.get<any[]>(`/ai/receptionist/conversations/${conversationId}/messages`);
    return (res as any).data || res;
  }

  static async listHandoffs(params?: {
    outletId?: string;
    status?: string;
    limit?: number;
  }): Promise<{ total: number; items: ReceptionistHandoffDto[] }> {
    const query = new URLSearchParams(params as any).toString();
    const res = await apiClient.get<{ total: number; items: ReceptionistHandoffDto[] }>(
      `/ai/receptionist/handoffs${query ? `?${query}` : ''}`,
    );
    return (res as any).data || res;
  }

  static async updateHandoff(id: string, dto: { status?: string; resolutionNotes?: string }): Promise<any> {
    const res = await apiClient.patch(`/ai/receptionist/handoffs/${id}`, dto);
    return (res as any).data || res;
  }

  static async listKnowledge(params?: {
    outletId?: string;
    type?: string;
  }): Promise<{ total: number; items: ReceptionistKnowledgeSourceDto[] }> {
    const query = new URLSearchParams(params as any).toString();
    const res = await apiClient.get<{ total: number; items: ReceptionistKnowledgeSourceDto[] }>(
      `/ai/receptionist/knowledge${query ? `?${query}` : ''}`,
    );
    return (res as any).data || res;
  }

  static async createKnowledge(dto: any): Promise<ReceptionistKnowledgeSourceDto> {
    const res = await apiClient.post<ReceptionistKnowledgeSourceDto>('/ai/receptionist/knowledge', dto);
    return (res as any).data || res;
  }

  static async listKnowledgeGaps(): Promise<any[]> {
    const res = await apiClient.get<any[]>('/ai/receptionist/knowledge-gaps');
    return (res as any).data || res;
  }

  static async getMetrics(): Promise<{
    totalConversations: number;
    activeConversations: number;
    pendingHandoffs: number;
    publishedKnowledgeSources: number;
    unresolvedGaps: number;
  }> {
    const res = await apiClient.get<any>('/ai/receptionist/metrics');
    return (res as any).data || res;
  }

  static async chat(dto: {
    message: string;
    conversationId?: string;
    outletId?: string | null;
    channel?: string;
    language?: string;
  }): Promise<{
    conversationId: string;
    response: ReceptionistResponseDto;
    messageId: string;
  }> {
    const res = await apiClient.post<any>('/ai/receptionist/chat', dto);
    return (res as any).data || res;
  }

  // Day 32 — Booking Operations
  static async getAvailability(params?: Record<string, any>): Promise<any> {
    const query = new URLSearchParams(params as any).toString();
    const res = await apiClient.get<any>(
      `/ai/receptionist/booking/availability${query ? `?${query}` : ''}`,
    );
    return (res as any).data || res;
  }

  static async getMyBookings(upcomingOnly?: boolean): Promise<any[]> {
    const query = upcomingOnly ? '?upcomingOnly=true' : '';
    const res = await apiClient.get<any[]>(`/ai/receptionist/booking/my-bookings${query}`);
    return (res as any).data || res;
  }

  static async getBookingDetails(id: string): Promise<any> {
    const res = await apiClient.get<any>(`/ai/receptionist/booking/bookings/${id}`);
    return (res as any).data || res;
  }

  static async createBookingConfirmation(dto: any): Promise<any> {
    const res = await apiClient.post<any>('/ai/receptionist/booking/confirmations/create', dto);
    return (res as any).data || res;
  }

  static async executeBookingConfirmation(dto: any): Promise<any> {
    const res = await apiClient.post<any>('/ai/receptionist/booking/confirmations/execute', dto);
    return (res as any).data || res;
  }

  static async cancelBooking(dto: { confirmationToken: string; reason?: string }): Promise<any> {
    const res = await apiClient.post<any>('/ai/receptionist/booking/cancel', dto);
    return (res as any).data || res;
  }

  static async rescheduleBooking(dto: { confirmationToken: string }): Promise<any> {
    const res = await apiClient.post<any>('/ai/receptionist/booking/reschedule', dto);
    return (res as any).data || res;
  }

  static async joinWaitlist(dto: { confirmationToken: string; notes?: string }): Promise<any> {
    const res = await apiClient.post<any>('/ai/receptionist/booking/waitlist', dto);
    return (res as any).data || res;
  }

  static async dryRunBooking(dto: { classSessionId: string; memberProfileId?: string }): Promise<any> {
    const res = await apiClient.post<any>('/ai/receptionist/booking/dry-run', dto);
    return (res as any).data || res;
  }

  static async getBookingMetrics(outletId?: string): Promise<any> {
    const query = outletId ? `?outletId=${outletId}` : '';
    const res = await apiClient.get<any>(`/ai/receptionist/booking/metrics${query}`);
    return (res as any).data || res;
  }

  // Day 33 — Lead Management Methods
  static async listLeads(params?: any): Promise<{ total: number; items: any[] }> {
    const query = params ? new URLSearchParams(params as any).toString() : '';
    const res = await apiClient.get<{ total: number; items: any[] }>(`/leads${query ? `?${query}` : ''}`);
    return (res as any).data || res;
  }

  static async getLead(id: string): Promise<any> {
    const res = await apiClient.get<any>(`/leads/${id}`);
    return (res as any).data || res;
  }

  static async getLeadMetrics(outletId?: string): Promise<any> {
    const query = outletId ? `?outletId=${outletId}` : '';
    const res = await apiClient.get<any>(`/leads/metrics${query}`);
    return (res as any).data || res;
  }

  static async createLead(dto: any): Promise<any> {
    const res = await apiClient.post<any>('/leads', dto);
    return (res as any).data || res;
  }

  static async updateLead(id: string, dto: any): Promise<any> {
    const res = await apiClient.patch<any>(`/leads/${id}`, dto);
    return (res as any).data || res;
  }

  static async updateLeadQualification(id: string, dto: any): Promise<any> {
    const res = await apiClient.patch<any>(`/leads/${id}/qualification`, dto);
    return (res as any).data || res;
  }

  static async qualifyLead(id: string, dto?: any): Promise<any> {
    const res = await apiClient.post<any>(`/leads/${id}/qualify`, dto || {});
    return (res as any).data || res;
  }

  static async assignLeadStaff(id: string, dto: any): Promise<any> {
    const res = await apiClient.post<any>(`/leads/${id}/assign`, dto);
    return (res as any).data || res;
  }

  static async requestLeadHandoff(id: string, dto: any): Promise<any> {
    const res = await apiClient.post<any>(`/leads/${id}/handoff`, dto);
    return (res as any).data || res;
  }
}

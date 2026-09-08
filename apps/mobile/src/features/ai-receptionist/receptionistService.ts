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
}

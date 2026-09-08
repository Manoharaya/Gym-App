/**
 * FitCore AI Receptionist Internal Types & Service Interfaces (Day 31)
 */

import {
  AIReceptionistDto,
  ConversationChannel,
  ConversationStatus,
  HandoffReason,
  HandoffStatus,
  KnowledgeVisibility,
  MessageContentType,
  MessageRole,
  ReceptionistIntent,
  ReceptionistKnowledgeType,
  ReceptionistResponseDto,
  ReceptionistScope,
  ReceptionistStatus,
  ReceptionistTone,
} from '@fitcore/types';

export interface InternalReceptionistConfig {
  id: string;
  organisationId: string;
  outletId?: string | null;
  name: string;
  displayName: string;
  status: ReceptionistStatus;
  language: string;
  tone: ReceptionistTone;
  greeting: string;
  timezone: string;
  knowledgeScope: ReceptionistScope;
  escalationEnabled: boolean;
  humanHandoffEnabled: boolean;
  guardrails: Record<string, any>;
  promptOverrides?: Record<string, any>;
  supportedChannels: string[];
}

export interface ConversationParticipantContext {
  memberId?: string;
  prospectId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  isAuthenticated: boolean;
  membershipStatus?: string;
  membershipPlanName?: string;
  homeOutletId?: string;
  homeOutletName?: string;
  recentBookings?: any[];
}

export interface OrganisationContextData {
  id: string;
  name: string;
  slug: string;
  outletsCount: number;
  outlets: Array<{
    id: string;
    name: string;
    address?: string;
    city?: string;
    phone?: string;
  }>;
}

export interface OutletContextData {
  id: string;
  organisationId: string;
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  operatingHours?: Record<string, any>;
  holidayHours?: Record<string, any>;
  amenities?: string[];
  parkingDetails?: string;
}

export interface ReceptionistAggregatedContext {
  organisation: OrganisationContextData;
  outlet?: OutletContextData | null;
  customer: ConversationParticipantContext;
  multiOutletContext: {
    isMultiOutlet: boolean;
    hasOutletDisambiguated: boolean;
    availableOutlets: Array<{ id: string; name: string }>;
  };
  retrievedKnowledge: Array<{
    id?: string;
    type: ReceptionistKnowledgeType;
    title: string;
    content: string;
    outletId?: string | null;
    confidenceScore: number;
  }>;
  recentMessages: Array<{
    role: MessageRole;
    content: string;
    createdAt: Date;
  }>;
}

export interface SafetyCheckResult {
  isSafe: boolean;
  safetyFlag?: string;
  sanitizedInput: string;
  reason?: string;
  remedyAction?: 'BLOCK' | 'ATTACH_DISCLAIMER' | 'PROCEED';
}

export interface KnowledgeSearchParams {
  organisationId: string;
  outletId?: string | null;
  query: string;
  knowledgeTypes?: ReceptionistKnowledgeType[];
  visibility?: KnowledgeVisibility[];
  limit?: number;
  minScore?: number;
}

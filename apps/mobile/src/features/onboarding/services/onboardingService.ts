import { apiClient } from '../../../services/api/apiClient';
import type {
  OnboardingProgressData,
  ProfileFormData,
  ParqAnswerItem,
  ConsentRequirementItem,
  InjuryItem,
} from '../types';
import type { Questionnaire, ParqSubmission, MemberProfile } from '@fitcore/types';

export const onboardingService = {
  async getMemberProfile() {
    const res = await apiClient.get<MemberProfile>('/members/me');
    return res.data;
  },

  async getOnboardingProgress() {
    const res = await apiClient.get<OnboardingProgressData>('/members/me/onboarding');
    return res.data;
  },

  async startOnboarding() {
    const res = await apiClient.post<OnboardingProgressData>('/members/me/onboarding/start');
    return res.data;
  },

  async updateCurrentStep(step: string) {
    const res = await apiClient.patch('/members/me/onboarding/step', { step });
    return res.data;
  },

  async updateProfile(data: Partial<ProfileFormData>) {
    const res = await apiClient.patch<MemberProfile>('/members/me', data);
    return res.data;
  },

  async getParqQuestionnaire() {
    const res = await apiClient.get<{
      questionnaire: Questionnaire;
      submission: ParqSubmission | null;
    }>('/members/me/parq');
    return res.data;
  },

  async saveParqDraft(questionnaireId: string, responses: ParqAnswerItem[]) {
    const res = await apiClient.post('/members/me/parq/draft', {
      questionnaireId,
      responses,
    });
    return res.data;
  },

  async submitParq(questionnaireId: string, responses: ParqAnswerItem[]) {
    const res = await apiClient.post<ParqSubmission>('/members/me/parq/submit', {
      questionnaireId,
      responses,
    });
    return res.data;
  },

  async getConsents() {
    const res = await apiClient.get<ConsentRequirementItem[]>('/members/me/consents');
    return res.data;
  },

  async recordConsent(consentTypeId: string, consentVersionId: string, status: 'CONSENTED' | 'DECLINED') {
    const res = await apiClient.post('/members/me/consents', {
      consentTypeId,
      consentVersionId,
      status,
    });
    return res.data;
  },

  async getInjuries() {
    const res = await apiClient.get<InjuryItem[]>('/members/me/injuries');
    return res.data;
  },

  async createInjury(injury: InjuryItem) {
    const res = await apiClient.post('/members/me/injuries', injury);
    return res.data;
  },

  async submitSignature(signerName: string) {
    const res = await apiClient.post('/members/me/signature', {
      documentType: 'ONBOARDING_AGREEMENT',
      documentVersion: '2024.1',
      signerName,
    });
    return res.data;
  },

  async completeOnboarding() {
    const res = await apiClient.post<{ success: boolean; onboardingStatus: string }>('/members/me/onboarding/complete');
    return res.data;
  },
};

import type {
  OnboardingStep,
  OnboardingStatus,
  Questionnaire,
} from '@fitcore/types';

export type OnboardingScreenName =
  | 'Welcome'
  | 'Profile'
  | 'Parq'
  | 'HealthScreening'
  | 'Injuries'
  | 'Consent'
  | 'DocumentUpload'
  | 'Signature'
  | 'Review'
  | 'Complete';

export interface OnboardingStepInfo {
  key: OnboardingStep;
  title: string;
  status: 'PENDING' | 'COMPLETED' | 'SKIPPED';
}

export interface OnboardingProgressData {
  status: OnboardingStatus;
  currentStep: OnboardingStep;
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  steps: OnboardingStepInfo[];
}

export interface ProfileFormData {
  preferredName: string;
  dateOfBirth: string;
  gender: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
}

export interface ParqAnswerItem {
  questionId: string;
  answer: { value: boolean };
  notes?: string;
}

export interface ConsentRequirementItem {
  consentTypeId: string;
  key: string;
  name: string;
  description?: string;
  isMandatory: boolean;
  activeVersion?: {
    id: string;
    version: string;
    content: string;
  };
  currentStatus: 'CONSENTED' | 'DECLINED' | 'NOT_RECORDED' | 'WITHDRAWN';
}

export interface InjuryItem {
  id?: string;
  bodyArea: string;
  description: string;
  status: 'ACTIVE' | 'RECOVERING' | 'RESOLVED';
  startDate?: string;
  notes?: string;
}

export interface OnboardingState {
  currentStepIndex: number;
  progressData: OnboardingProgressData | null;
  profileForm: ProfileFormData;
  parqQuestionnaire: Questionnaire | null;
  parqAnswers: Record<string, boolean>;
  parqNotes: Record<string, string>;
  injuries: InjuryItem[];
  consents: ConsentRequirementItem[];
  signatureName: string;
  isSubmitting: boolean;
  error: string | null;
}

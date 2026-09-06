import { create } from 'zustand';
import type {
  OnboardingState,
  ProfileFormData,
  InjuryItem,
  ConsentRequirementItem,
  OnboardingProgressData,
} from '../types';

interface OnboardingStore extends OnboardingState {
  setProfileField: <K extends keyof ProfileFormData>(field: K, value: ProfileFormData[K]) => void;
  setParqAnswer: (questionId: string, value: boolean) => void;
  setParqNote: (questionId: string, note: string) => void;
  addInjury: (injury: InjuryItem) => void;
  setConsents: (consents: ConsentRequirementItem[]) => void;
  updateConsentStatus: (consentTypeId: string, status: 'CONSENTED' | 'DECLINED') => void;
  setSignatureName: (name: string) => void;
  setProgressData: (data: OnboardingProgressData) => void;
  setStepIndex: (index: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setSubmitting: (submitting: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialProfile: ProfileFormData = {
  preferredName: '',
  dateOfBirth: '1995-01-01',
  gender: 'MALE',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelationship: 'Partner',
};

const initialState: OnboardingState = {
  currentStepIndex: 0,
  progressData: null,
  profileForm: initialProfile,
  parqQuestionnaire: null,
  parqAnswers: {},
  parqNotes: {},
  injuries: [],
  consents: [],
  signatureName: '',
  isSubmitting: false,
  error: null,
};

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  ...initialState,

  setProfileField: (field, value) =>
    set((state) => ({
      profileForm: { ...state.profileForm, [field]: value },
    })),

  setParqAnswer: (questionId, value) =>
    set((state) => ({
      parqAnswers: { ...state.parqAnswers, [questionId]: value },
    })),

  setParqNote: (questionId, note) =>
    set((state) => ({
      parqNotes: { ...state.parqNotes, [questionId]: note },
    })),

  addInjury: (injury) =>
    set((state) => ({
      injuries: [...state.injuries, injury],
    })),

  setConsents: (consents) => set({ consents }),

  updateConsentStatus: (consentTypeId, status) =>
    set((state) => ({
      consents: state.consents.map((c) =>
        c.consentTypeId === consentTypeId ? { ...c, currentStatus: status } : c
      ),
    })),

  setSignatureName: (name) => set({ signatureName: name }),

  setProgressData: (progressData) => set({ progressData }),

  setStepIndex: (currentStepIndex) => set({ currentStepIndex }),

  nextStep: () =>
    set((state) => ({
      currentStepIndex: Math.min(state.currentStepIndex + 1, 9),
    })),

  prevStep: () =>
    set((state) => ({
      currentStepIndex: Math.max(state.currentStepIndex - 1, 0),
    })),

  setSubmitting: (isSubmitting) => set({ isSubmitting }),

  setError: (error) => set({ error }),

  reset: () => set(initialState),
}));

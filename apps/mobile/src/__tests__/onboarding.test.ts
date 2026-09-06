import { useOnboardingStore } from '../features/onboarding/store/onboardingStore';

describe('Onboarding State & Workflow (Day 4 Mobile)', () => {
  beforeEach(() => {
    useOnboardingStore.getState().reset();
  });

  it('1. Should initialize with default profile and step index 0', () => {
    const state = useOnboardingStore.getState();
    expect(state.currentStepIndex).toBe(0);
    expect(state.profileForm.gender).toBe('MALE');
    expect(state.injuries).toEqual([]);
    expect(state.parqAnswers).toEqual({});
  });

  it('2. Should update profile form fields', () => {
    const { setProfileField } = useOnboardingStore.getState();
    setProfileField('preferredName', 'Alex');
    setProfileField('emergencyContactName', 'Sarah');
    setProfileField('emergencyContactPhone', '+61400111222');

    const state = useOnboardingStore.getState();
    expect(state.profileForm.preferredName).toBe('Alex');
    expect(state.profileForm.emergencyContactName).toBe('Sarah');
    expect(state.profileForm.emergencyContactPhone).toBe('+61400111222');
  });

  it('3. Should record PAR-Q answers and notes', () => {
    const { setParqAnswer, setParqNote } = useOnboardingStore.getState();
    setParqAnswer('q_chest_pain', false);
    setParqAnswer('q_heart_condition', true);
    setParqNote('q_heart_condition', 'Cleared in 2023');

    const state = useOnboardingStore.getState();
    expect(state.parqAnswers['q_chest_pain']).toBe(false);
    expect(state.parqAnswers['q_heart_condition']).toBe(true);
    expect(state.parqNotes['q_heart_condition']).toBe('Cleared in 2023');
  });

  it('4. Should add and track injuries', () => {
    const { addInjury } = useOnboardingStore.getState();
    addInjury({
      bodyArea: 'LOWER_BACK',
      description: 'L4 strain',
      status: 'RECOVERING',
    });

    const state = useOnboardingStore.getState();
    expect(state.injuries.length).toBe(1);
    expect(state.injuries[0]?.bodyArea).toBe('LOWER_BACK');
  });

  it('5. Should handle step navigation forward and backward', () => {
    const { nextStep, prevStep } = useOnboardingStore.getState();
    expect(useOnboardingStore.getState().currentStepIndex).toBe(0);

    nextStep();
    expect(useOnboardingStore.getState().currentStepIndex).toBe(1);

    nextStep();
    expect(useOnboardingStore.getState().currentStepIndex).toBe(2);

    prevStep();
    expect(useOnboardingStore.getState().currentStepIndex).toBe(1);
  });

  it('6. Should record electronic signature signer name', () => {
    const { setSignatureName } = useOnboardingStore.getState();
    setSignatureName('Alexander Mercer');

    expect(useOnboardingStore.getState().signatureName).toBe('Alexander Mercer');
  });
});

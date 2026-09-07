import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { TrainerClientDetailScreen } from '../features/personal-training/screens/TrainerClientDetailScreen';
import { MyTrainerScreen } from '../features/personal-training/screens/MyTrainerScreen';
import { TrainingProgramScreen } from '../features/personal-training/screens/TrainingProgramScreen';
import { GoalsScreen } from '../features/personal-training/screens/GoalsScreen';
import { TrainerNotesScreen } from '../features/personal-training/screens/TrainerNotesScreen';
import { ptService } from '../features/personal-training/services/ptService';
import { trainerService } from '../features/trainer/services/trainerService';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

let mockRouteParams: any = {
  memberProfileId: 'cmtq4sgyf00awpo1eqvfo3zy8',
  memberName: 'Alex Mercer',
  memberEmail: 'member@secondwind.com.au',
  trainerProfileId: 'cmtq4sgyf00awpo1eqvfo3zy7',
  programId: 'prog_001',
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: mockRouteParams,
  }),
}));

// Mock ptService
jest.mock('../features/personal-training/services/ptService', () => ({
  ptService: {
    getMemberPrograms: jest.fn(),
    getProgramById: jest.fn(),
    createProgram: jest.fn(),
    updateProgram: jest.fn(),
    activateProgram: jest.fn(),
    pauseProgram: jest.fn(),
    completeProgram: jest.fn(),
    cancelProgram: jest.fn(),

    getMemberGoals: jest.fn(),
    getGoalById: jest.fn(),
    createGoal: jest.fn(),
    updateGoal: jest.fn(),
    recordGoalProgress: jest.fn(),

    getMemberNotes: jest.fn(),
    createNote: jest.fn(),
    updateNote: jest.fn(),
    deleteNote: jest.fn(),

    getPTSessions: jest.fn(),
    getPTSessionById: jest.fn(),
    schedulePTSession: jest.fn(),
    startPTSession: jest.fn(),
    completePTSession: jest.fn(),
    cancelPTSession: jest.fn(),
  },
}));

// Mock trainerService
jest.mock('../features/trainer/services/trainerService', () => ({
  trainerService: {
    getTrainerById: jest.fn(),
    getTrainerClients: jest.fn(),
    getAllTrainers: jest.fn(),
  },
}));

const mockProgram: any = {
  id: 'prog_001',
  name: 'Strength & Hypertrophy Phase 1',
  description: '4-day upper/lower split focusing on compound strength progression.',
  status: 'ACTIVE',
  startDate: new Date('2026-03-01').toISOString(),
  endDate: new Date('2026-05-31').toISOString(),
  memberProfileId: 'cmtq4sgyf00awpo1eqvfo3zy8',
  trainerProfileId: 'cmtq4sgyf00awpo1eqvfo3zy7',
  organisationId: 'cmtq4sgyf00awpo1eqvfo3zy1',
  goals: [
    {
      id: 'goal_001',
      title: 'Back Squat 1RM to 140kg',
      category: 'STRENGTH',
      status: 'ACTIVE',
      targetValue: 140,
      currentValue: 125,
      baselineValue: 120,
      unit: 'kg',
    },
  ],
};

const mockGoals: any = [
  {
    id: 'goal_001',
    title: 'Back Squat 1RM to 140kg',
    description: 'Targeting a 20kg increase on current 1RM squat with strict depth.',
    category: 'STRENGTH',
    status: 'ACTIVE',
    targetValue: 140,
    currentValue: 125,
    baselineValue: 120,
    unit: 'kg',
    targetDate: new Date('2026-05-31').toISOString(),
    memberProfileId: 'cmtq4sgyf00awpo1eqvfo3zy8',
    organisationId: 'cmtq4sgyf00awpo1eqvfo3zy1',
    history: [
      {
        id: 'hist_001',
        createdAt: new Date().toISOString(),
        previousValue: 120,
        newValue: 125,
        newStatus: 'ACTIVE',
        notes: 'Hit 125kg for clean double.',
      },
    ],
  },
  {
    id: 'goal_002',
    title: 'Body Fat Percentage to 15%',
    description: 'Lean body recomposition protocol alongside progressive overload.',
    category: 'BODY_COMPOSITION',
    status: 'ACTIVE',
    targetValue: 15,
    currentValue: 17.5,
    baselineValue: 19.5,
    unit: '%',
    targetDate: new Date('2026-06-30').toISOString(),
    memberProfileId: 'cmtq4sgyf00awpo1eqvfo3zy8',
    organisationId: 'cmtq4sgyf00awpo1eqvfo3zy1',
  },
];

const mockSessions: any = [
  {
    id: 'pt_sess_001',
    status: 'SCHEDULED',
    sessionType: 'ONE_ON_ONE',
    scheduledStart: new Date(Date.now() + 86400000).toISOString(),
    scheduledEnd: new Date(Date.now() + 90000000).toISOString(),
    location: 'Second Wind South Yarra - Free Weights Area',
    notes: 'Barbell Back Squat progression & posterior chain accessory work.',
    memberProfileId: 'cmtq4sgyf00awpo1eqvfo3zy8',
    trainerProfileId: 'cmtq4sgyf00awpo1eqvfo3zy7',
  },
];

const mockNotes: any = [
  {
    id: 'note_001',
    content: 'Focus on breathing into the belt and bracing the core prior to initiating descent.',
    visibility: 'MEMBER_VISIBLE',
    noteType: 'COACHING',
    createdAt: new Date().toISOString(),
    trainerProfileId: 'cmtq4sgyf00awpo1eqvfo3zy7',
  },
  {
    id: 'note_002',
    content: 'Client reported mild fatigue in lower back during warmup.',
    visibility: 'STAFF',
    noteType: 'GENERAL',
    createdAt: new Date().toISOString(),
    trainerProfileId: 'cmtq4sgyf00awpo1eqvfo3zy7',
  },
  {
    id: 'note_003',
    content: 'Private observation: adjust volume if RPE exceeds 9 next session.',
    visibility: 'PRIVATE',
    noteType: 'ASSESSMENT',
    createdAt: new Date().toISOString(),
    trainerProfileId: 'cmtq4sgyf00awpo1eqvfo3zy7',
  },
];

describe('Day 12 — Personal Training & Coaching Mobile Screens', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (ptService.getMemberPrograms as jest.Mock).mockResolvedValue([mockProgram]);
    (ptService.getProgramById as jest.Mock).mockResolvedValue(mockProgram);
    (ptService.createProgram as jest.Mock).mockResolvedValue(mockProgram);
    (ptService.updateProgram as jest.Mock).mockResolvedValue(mockProgram);
    (ptService.activateProgram as jest.Mock).mockResolvedValue({ ...mockProgram, status: 'ACTIVE' });
    (ptService.pauseProgram as jest.Mock).mockResolvedValue({ ...mockProgram, status: 'PAUSED' });
    (ptService.completeProgram as jest.Mock).mockResolvedValue({ ...mockProgram, status: 'COMPLETED' });
    (ptService.cancelProgram as jest.Mock).mockResolvedValue({ ...mockProgram, status: 'CANCELLED' });

    (ptService.getMemberGoals as jest.Mock).mockResolvedValue(mockGoals);
    (ptService.getGoalById as jest.Mock).mockResolvedValue(mockGoals[0]);
    (ptService.createGoal as jest.Mock).mockResolvedValue(mockGoals[0]);
    (ptService.updateGoal as jest.Mock).mockResolvedValue(mockGoals[0]);
    (ptService.recordGoalProgress as jest.Mock).mockResolvedValue({ ...mockGoals[0], currentValue: 130 });

    (ptService.getMemberNotes as jest.Mock).mockResolvedValue(mockNotes);
    (ptService.createNote as jest.Mock).mockResolvedValue(mockNotes[0]);
    (ptService.updateNote as jest.Mock).mockResolvedValue(mockNotes[0]);
    (ptService.deleteNote as jest.Mock).mockResolvedValue({ success: true });

    (ptService.getPTSessions as jest.Mock).mockResolvedValue(mockSessions);
    (ptService.getPTSessionById as jest.Mock).mockResolvedValue(mockSessions[0]);
    (ptService.schedulePTSession as jest.Mock).mockResolvedValue(mockSessions[0]);
    (ptService.startPTSession as jest.Mock).mockResolvedValue({ ...mockSessions[0], status: 'IN_PROGRESS' });
    (ptService.completePTSession as jest.Mock).mockResolvedValue({ ...mockSessions[0], status: 'COMPLETED' });
    (ptService.cancelPTSession as jest.Mock).mockResolvedValue({ ...mockSessions[0], status: 'CANCELLED' });

    (trainerService.getTrainerById as jest.Mock).mockResolvedValue({
      id: 'cmtq4sgyf00awpo1eqvfo3zy7',
      professionalName: 'Marcus Vance',
      specialties: ['Strength & Conditioning', 'Olympic Weightlifting'],
      experienceYears: 8,
      bio: 'Elite strength and conditioning coach with 8 years of high-performance coaching experience.',
      user: {
        firstName: 'Marcus',
        lastName: 'Vance',
        email: 'trainer@secondwind.com.au',
      },
    });
    (trainerService.getTrainerClients as jest.Mock).mockResolvedValue([]);
    (trainerService.getAllTrainers as jest.Mock).mockResolvedValue([
      {
        id: 'cmtq4sgyf00awpo1eqvfo3zy7',
        professionalName: 'Marcus Vance',
        specialties: ['Strength & Conditioning', 'Olympic Weightlifting'],
        experienceYears: 8,
        bio: 'Elite strength and conditioning coach with 8 years of high-performance coaching experience.',
        user: {
          firstName: 'Marcus',
          lastName: 'Vance',
          email: 'trainer@secondwind.com.au',
        },
      },
    ]);
  });

  describe('TrainerClientDetailScreen', () => {
    it('renders client coaching console header and tabs', async () => {
      const { getByText } = render(<TrainerClientDetailScreen />);

      await waitFor(() => {
        expect(getByText('Alex Mercer')).toBeTruthy();
        expect(getByText('Overview')).toBeTruthy();
        expect(getByText('Goals')).toBeTruthy();
        expect(getByText('Program')).toBeTruthy();
        expect(getByText('Sessions')).toBeTruthy();
        expect(getByText('Notes')).toBeTruthy();
      });
    });

    it('displays client quick metrics and active training program', async () => {
      const { getByText, getAllByText } = render(<TrainerClientDetailScreen />);

      await waitFor(() => {
        expect(getByText('Strength & Hypertrophy Phase 1')).toBeTruthy();
        expect(getAllByText('ACTIVE').length).toBeGreaterThan(0);
      });
    });

    it('switches to Goals tab and displays goals list', async () => {
      const { getByText } = render(<TrainerClientDetailScreen />);

      await waitFor(() => {
        expect(getByText('Goals')).toBeTruthy();
      });

      fireEvent.press(getByText('Goals'));

      await waitFor(() => {
        expect(getByText('Back Squat 1RM to 140kg')).toBeTruthy();
        expect(getByText('STRENGTH')).toBeTruthy();
      });
    });
  });

  describe('MyTrainerScreen', () => {
    it('renders member coach view with primary trainer info', async () => {
      const { getByText } = render(<MyTrainerScreen />);

      await waitFor(() => {
        expect(getByText('Marcus Vance')).toBeTruthy();
        expect(getByText('YOUR COACH')).toBeTruthy();
      });
    });

    it('shows member active program and goal progress', async () => {
      const { getByText, getAllByText } = render(<MyTrainerScreen />);

      await waitFor(() => {
        expect(getByText('Active Program')).toBeTruthy();
        expect(getByText('Strength & Hypertrophy Phase 1')).toBeTruthy();
        expect(getByText('My Goals')).toBeTruthy();
        expect(getAllByText('Back Squat 1RM to 140kg').length).toBeGreaterThan(0);
      });
    });

    it('displays member-visible trainer cues and coaching tips', async () => {
      const { getByText } = render(<MyTrainerScreen />);

      await waitFor(() => {
        expect(getByText("Coach's Feedback & Cues")).toBeTruthy();
        expect(
          getByText('Focus on breathing into the belt and bracing the core prior to initiating descent.'),
        ).toBeTruthy();
      });
    });
  });

  describe('TrainingProgramScreen', () => {
    it('renders training program details and linked goals', async () => {
      const { getByText, getAllByText } = render(<TrainingProgramScreen />);

      await waitFor(() => {
        expect(getByText('Strength & Hypertrophy Phase 1')).toBeTruthy();
        expect(getAllByText('ACTIVE').length).toBeGreaterThan(0);
        expect(getByText('Training Program Details')).toBeTruthy();
        expect(getByText('Linked Goals (1)')).toBeTruthy();
        expect(getByText('Back Squat 1RM to 140kg')).toBeTruthy();
      });
    });

    it('renders lifecycle action buttons for active program', async () => {
      const { getByText } = render(<TrainingProgramScreen />);

      await waitFor(() => {
        expect(getByText('Pause')).toBeTruthy();
        expect(getByText('Complete')).toBeTruthy();
        expect(getByText('Cancel Program')).toBeTruthy();
      });
    });
  });

  describe('GoalsScreen', () => {
    it('renders member goals with category filter pills', async () => {
      const { getByText, getAllByText } = render(<GoalsScreen />);

      await waitFor(() => {
        expect(getByText('Member Training Goals')).toBeTruthy();
        expect(getByText('ALL')).toBeTruthy();
        expect(getAllByText('STRENGTH').length).toBeGreaterThan(0);
        expect(getByText('Back Squat 1RM to 140kg')).toBeTruthy();
      });
    });

    it('opens log progress modal when Update Progress is pressed', async () => {
      const { getAllByText, getByText } = render(<GoalsScreen />);

      await waitFor(() => {
        expect(getAllByText('Update Progress').length).toBeGreaterThan(0);
      });

      fireEvent.press(getAllByText('Update Progress')[0]);

      await waitFor(() => {
        expect(getByText('Record Goal Progress')).toBeTruthy();
        expect(getByText('Save Milestone')).toBeTruthy();
      });
    });
  });

  describe('TrainerNotesScreen', () => {
    it('renders notes vault with safe privacy boundary badges', async () => {
      const { getByText } = render(<TrainerNotesScreen />);

      await waitFor(() => {
        expect(getByText('Trainer Notes Vault')).toBeTruthy();
        expect(
          getByText('Focus on breathing into the belt and bracing the core prior to initiating descent.'),
        ).toBeTruthy();
        expect(getByText('Client reported mild fatigue in lower back during warmup.')).toBeTruthy();
        expect(getByText('Private observation: adjust volume if RPE exceeds 9 next session.')).toBeTruthy();
      });
    });

    it('shows note composer trigger button and modal with default private visibility', async () => {
      const { getByText } = render(<TrainerNotesScreen />);

      await waitFor(() => {
        expect(getByText('+ Add Note')).toBeTruthy();
      });

      fireEvent.press(getByText('+ Add Note'));

      await waitFor(() => {
        expect(getByText('New Coaching Note')).toBeTruthy();
        expect(getByText('Visibility (Default: Private)')).toBeTruthy();
        expect(getByText('Save Note')).toBeTruthy();
      });
    });
  });
});

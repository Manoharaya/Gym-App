import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ExerciseLibraryScreen } from '../features/exercises/screens/ExerciseLibraryScreen';
import { ExerciseDetailScreen } from '../features/exercises/screens/ExerciseDetailScreen';
import { WorkoutSessionScreen } from '../features/training/screens/WorkoutSessionScreen';
import { TrainerWorkoutsScreen } from '../features/trainer/screens/TrainerWorkoutsScreen';
import { CreateWorkoutScreen } from '../features/trainer/screens/CreateWorkoutScreen';
import { ExerciseService } from '../features/exercises/services/exerciseService';
import { WorkoutService } from '../features/training/services/workoutService';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

let mockRouteParams: any = {
  exerciseId: 'ex_squat_01',
  exerciseName: 'Barbell Back Squat',
  workoutId: 'workout_alex_001',
  memberProfileId: 'member_alex_001',
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

jest.mock('../features/exercises/services/exerciseService', () => ({
  ExerciseService: {
    getExercises: jest.fn(),
    getExerciseById: jest.fn(),
    createCustomExercise: jest.fn(),
    archiveExercise: jest.fn(),
  },
}));

jest.mock('../features/training/services/workoutService', () => ({
  WorkoutService: {
    getWorkouts: jest.fn(),
    getWorkoutById: jest.fn(),
    assignWorkout: jest.fn(),
    startWorkout: jest.fn(),
    completeWorkout: jest.fn(),
    cancelWorkout: jest.fn(),
    logSet: jest.fn(),
    correctSet: jest.fn(),
    deleteSet: jest.fn(),
    getTemplates: jest.fn(),
  },
}));

describe('Workouts & Exercise Library Mobile Screens (Day 13)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. ExerciseLibraryScreen', () => {
    it('renders search and fetches exercises', async () => {
      (ExerciseService.getExercises as jest.Mock).mockResolvedValue({
        items: [
          {
            id: 'ex_squat_01',
            name: 'Barbell Back Squat',
            difficulty: 'INTERMEDIATE',
            primaryMuscleGroup: 'QUADRICEPS',
            ownershipType: 'SYSTEM',
            equipment: 'BARBELL',
          },
        ],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      const { getByText, getByPlaceholderText } = render(<ExerciseLibraryScreen />);

      expect(getByText('Exercise Library')).toBeTruthy();
      expect(getByPlaceholderText('Search exercises, cues, muscles...')).toBeTruthy();

      await waitFor(() => {
        expect(getByText('Barbell Back Squat')).toBeTruthy();
      });

      fireEvent.press(getByText('Barbell Back Squat'));
      expect(mockNavigate).toHaveBeenCalledWith('ExerciseDetail', {
        exerciseId: 'ex_squat_01',
        exerciseName: 'Barbell Back Squat',
      });
    });
  });

  describe('2. ExerciseDetailScreen', () => {
    it('renders exercise detail with coaching cues and steps', async () => {
      (ExerciseService.getExerciseById as jest.Mock).mockResolvedValue({
        id: 'ex_squat_01',
        name: 'Barbell Back Squat',
        difficulty: 'INTERMEDIATE',
        primaryMuscleGroup: 'QUADRICEPS',
        equipment: 'BARBELL',
        instructions: 'Setup bar\nSquat deep',
        coachingCues: ['Knees over toes', 'Brace core'],
        safetyNotes: 'Keep lumbar spine neutral',
      });

      const { getByText } = render(<ExerciseDetailScreen />);

      await waitFor(() => {
        expect(getByText('Barbell Back Squat')).toBeTruthy();
        expect(getByText('COACHING CUES')).toBeTruthy();
        expect(getByText('Knees over toes')).toBeTruthy();
        expect(getByText('Setup bar')).toBeTruthy();
        expect(getByText('SAFETY & FORM CHECK')).toBeTruthy();
      });
    });
  });

  describe('3. WorkoutSessionScreen (Player)', () => {
    it('renders workout session, unit toggle, and logs set', async () => {
      (WorkoutService.getWorkoutById as jest.Mock).mockResolvedValue({
        id: 'workout_alex_001',
        title: 'Lower Body Strength',
        status: 'IN_PROGRESS',
        exercises: [
          {
            id: 'we_01',
            exerciseNameSnapshot: 'Barbell Back Squat',
            targetSets: 3,
            targetReps: 5,
            targetLoad: 120,
            sets: [],
          },
        ],
      });

      (WorkoutService.logSet as jest.Mock).mockResolvedValue({
        id: 'set_01',
        setNumber: 1,
        actualReps: 5,
        actualLoad: 120,
        completed: true,
      });

      const { getByText } = render(<WorkoutSessionScreen />);

      await waitFor(() => {
        expect(getByText('Lower Body Strength')).toBeTruthy();
        expect(getByText('Barbell Back Squat')).toBeTruthy();
        expect(getByText('LOG SET')).toBeTruthy();
      });

      // Unit toggle test
      const unitBtn = getByText('KG');
      fireEvent.press(unitBtn);
      expect(getByText('LB')).toBeTruthy();

      // Log set test
      fireEvent.press(getByText('LOG SET'));
      await waitFor(() => {
        expect(WorkoutService.logSet).toHaveBeenCalledWith(
          'we_01',
          expect.objectContaining({
            setNumber: 1,
            actualLoad: 120,
            isCompleted: true,
          }),
        );
      });
    });
  });

  describe('4. TrainerWorkoutsScreen', () => {
    it('renders client workouts list', async () => {
      (WorkoutService.getWorkouts as jest.Mock).mockResolvedValue({
        items: [
          {
            id: 'w_001',
            title: 'Full Body Conditioning',
            status: 'SCHEDULED',
            scheduledDate: '2026-09-10T00:00:00.000Z',
            estimatedDurationMinutes: 45,
            exercises: [{}, {}],
          },
        ],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      const { getByText } = render(<TrainerWorkoutsScreen />);

      await waitFor(() => {
        expect(getByText('Client Workouts')).toBeTruthy();
        expect(getByText('Full Body Conditioning')).toBeTruthy();
        expect(getByText('2 Exercises')).toBeTruthy();
      });
    });
  });

  describe('5. CreateWorkoutScreen', () => {
    it('renders workout creation form with template selection', async () => {
      (WorkoutService.getTemplates as jest.Mock).mockResolvedValue({
        items: [
          {
            id: 'tmpl_01',
            name: 'Push Protocol',
            difficulty: 'INTERMEDIATE',
            estimatedDurationMinutes: 60,
          },
        ],
      });

      (ExerciseService.getExercises as jest.Mock).mockResolvedValue({
        items: [],
        meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      const { getByText, getByPlaceholderText } = render(<CreateWorkoutScreen />);

      expect(getByText('Program Workout')).toBeTruthy();
      expect(getByPlaceholderText('e.g. Upper Body Strength A')).toBeTruthy();

      await waitFor(() => {
        expect(getByText('Push Protocol')).toBeTruthy();
      });

      // Select template
      fireEvent.press(getByText('Push Protocol'));
      expect(getByText('Assign Workout to Client')).toBeTruthy();
    });
  });
});

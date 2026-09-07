import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { TrainingPlanOverviewScreen } from '../features/training-plans/screens/TrainingPlanOverviewScreen';
import { TrainingCalendarScreen } from '../features/training-plans/screens/TrainingCalendarScreen';
import { TrainerProgrammingScreen } from '../features/training-plans/screens/TrainerProgrammingScreen';
import { WorkoutPreviewScreen } from '../features/training-plans/screens/WorkoutPreviewScreen';
import { TrainingPlanService } from '../features/training-plans/services/trainingPlanService';
import { WorkoutService } from '../features/training/services/workoutService';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

let mockRouteParams: any = {
  planId: 'plan_hypertrophy_001',
  memberProfileId: 'member_alex_001',
  workoutId: 'workout_preview_001',
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

jest.mock('../features/training-plans/services/trainingPlanService', () => ({
  TrainingPlanService: {
    getPlans: jest.fn(),
    getPlanById: jest.fn(),
    createPlan: jest.fn(),
    generatePlanWorkouts: jest.fn(),
    createProgressionRule: jest.fn(),
    activatePlan: jest.fn(),
    pausePlan: jest.fn(),
    getAdherence: jest.fn(),
    getCalendar: jest.fn(),
  },
}));

jest.mock('../features/training/services/workoutService', () => ({
  WorkoutService: {
    getTemplates: jest.fn(),
    getWorkoutById: jest.fn(),
  },
}));

describe('Day 14: Advanced Workout Programming & Training Plans Mobile Screens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {
      planId: 'plan_hypertrophy_001',
      memberProfileId: 'member_alex_001',
      workoutId: 'workout_preview_001',
    };
  });

  describe('1. TrainingPlanOverviewScreen (Member View)', () => {
    it('renders plan overview with weeks, days, and adherence progress', async () => {
      (TrainingPlanService.getPlanById as jest.Mock).mockResolvedValue({
        id: 'plan_hypertrophy_001',
        name: '4-Week Hypertrophy Surge',
        objective: 'Build lean muscle mass with progressive overload',
        status: 'ACTIVE',
        durationWeeks: 4,
        trainerProfile: {
          staffProfile: {
            user: { firstName: 'Marcus', lastName: 'Vance' },
          },
        },
        weeks: [
          {
            id: 'week_01',
            weekNumber: 1,
            title: 'Week 1 - Base Accumulation',
            status: 'IN_PROGRESS',
            days: [
              {
                id: 'day_01',
                dayNumber: 1,
                name: 'Upper Body Power',
                scheduledDate: '2026-09-08T09:00:00.000Z',
                restDay: false,
                workout: {
                  id: 'workout_day_01',
                  name: 'Upper Body Power',
                  status: 'SCHEDULED',
                },
              },
              {
                id: 'day_02',
                dayNumber: 2,
                name: 'Active Recovery',
                scheduledDate: '2026-09-09T09:00:00.000Z',
                restDay: true,
              },
            ],
          },
          {
            id: 'week_02',
            weekNumber: 2,
            title: 'Week 2 - Progressive Load',
            status: 'PLANNED',
            days: [],
          },
        ],
      });

      (TrainingPlanService.getAdherence as jest.Mock).mockResolvedValue({
        planId: 'plan_hypertrophy_001',
        scheduled: 4,
        completed: 2,
        skipped: 0,
        overdue: 1,
        pending: 1,
        adherencePercentage: 50,
      });

      const { getByText, findByText } = render(<TrainingPlanOverviewScreen />);

      expect(await findByText('4-Week Hypertrophy Surge')).toBeTruthy();
      expect(getByText('Build lean muscle mass with progressive overload')).toBeTruthy();
      expect(getByText('Coached by Marcus Vance')).toBeTruthy();
      expect(getByText('Plan Adherence')).toBeTruthy();
      expect(getByText('50%')).toBeTruthy();
      expect(getByText('✓ 2 Completed')).toBeTruthy();
      expect(getByText('⚠️ 1 Overdue')).toBeTruthy();
      expect(getByText('Upper Body Power')).toBeTruthy();

      // Start workout action
      const startBtn = getByText('Start Workout');
      fireEvent.press(startBtn);
      expect(mockNavigate).toHaveBeenCalledWith('WorkoutSession', {
        workoutId: 'workout_day_01',
      });
    });
  });

  describe('2. TrainingCalendarScreen (Calendar & Schedule View)', () => {
    it('renders scheduled workouts and rest days across calendar days', async () => {
      (TrainingPlanService.getCalendar as jest.Mock).mockResolvedValue([
        {
          id: 'day_01',
          dayNumber: 1,
          name: 'Heavy Bench & Rows',
          scheduledDate: '2026-09-08T09:00:00.000Z',
          restDay: false,
          workout: {
            id: 'workout_bench_01',
            name: 'Heavy Bench & Rows',
            status: 'SCHEDULED',
          },
        },
        {
          id: 'day_02',
          dayNumber: 2,
          name: 'Rest & Mobility',
          scheduledDate: '2026-09-09T09:00:00.000Z',
          restDay: true,
        },
      ]);

      const { getByText, findByText } = render(<TrainingCalendarScreen />);

      expect(await findByText('Heavy Bench & Rows')).toBeTruthy();
      expect(getByText('🛋️ Rest & Active Recovery')).toBeTruthy();

      // Press workout day to start session
      fireEvent.press(getByText('Heavy Bench & Rows'));
      expect(mockNavigate).toHaveBeenCalledWith('WorkoutSession', {
        workoutId: 'workout_bench_01',
      });
    });
  });

  describe('3. TrainerProgrammingScreen (Trainer Studio)', () => {
    it('renders programming tools, initializes plan, and applies progression rules', async () => {
      mockRouteParams = { memberProfileId: 'member_alex_001' };

      (WorkoutService.getTemplates as jest.Mock).mockResolvedValue({
        items: [
          { id: 'tmpl_upper_01', name: 'Upper Body Hypertrophy' },
          { id: 'tmpl_lower_01', name: 'Lower Body Strength' },
        ],
        meta: { total: 2 },
      });

      (TrainingPlanService.getPlans as jest.Mock).mockResolvedValue({
        items: [],
        meta: { total: 0 },
      });

      (TrainingPlanService.createPlan as jest.Mock).mockResolvedValue({
        id: 'new_plan_01',
        name: 'New Custom Plan',
        status: 'DRAFT',
      });

      const { getByText, findByText, getByPlaceholderText } = render(<TrainerProgrammingScreen />);

      expect(await findByText('Trainer Programming Studio')).toBeTruthy();
      expect(getByPlaceholderText('e.g. 8-Week Hypertrophy Phase')).toBeTruthy();

      // Submit new plan
      const initBtn = getByText('Initialize Training Plan');
      fireEvent.press(initBtn);

      await waitFor(() => {
        expect(TrainingPlanService.createPlan).toHaveBeenCalledWith(
          expect.objectContaining({
            memberProfileId: 'member_alex_001',
            durationWeeks: 4,
          })
        );
      });
    });
  });

  describe('4. WorkoutPreviewScreen (Read-Only Simulation & Exercise Groups)', () => {
    it('renders supersets, exercise groups, target volume, and progression details', async () => {
      (WorkoutService.getWorkoutById as jest.Mock).mockResolvedValue({
        id: 'workout_preview_001',
        title: 'Upper Power Superset Day',
        status: 'SCHEDULED',
        scheduledDate: '2026-09-08T09:00:00.000Z',
        exerciseGroups: [
          {
            id: 'grp_01',
            name: 'Chest & Back Superset A',
            type: 'SUPERSET',
            section: 'MAIN',
            rounds: 4,
            restBetweenExercises: 30,
            restBetweenRounds: 90,
            sortOrder: 0,
            exercises: [
              {
                id: 'we_01',
                exerciseNameSnapshot: 'Barbell Bench Press',
                orderInGroup: 0,
                targetSets: 3,
                targetReps: '8',
                targetLoad: 80,
                targetRPE: 8,
              },
              {
                id: 'we_02',
                exerciseNameSnapshot: 'Neutral Grip Pull-Up',
                orderInGroup: 1,
                targetSets: 3,
                targetReps: '10',
                targetRPE: 8.5,
              },
            ],
          },
        ],
        exercises: [],
      });

      const { getByText, findByText } = render(<WorkoutPreviewScreen />);

      expect(await findByText('Upper Power Superset Day')).toBeTruthy();
      expect(getByText('Chest & Back Superset A')).toBeTruthy();
      expect(getByText('SUPERSET')).toBeTruthy();
      expect(getByText('Barbell Bench Press')).toBeTruthy();
      expect(getByText('Neutral Grip Pull-Up')).toBeTruthy();
      expect(getByText('3 sets × 8 @ 80kg (RPE 8)')).toBeTruthy();
      expect(getByText('3 sets × 10 (RPE 8.5)')).toBeTruthy();
    });
  });
});

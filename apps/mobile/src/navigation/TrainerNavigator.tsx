import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { TrainerStackParamList } from './types';
import { themeColors } from '../theme';
import {
  TrainerHomeScreen,
  TrainerDirectoryScreen,
  TrainerProfileScreen,
  TrainerClientsScreen,
  TrainerWorkoutsScreen,
  CreateWorkoutScreen,
} from '../features/trainer/screens';
import { ExerciseLibraryScreen, ExerciseDetailScreen } from '../features/exercises';
import {
  TrainerClientDetailScreen,
  TrainingProgramScreen,
  GoalsScreen,
  TrainerNotesScreen,
} from '../features/personal-training/screens';
import {
  TrainerProgrammingScreen,
  WorkoutPreviewScreen,
  TrainingCalendarScreen,
} from '../features/training-plans';

const Stack = createNativeStackNavigator<TrainerStackParamList>();

export const TrainerNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: themeColors.background },
      }}
    >
      <Stack.Screen name="TrainerHome" component={TrainerHomeScreen} />
      <Stack.Screen name="TrainerDirectory" component={TrainerDirectoryScreen} />
      <Stack.Screen name="TrainerProfile" component={TrainerProfileScreen} />
      <Stack.Screen name="TrainerClients" component={TrainerClientsScreen} />
      <Stack.Screen name="TrainerClientDetail" component={TrainerClientDetailScreen} />
      <Stack.Screen name="TrainingProgram" component={TrainingProgramScreen} />
      <Stack.Screen name="Goals" component={GoalsScreen} />
      <Stack.Screen name="TrainerNotes" component={TrainerNotesScreen} />
      <Stack.Screen name="ExerciseLibrary" component={ExerciseLibraryScreen} />
      <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
      <Stack.Screen name="TrainerWorkouts" component={TrainerWorkoutsScreen} />
      <Stack.Screen name="CreateWorkout" component={CreateWorkoutScreen} />
      {/* Day 14: Advanced Programming & Previews */}
      <Stack.Screen name="TrainerProgramming" component={TrainerProgrammingScreen} />
      <Stack.Screen name="WorkoutPreview" component={WorkoutPreviewScreen} />
      <Stack.Screen name="TrainingCalendar" component={TrainingCalendarScreen} />
    </Stack.Navigator>
  );
};

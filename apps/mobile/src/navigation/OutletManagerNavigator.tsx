import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { OutletManagerStackParamList } from './types';
import { themeColors } from '../theme';
import { OutletManagerHomeScreen } from '../features/dashboard/screens';
import { StaffDirectoryScreen } from '../features/staff/screens/StaffDirectoryScreen';
import {
  TrainerDirectoryScreen,
  TrainerProfileScreen,
  TrainerClientsScreen,
} from '../features/trainer/screens';
import { RetentionQueueScreen, RetentionDetailScreen, RetentionAgentDashboardScreen } from '../features/retention';
import { ReactivationQueueScreen, RecoveryPlanDetailScreen } from '../features/reactivation';
import { AutomationCenterScreen } from '../features/automation';
import { ReceptionistAdminScreen } from '../features/ai-receptionist';

const Stack = createNativeStackNavigator<OutletManagerStackParamList>();

export const OutletManagerNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: themeColors.background },
      }}
    >
      <Stack.Screen name="ManagerHome" component={OutletManagerHomeScreen} />
      <Stack.Screen name="StaffDirectory" component={StaffDirectoryScreen} />
      <Stack.Screen name="TrainerDirectory" component={TrainerDirectoryScreen} />
      <Stack.Screen name="TrainerProfile" component={TrainerProfileScreen} />
      <Stack.Screen name="TrainerClients" component={TrainerClientsScreen} />
      {/* Day 26: AI Retention Intelligence */}
      <Stack.Screen name="RetentionQueue" component={RetentionQueueScreen} />
      <Stack.Screen name="RetentionDetail" component={RetentionDetailScreen} />
      {/* Day 27: AI Reactivation & Recovery */}
      <Stack.Screen name="ReactivationQueue" component={ReactivationQueueScreen} />
      <Stack.Screen name="RecoveryPlanDetail" component={RecoveryPlanDetailScreen} />
      {/* Day 29: AI Retention Agent */}
      <Stack.Screen name="RetentionAgentDashboard" component={RetentionAgentDashboardScreen} />
      {/* Day 30: Automated Engagement Workflows */}
      <Stack.Screen name="AutomationCenter" component={AutomationCenterScreen} />
      {/* Day 31: AI Receptionist */}
      <Stack.Screen name="AIReceptionist" component={ReceptionistAdminScreen} />
    </Stack.Navigator>
  );
};

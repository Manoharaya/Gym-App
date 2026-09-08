import React from 'react';
import {
  View,
  StyleSheet,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { spacing, radius, themeColors } from '../../../theme';

export interface NutritionContextModalProps {
  visible: boolean;
  onClose: () => void;
  contextData?: any;
}

export const NutritionContextModal: React.FC<NutritionContextModalProps> = ({
  visible,
  onClose,
  contextData,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>AI Nutrition Data & Privacy</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body}>
            <Text style={styles.sectionTitle}>Authorized Data Sources</Text>
            <Text style={styles.paragraph}>
              The AI Nutrition Coach accesses authorized, tenant-isolated data to personalize your dietary guidance:
            </Text>

            <View style={styles.card}>
              <Text style={styles.itemTitle}>🛡️ Documented Allergies & Intolerances</Text>
              <Text style={styles.itemText}>
                {contextData?.profile?.allergies?.length > 0
                  ? `Active Allergies: ${contextData.profile.allergies.join(', ')} (Strictly excluded from suggestions)`
                  : 'No allergies documented.'}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.itemTitle}>🎯 Configured Nutrition Targets</Text>
              <Text style={styles.itemText}>
                {contextData?.targets?.hasActiveTarget
                  ? `Daily Target: ${contextData.targets.dailyCalories} kcal • ${contextData.targets.proteinGrams}g Protein`
                  : 'No active target configured.'}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.itemTitle}>📋 Assigned Meal Plan</Text>
              <Text style={styles.itemText}>
                {contextData?.mealPlan?.hasAssignedMealPlan
                  ? `Plan: ${contextData.mealPlan.planName} (v${contextData.mealPlan.version})`
                  : 'No meal plan currently assigned.'}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.itemTitle}>🥗 Recent Food Logs</Text>
              <Text style={styles.itemText}>
                {contextData?.recentFoodLogs?.length > 0
                  ? `${contextData.recentFoodLogs.length} verified logs analyzed for daily summary.`
                  : 'No food logs recorded today.'}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Strictly Redacted Sensitive Data</Text>
            <Text style={styles.redactNotice}>
              FitCore guarantees zero exposure of the following sensitive records to the AI model:
            </Text>
            <View style={styles.redactList}>
              <Text style={styles.redactItem}>• PAR-Q & Medical Questionnaire answers</Text>
              <Text style={styles.redactItem}>• Physician clearance & diagnostic documents</Text>
              <Text style={styles.redactItem}>• Private trainer consultation notes</Text>
              <Text style={styles.redactItem}>• Payment methods, billing & card information</Text>
              <Text style={styles.redactItem}>• Access credentials and account passwords</Text>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.doneButton} onPress={onClose}>
            <Text style={styles.doneText}>Close Data Preview</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '85%',
    padding: spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingBottom: spacing[2],
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeBtn: {
    padding: spacing[1],
  },
  closeText: {
    color: '#94A3B8',
    fontSize: 18,
  },
  body: {
    marginBottom: spacing[3],
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#38BDF8',
    marginTop: spacing[2],
    marginBottom: spacing[1],
  },
  paragraph: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 17,
    marginBottom: spacing[2],
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: radius.md,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  itemText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  redactNotice: {
    fontSize: 12,
    color: '#CBD5E1',
    marginBottom: spacing[1],
  },
  redactList: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: radius.md,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  redactItem: {
    fontSize: 12,
    color: '#FCA5A5',
    lineHeight: 18,
  },
  doneButton: {
    backgroundColor: themeColors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  doneText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});

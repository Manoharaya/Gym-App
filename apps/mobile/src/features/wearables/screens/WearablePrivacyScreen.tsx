import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Card, Badge, Icon, Button, Divider } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { WearablesService } from '../services/wearablesService';
import type { WearablePrivacyViewDto } from '@fitcore/types';

export const WearablePrivacyScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [privacyData, setPrivacyData] = useState<WearablePrivacyViewDto | null>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await WearablesService.getPrivacyView();
      setPrivacyData(res);
    } catch {
      Alert.alert('Error', 'Unable to retrieve privacy transparency details');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteAllData = () => {
    Alert.alert(
      'Delete All Wearable Data',
      'This will permanently delete all synchronized health records and disconnect all wearable devices. Your memberships, workout history, and training plans will NOT be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const res = await WearablesService.deleteWearableData();
              Alert.alert(
                'Data Deleted',
                `Successfully deleted ${res.recordsDeleted} wearable health records.`,
              );
              loadData();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete health data.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" size={22} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Health Privacy Centre</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading || !privacyData ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColors.accent} />
          </View>
        ) : (
          <>
            {/* Core Member Ownership Banner */}
            <Card style={styles.ownershipCard}>
              <View style={styles.shieldIconBox}>
                <Icon name="shield" size={32} color={themeColors.accent} />
              </View>
              <Text style={styles.ownershipTitle}>You Own Your Health Data</Text>
              <Text style={styles.ownershipDesc}>
                Wearable telemetry belongs strictly to you as a member, not to any gym outlet or trainer. If you transfer outlets or change memberships, your health data follows you.
              </Text>
            </Card>

            {/* Compliance Consent Status */}
            <Text style={styles.sectionTitle}>DATA PROCESSING CONSENT</Text>
            <Card style={styles.card}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.cardHeading}>WEARABLE_DATA Consent</Text>
                  <Text style={styles.cardSub}>Compliance Policy v{privacyData.activeConsent.version || '1.0'}</Text>
                </View>
                <Badge
                  label={privacyData.activeConsent.consented ? 'GRANTED' : 'NOT GRANTED'}
                  variant={privacyData.activeConsent.consented ? 'success' : 'danger'}
                />
              </View>
              <Text style={styles.consentDateText}>
                {privacyData.activeConsent.consentedAt
                  ? `Consented on ${new Date(privacyData.activeConsent.consentedAt).toLocaleDateString()}`
                  : 'Explicit consent required to link devices.'}
              </Text>
            </Card>

            {/* Coach & Staff Access Boundaries */}
            <Text style={styles.sectionTitle}>TRAINER ACCESS RULES</Text>
            <Card style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardHeading}>Personal Trainer Visibility</Text>
                <Badge
                  label={privacyData.trainerAccess.isPermitted ? 'SUMMARIES ONLY' : 'DISABLED'}
                  variant={privacyData.trainerAccess.isPermitted ? 'primary' : 'neutral'}
                />
              </View>

              {privacyData.trainerAccess.assignedTrainerName ? (
                <Text style={styles.assignedTrainerText}>
                  Assigned Coach: {privacyData.trainerAccess.assignedTrainerName}
                </Text>
              ) : null}

              <Text style={styles.ruleExplainText}>
                Your assigned trainer can only review high-level weekly averages and daily activity totals to adjust workout intensity.
              </Text>

              <View style={styles.bulletList}>
                <View style={styles.bulletItem}>
                  <Icon name="check" size={14} color={themeColors.success} />
                  <Text style={styles.bulletText}>Daily step totals & active calories</Text>
                </View>
                <View style={styles.bulletItem}>
                  <Icon name="check" size={14} color={themeColors.success} />
                  <Text style={styles.bulletText}>Weekly workout session counts</Text>
                </View>
                <View style={styles.bulletItem}>
                  <Icon name="close" size={14} color={themeColors.danger} />
                  <Text style={styles.bulletText}>Raw sensor logs & timestamps (NEVER SHARED)</Text>
                </View>
                <View style={styles.bulletItem}>
                  <Icon name="close" size={14} color={themeColors.danger} />
                  <Text style={styles.bulletText}>Private journal notes & wellness entries (NEVER SHARED)</Text>
                </View>
              </View>
            </Card>

            {/* Stored Categories */}
            <Text style={styles.sectionTitle}>STORED HEALTH CATEGORIES</Text>
            <Card style={styles.card}>
              {privacyData.storedDataCategories.length === 0 ? (
                <Text style={styles.emptyCategoriesText}>No health data currently stored in FitCore.</Text>
              ) : (
                privacyData.storedDataCategories.map((cat, idx) => (
                  <View
                    key={cat.dataType}
                    style={[
                      styles.categoryRow,
                      idx < privacyData.storedDataCategories.length - 1 && styles.borderBottom,
                    ]}
                  >
                    <Text style={styles.catName}>{cat.dataType.replace(/_/g, ' ')}</Text>
                    <Text style={styles.catCount}>{cat.recordCount.toLocaleString()} records</Text>
                  </View>
                ))
              )}
            </Card>

            {/* Retention Policy */}
            <Text style={styles.sectionTitle}>RETENTION & DELETION</Text>
            <Card style={styles.card}>
              <View style={styles.retentionRow}>
                <Text style={styles.retentionLabel}>Normalized Health Records</Text>
                <Text style={styles.retentionValue}>
                  {privacyData.retentionPolicy.normalizedHealthRecordsDays} days
                </Text>
              </View>
              <View style={styles.retentionRow}>
                <Text style={styles.retentionLabel}>Raw Telemetry Debug Payloads</Text>
                <Text style={styles.retentionValue}>
                  {privacyData.retentionPolicy.rawPayloadsDays} days
                </Text>
              </View>

              <Divider style={styles.divider} />

              <Button
                title={deleting ? 'Deleting Data...' : 'Delete All My Wearable Data'}
                onPress={handleDeleteAllData}
                disabled={deleting}
                variant="outline"
              />
            </Card>
          </>
        )}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    paddingVertical: spacing.xxl * 2,
    alignItems: 'center',
  },
  ownershipCard: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: themeColors.surface,
  },
  shieldIconBox: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    backgroundColor: themeColors.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  ownershipTitle: {
    ...typography.h2,
    color: themeColors.textPrimary,
    marginBottom: spacing.xs,
  },
  ownershipDesc: {
    ...typography.body,
    color: themeColors.textSecondary,
    textAlign: 'center',
  },
  sectionTitle: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: themeColors.textTertiary,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  card: {
    padding: spacing.lg,
    backgroundColor: themeColors.surface,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeading: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  cardSub: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  consentDateText: {
    ...typography.caption,
    color: themeColors.textTertiary,
    marginTop: spacing.sm,
  },
  assignedTrainerText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: themeColors.accent,
    marginTop: spacing.xs,
  },
  ruleExplainText: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  bulletList: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  bulletText: {
    ...typography.caption,
    color: themeColors.textPrimary,
  },
  emptyCategoriesText: {
    ...typography.bodySmall,
    color: themeColors.textTertiary,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  catName: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  catCount: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  retentionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  retentionLabel: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
  },
  retentionValue: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  divider: {
    marginVertical: spacing.md,
  },
});

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Card, Badge, Icon, MetricCard } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';

export const WearablesScreen: React.FC = () => {
  const navigation = useNavigation();

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wearables & Telemetry</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Live Biometrics Row */}
        <View style={styles.metricsRow}>
          <MetricCard
            label="RESTING HR"
            value="52"
            unit="bpm"
            change="-3 bpm"
            trend="up"
            icon="heart"
            accentColor={themeColors.heartRate}
            style={styles.flexMetric}
          />
          <MetricCard
            label="HRV (RMSSD)"
            value="72"
            unit="ms"
            change="+8 ms"
            trend="up"
            icon="activity"
            accentColor={themeColors.success}
            style={styles.flexMetric}
          />
        </View>

        {/* Connected Devices List */}
        <Card style={styles.devicesCard}>
          <Text style={styles.sectionHeading}>CONNECTED SENSORS</Text>

          {/* Device 1: Apple Watch */}
          <View style={styles.deviceItem}>
            <View style={styles.deviceIconBox}>
              <Icon name="activity" size={20} color={themeColors.accent} />
            </View>
            <View style={styles.deviceDetails}>
              <View style={styles.deviceNameRow}>
                <Text style={styles.deviceName}>Apple Watch Ultra 2</Text>
                <Badge label="CONNECTED" variant="success" />
              </View>
              <Text style={styles.deviceSync}>Last synced 2 mins ago · Battery 82%</Text>
            </View>
          </View>

          {/* Device 2: Whoop */}
          <View style={styles.deviceItem}>
            <View style={styles.deviceIconBox}>
              <Icon name="bolt" size={20} color={themeColors.aiPrimary} />
            </View>
            <View style={styles.deviceDetails}>
              <View style={styles.deviceNameRow}>
                <Text style={styles.deviceName}>Whoop 4.0 Strap</Text>
                <Badge label="SYNCED" variant="success" />
              </View>
              <Text style={styles.deviceSync}>Day Strain: 12.4 · Recovery: 88%</Text>
            </View>
          </View>

          {/* Device 3: Garmin */}
          <View style={styles.deviceItem}>
            <View style={styles.deviceIconBox}>
              <Icon name="timer" size={20} color={themeColors.textMuted} />
            </View>
            <View style={styles.deviceDetails}>
              <View style={styles.deviceNameRow}>
                <Text style={styles.deviceName}>Garmin Connect IQ</Text>
                <Badge label="NOT PAIRED" variant="neutral" />
              </View>
              <Text style={styles.deviceSync}>Tap to connect telemetry gateway</Text>
            </View>
          </View>
        </Card>

        {/* Sleep Telemetry Breakdown */}
        <Card style={styles.sleepCard}>
          <View style={styles.sleepHeader}>
            <View>
              <Text style={styles.sleepTitle}>Sleep Architecture</Text>
              <Text style={styles.sleepDuration}>8h 12m Total Sleep</Text>
            </View>
            <Badge label="94% EFFICIENCY" variant="success" />
          </View>

          <View style={styles.sleepStages}>
            <View style={styles.stageCol}>
              <Text style={styles.stageVal}>1h 45m</Text>
              <Text style={styles.stageLabel}>Deep Sleep</Text>
            </View>
            <View style={styles.stageCol}>
              <Text style={styles.stageVal}>2h 10m</Text>
              <Text style={styles.stageLabel}>REM Phase</Text>
            </View>
            <View style={styles.stageCol}>
              <Text style={styles.stageVal}>4h 17m</Text>
              <Text style={styles.stageLabel}>Core / Light</Text>
            </View>
          </View>
        </Card>

        {/* Security & Health Privacy */}
        <Card style={styles.privacyCard}>
          <View style={styles.privacyHeader}>
            <Icon name="shield" size={16} color={themeColors.success} />
            <Text style={styles.privacyTitle}>ON-DEVICE HEALTH DATA ENCRYPTION</Text>
          </View>
          <Text style={styles.privacyText}>
            FitCore processes biometric telemetry strictly on-device or in an encrypted tenant enclave. Raw biometric signals are never sold, exposed to advertising networks, or transmitted across tenant boundaries.
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  backButton: {
    padding: spacing[2],
    marginLeft: -spacing[2],
  },
  headerTitle: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  container: {
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[10],
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  flexMetric: {
    flex: 1,
  },
  devicesCard: {
    padding: spacing[4],
    gap: spacing[3.5],
  },
  sectionHeading: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[1],
  },
  deviceIconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: themeColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  deviceDetails: {
    flex: 1,
    gap: 2,
  },
  deviceNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceName: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  deviceSync: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 11,
  },
  sleepCard: {
    padding: spacing[4],
    gap: spacing[3.5],
  },
  sleepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sleepTitle: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  sleepDuration: {
    ...typography.h3,
    color: themeColors.accent,
    fontWeight: '800',
    marginTop: 2,
  },
  sleepStages: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: themeColors.surface,
    padding: spacing[3],
    borderRadius: radius.md,
  },
  stageCol: {
    alignItems: 'center',
  },
  stageVal: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  stageLabel: {
    ...typography.caption,
    color: themeColors.textMuted,
    marginTop: 2,
  },
  privacyCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    padding: spacing[4],
    gap: spacing[2],
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  privacyTitle: {
    ...typography.caption,
    color: themeColors.success,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  privacyText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    lineHeight: 18,
  },
});

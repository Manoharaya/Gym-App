import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Icon, Badge, Button } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';

const sp = {
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
  lg: spacing[6],
};

interface GuidedSessionHeaderProps {
  title: string;
  currentStepIndex: number;
  totalSteps: number;
  itemTitle?: string;
  itemType?: string;
  onExit: () => void;
  onPause?: () => void;
}

export const GuidedSessionHeader: React.FC<GuidedSessionHeaderProps> = ({
  title,
  currentStepIndex,
  totalSteps,
  itemTitle,
  itemType,
  onExit,
  onPause,
}) => {
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const stepNumber = Math.min(totalSteps, currentStepIndex + 1);
  const percent = totalSteps > 0 ? Math.round((stepNumber / totalSteps) * 100) : 0;

  const handleExitClick = () => {
    setShowExitConfirm(true);
    if (onPause) onPause();
  };

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    onExit();
  };

  const handleCancelExit = () => {
    setShowExitConfirm(false);
  };

  return (
    <View style={styles.container}>
      {/* Top Controls Row */}
      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleExitClick}
          accessibilityLabel="Exit guided session"
          accessibilityRole="button"
        >
          <Icon name="close" size={22} color={themeColors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.titleColumn}>
          <Text style={styles.sessionTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.stepCounter}>
            Step {stepNumber} of {totalSteps}
          </Text>
        </View>

        {itemType ? (
          <Badge
            label={itemType.replace('_', ' ')}
            variant={
              itemType === 'EXERCISE_TUTORIAL'
                ? 'accent'
                : itemType === 'PRACTICE'
                ? 'success'
                : itemType === 'REST'
                ? 'warning'
                : itemType === 'KNOWLEDGE_CHECK'
                ? 'primary'
                : 'neutral'
            }
          />
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Progress Bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.max(2, percent)}%` }]} />
      </View>

      {/* Current Step Sub-Header */}
      {itemTitle && (
        <View style={styles.itemHeader}>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {itemTitle}
          </Text>
        </View>
      )}

      {/* Exit Confirmation Modal */}
      <Modal
        visible={showExitConfirm}
        transparent
        animationType="fade"
        onRequestClose={handleCancelExit}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconBox}>
              <Icon name="award" size={28} color={themeColors.accent} />
            </View>

            <Text style={styles.modalTitle}>Exit Guided Session?</Text>
            <Text style={styles.modalBody}>
              Your progress will be saved. You can resume anytime from Step {stepNumber}.
            </Text>

            <View style={styles.modalButtons}>
              <Button
                title="Continue Learning"
                variant="primary"
                onPress={handleCancelExit}
                style={styles.modalBtn}
              />
              <Button
                title="Save & Exit"
                variant="outline"
                onPress={handleConfirmExit}
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: themeColors.elevatedBackground,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
    paddingTop: sp.sm,
    paddingBottom: sp.xs,
    paddingHorizontal: sp.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: sp.xs,
  },
  closeButton: {
    padding: sp.xs,
    borderRadius: radius.full,
    backgroundColor: '#1C2333',
  },
  titleColumn: {
    flex: 1,
    marginHorizontal: sp.sm,
    alignItems: 'center',
  },
  sessionTitle: {
    ...typography.caption,
    color: themeColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepCounter: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#1E2638',
    borderRadius: 2,
    marginVertical: sp.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: themeColors.accent,
    borderRadius: 2,
  },
  itemHeader: {
    paddingVertical: 2,
    alignItems: 'center',
  },
  itemTitle: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: sp.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.lg,
    padding: sp.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  modalIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: sp.md,
  },
  modalTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
    marginBottom: sp.xs,
    textAlign: 'center',
  },
  modalBody: {
    ...typography.body,
    color: themeColors.textSecondary,
    textAlign: 'center',
    marginBottom: sp.lg,
    lineHeight: 20,
  },
  modalButtons: {
    width: '100%',
    gap: sp.sm,
  },
  modalBtn: {
    width: '100%',
  },
});

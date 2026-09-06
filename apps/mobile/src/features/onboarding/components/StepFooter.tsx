import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button } from '../../../components/primitives/Button';

interface StepFooterProps {
  onNext: () => void;
  onBack?: () => void;
  onSaveDraft?: () => void;
  nextLabel?: string;
  backLabel?: string;
  isSubmitting?: boolean;
  canProceed?: boolean;
}

export const StepFooter: React.FC<StepFooterProps> = ({
  onNext,
  onBack,
  onSaveDraft,
  nextLabel = 'Continue',
  backLabel = 'Back',
  isSubmitting = false,
  canProceed = true,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.buttonRow}>
        {onBack && (
          <View style={styles.backWrapper}>
            <Button
              title={backLabel}
              variant="outline"
              onPress={onBack}
              disabled={isSubmitting}
            />
          </View>
        )}

        {onSaveDraft && (
          <View style={styles.draftWrapper}>
            <Button
              title="Save Draft"
              variant="ghost"
              onPress={onSaveDraft}
              disabled={isSubmitting}
            />
          </View>
        )}

        <View style={styles.nextWrapper}>
          <Button
            title={nextLabel}
            variant="primary"
            onPress={onNext}
            loading={isSubmitting}
            disabled={!canProceed || isSubmitting}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: '#262626',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  backWrapper: {
    flex: 1,
  },
  draftWrapper: {
    flex: 1,
  },
  nextWrapper: {
    flex: 2,
  },
});

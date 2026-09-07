import React from 'react';
import { View, StyleSheet, Text, Modal, TouchableOpacity } from 'react-native';
import { spacing, radius } from '../../theme';

export interface AIConfirmationDialogProps {
  visible: boolean;
  title: string;
  description: string;
  parameters?: Record<string, any>;
  onConfirm: () => void;
  onCancel: () => void;
  isExecuting?: boolean;
}

export const AIConfirmationDialog: React.FC<AIConfirmationDialogProps> = ({
  visible,
  title,
  description,
  parameters,
  onConfirm,
  onCancel,
  isExecuting = false,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>⚡ Action Confirmation</Text>
            </View>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>

          {parameters && Object.keys(parameters).length > 0 && (
            <View style={styles.paramBox}>
              <Text style={styles.paramTitle}>Parameters:</Text>
              {Object.entries(parameters).map(([key, value]) => (
                <Text key={key} style={styles.paramItem}>
                  <Text style={styles.paramKey}>{key}: </Text>
                  {String(value)}
                </Text>
              ))}
            </View>
          )}

          <Text style={styles.disclaimer}>
            FitCore AI will execute this action on your behalf once confirmed.
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={isExecuting}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={onConfirm}
              disabled={isExecuting}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmText}>
                {isExecuting ? 'Executing...' : 'Confirm Action'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: radius.xl,
    padding: spacing[6],
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#334155',
  },
  badgeRow: {
    marginBottom: spacing[2],
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  badgeText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: spacing[2],
  },
  description: {
    fontSize: 14,
    color: '#CBD5E1',
    marginBottom: spacing[4],
    lineHeight: 20,
  },
  paramBox: {
    backgroundColor: '#0F172A',
    padding: spacing[3],
    borderRadius: radius.md,
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: '#334155',
  },
  paramTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: spacing[1],
  },
  paramItem: {
    fontSize: 12,
    color: '#E2E8F0',
  },
  paramKey: {
    color: '#94A3B8',
  },
  disclaimer: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: spacing[6],
    fontStyle: 'italic',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing[3],
    backgroundColor: '#334155',
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: spacing[3],
    backgroundColor: '#0EA5E9',
    borderRadius: radius.md,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
});

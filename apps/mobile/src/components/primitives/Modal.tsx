import React from 'react';
import { Modal as RNModal, Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { radius, shadows, spacing, themeColors } from '../../theme';

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  dismissable?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  children,
  style,
  dismissable = true,
}) => {
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={dismissable ? onClose : undefined}>
        <Pressable style={[styles.content, shadows.lg, style]} onPress={(e) => e.stopPropagation()}>
          {children}
        </Pressable>
      </Pressable>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[4],
  },
  content: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: themeColors.modalBackground,
    borderRadius: radius.xl,
    padding: spacing[5],
    borderWidth: 1,
    borderColor: themeColors.border,
  },
});

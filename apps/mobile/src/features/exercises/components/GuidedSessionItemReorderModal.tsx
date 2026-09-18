import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Badge, Icon, Button } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import type { GuidedSessionItem } from '../services/exerciseService';

const sp = {
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
  lg: spacing[6],
};

interface GuidedSessionItemReorderModalProps {
  visible: boolean;
  items: GuidedSessionItem[];
  onClose: () => void;
  onSaveOrder: (reorderedItems: GuidedSessionItem[]) => void;
  onDeleteItem?: (itemId: string) => void;
}

export const GuidedSessionItemReorderModal: React.FC<GuidedSessionItemReorderModalProps> = ({
  visible,
  items,
  onClose,
  onSaveOrder,
  onDeleteItem,
}) => {
  const [localItems, setLocalItems] = useState<GuidedSessionItem[]>(items);

  React.useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const moveUp = (index: number) => {
    if (index === 0) return;
    const next = [...localItems];
    const prevItem = next[index - 1];
    const currentItem = next[index];
    if (prevItem && currentItem) {
      next[index - 1] = currentItem;
      next[index] = prevItem;
      setLocalItems(next);
    }
  };

  const moveDown = (index: number) => {
    if (index === localItems.length - 1) return;
    const next = [...localItems];
    const nextItem = next[index + 1];
    const currentItem = next[index];
    if (nextItem && currentItem) {
      next[index + 1] = currentItem;
      next[index] = nextItem;
      setLocalItems(next);
    }
  };

  const handleSave = () => {
    const updated = localItems.map((item, idx) => ({
      ...item,
      sortOrder: idx,
    }));
    onSaveOrder(updated);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Reorder Learning Items</Text>
              <Text style={styles.subtitle}>
                Use up/down arrows to structure sequential session progression
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={20} color={themeColors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Items List */}
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {localItems.map((item, idx) => (
              <View key={item.id || idx} style={styles.itemRow}>
                <View style={styles.orderBadge}>
                  <Text style={styles.orderText}>{idx + 1}</Text>
                </View>

                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={styles.itemMeta}>
                    <Badge
                      label={item.itemType.replace('_', ' ')}
                      variant="neutral"
                    />
                    {item.durationSeconds && (
                      <Text style={styles.itemDuration}>
                        {item.durationSeconds}s
                      </Text>
                    )}
                  </View>
                </View>

                  {/* Arrow Controls */}
                <View style={styles.arrowControls}>
                  <TouchableOpacity
                    style={[styles.arrowBtn, idx === 0 && styles.arrowBtnDisabled]}
                    onPress={() => moveUp(idx)}
                    disabled={idx === 0}
                    accessibilityLabel={`Move ${item.title} up`}
                  >
                    <Icon
                      name="chevron-down"
                      size={18}
                      color={idx === 0 ? themeColors.textMuted : themeColors.textPrimary}
                      style={{ transform: [{ rotate: '180deg' }] }}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.arrowBtn,
                      idx === localItems.length - 1 && styles.arrowBtnDisabled,
                    ]}
                    onPress={() => moveDown(idx)}
                    disabled={idx === localItems.length - 1}
                    accessibilityLabel={`Move ${item.title} down`}
                  >
                    <Icon
                      name="chevron-down"
                      size={18}
                      color={
                        idx === localItems.length - 1
                          ? themeColors.textMuted
                          : themeColors.textPrimary
                      }
                    />
                  </TouchableOpacity>

                  {onDeleteItem && (
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => onDeleteItem(item.id)}
                      accessibilityLabel={`Delete ${item.title}`}
                    >
                      <Icon name="close" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <Button
              title="Save Order"
              variant="primary"
              onPress={handleSave}
              style={{ flex: 1 }}
            />
            <Button
              title="Cancel"
              variant="outline"
              onPress={onClose}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: sp.md,
  },
  modalCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.lg,
    padding: sp.md,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: sp.md,
    paddingBottom: sp.sm,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  title: {
    ...typography.h3,
    color: themeColors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: themeColors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    paddingBottom: sp.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: sp.sm,
    paddingHorizontal: sp.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2638',
    gap: sp.sm,
  },
  orderBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1E2638',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderText: {
    ...typography.caption,
    fontWeight: '700',
    color: themeColors.accent,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginBottom: 4,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.xs,
  },
  itemDuration: {
    ...typography.caption,
    color: themeColors.textMuted,
  },
  arrowControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  arrowBtn: {
    padding: 6,
    borderRadius: radius.sm,
    backgroundColor: '#1C2333',
  },
  arrowBtnDisabled: {
    opacity: 0.3,
  },
  deleteBtn: {
    padding: 6,
    marginLeft: 4,
  },
  footer: {
    flexDirection: 'row',
    gap: sp.sm,
    paddingTop: sp.md,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
});

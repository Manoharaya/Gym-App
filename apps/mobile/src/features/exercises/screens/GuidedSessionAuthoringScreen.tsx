import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Card, Badge, Icon, Button } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import {
  ExerciseService,
  GuidedSessionDetail,
  GuidedSessionItem,
  GuidedSessionItemType,
  PublishValidationResult,
} from '../services/exerciseService';
import { GuidedSessionItemReorderModal } from '../components/GuidedSessionItemReorderModal';

const sp = {
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
  lg: spacing[6],
};

const ITEM_TYPES: GuidedSessionItemType[] = [
  'INTRO',
  'WARMUP',
  'EXERCISE_TUTORIAL',
  'PRACTICE',
  'REST',
  'TRANSITION',
  'KNOWLEDGE_CHECK',
  'COOLDOWN',
  'SUMMARY',
];

const CATEGORIES = [
  'FUNDAMENTALS',
  'SKILL_MASTERY',
  'STRENGTH',
  'MOBILITY',
  'REHAB',
  'POSTURE',
];

const DIFFICULTIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

export const GuidedSessionAuthoringScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const sessionId = route.params?.sessionId;

  const [loading, setLoading] = useState(!!sessionId);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<GuidedSessionDetail | null>(null);

  // Session metadata form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('FUNDAMENTALS');
  const [difficulty, setDifficulty] = useState('BEGINNER');
  const [primaryGoal, setPrimaryGoal] = useState('TECHNIQUE');
  const [estimatedDuration, setEstimatedDuration] = useState('25');

  // Modals state
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [validationResult, setValidationResult] = useState<PublishValidationResult | null>(null);

  // New item form state
  const [newItemType, setNewItemType] = useState<GuidedSessionItemType>('EXERCISE_TUTORIAL');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemDuration, setNewItemDuration] = useState('60');
  const [newItemReps, setNewItemReps] = useState('8');
  const [newItemExerciseId, setNewItemExerciseId] = useState('');
  const [newItemCheckId, setNewItemCheckId] = useState('');

  // Search published exercises for linking
  const [availableExercises, setAvailableExercises] = useState<any[]>([]);

  const loadSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      const data = await ExerciseService.getGuidedSession(sessionId);
      setDetail(data);
      setTitle(data.session.title);
      setDescription(data.session.description || '');
      setCategory(data.session.category || 'FUNDAMENTALS');
      setDifficulty(data.session.difficulty || 'BEGINNER');
      setPrimaryGoal(data.session.primaryGoal || 'TECHNIQUE');
      setEstimatedDuration(String(data.session.estimatedDurationMinutes || 25));

      const validation = await ExerciseService.validateGuidedSession(sessionId);
      setValidationResult(validation);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not load session');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadSession();
    // Load available exercises for dropdown
    ExerciseService.getExercises({ limit: 50 }).then((res) => {
      setAvailableExercises(res.items || []);
    }).catch(() => {});
  }, [loadSession]);

  const handleSaveSessionMetadata = async () => {
    try {
      setSaving(true);
      if (sessionId) {
        await ExerciseService.updateGuidedSession(sessionId, {
          title,
          description,
          category,
          difficulty,
          primaryGoal,
          estimatedDurationMinutes: parseInt(estimatedDuration, 10) || 20,
        });
        Alert.alert('Saved', 'Session metadata updated.');
        loadSession();
      } else {
        const created = await ExerciseService.createGuidedSession({
          title,
          description,
          category,
          difficulty,
          primaryGoal,
          estimatedDurationMinutes: parseInt(estimatedDuration, 10) || 20,
        });
        Alert.alert('Created', 'Guided session created! Now add sections and learning items.');
        navigation.replace('GuidedSessionAuthoring', { sessionId: created.id });
      }
    } catch (err: any) {
      Alert.alert('Save Error', err?.response?.data?.message || 'Failed to save session');
    } finally {
      setSaving(false);
    }
  };



  const handleAddItem = async () => {
    if (!sessionId || !newItemTitle.trim()) return;
    try {
      await ExerciseService.addGuidedSessionItem(sessionId, {
        itemType: newItemType,
        title: newItemTitle.trim(),
        description: newItemDesc.trim() || undefined,
        durationSeconds: parseInt(newItemDuration, 10) || undefined,
        repetitionCount: newItemType === 'PRACTICE' ? parseInt(newItemReps, 10) || 8 : undefined,
        exerciseId: newItemExerciseId || undefined,
        knowledgeCheckId: newItemCheckId || undefined,
        sortOrder: detail?.items.length || 0,
      });

      setNewItemTitle('');
      setNewItemDesc('');
      setNewItemExerciseId('');
      setNewItemCheckId('');
      setShowAddItemModal(false);
      loadSession();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to add item');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!sessionId) return;
    try {
      await ExerciseService.deleteGuidedSessionItem(sessionId, itemId);
      loadSession();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to delete item');
    }
  };

  const handleSaveReorder = async (reorderedItems: GuidedSessionItem[]) => {
    if (!sessionId) return;
    try {
      await ExerciseService.reorderGuidedSessionItems(
        sessionId,
        reorderedItems.map((item, idx) => ({
          id: item.id,
          sortOrder: idx,
          sectionId: item.sectionId || undefined,
        })),
      );
      loadSession();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save order');
    }
  };

  const handlePublish = async () => {
    if (!sessionId) return;
    try {
      await ExerciseService.publishGuidedSession(sessionId);
      Alert.alert('Success', 'Guided session published to gym members!');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Publish Error', err?.response?.data?.message || 'Validation failed');
    }
  };

  const handlePreviewAsMember = () => {
    if (!sessionId) return;
    navigation.navigate('GuidedExerciseSession', {
      sessionId,
      previewMode: true,
    });
  };

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={themeColors.accent} />
        <Text style={styles.loadingText}>Loading authoring editor...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Title & Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>
            {sessionId ? 'Edit Guided Session' : 'Create Guided Session'}
          </Text>
          <Text style={styles.headerSub}>
            Author structured multi-exercise tutorial flows & practice programs
          </Text>
        </View>

        {sessionId && (
          <TouchableOpacity
            style={styles.previewBtn}
            onPress={handlePreviewAsMember}
          >
            <Icon name="activity" size={16} color="#FFFFFF" />
            <Text style={styles.previewBtnText}>Preview</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Basic Metadata Form */}
      <Card style={styles.card}>
        <Text style={styles.formSectionHeader}>Session Metadata</Text>

        <Text style={styles.inputLabel}>Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Lower Body Movement Fundamentals"
          placeholderTextColor={themeColors.textMuted}
        />

        <Text style={styles.inputLabel}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the educational objectives, target lifter, and mechanics..."
          placeholderTextColor={themeColors.textMuted}
          multiline
          numberOfLines={3}
        />

        {/* Category Selector */}
        <Text style={styles.inputLabel}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.pill, category === cat && styles.pillActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.pillText, category === cat && styles.pillTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Difficulty Selector */}
        <Text style={styles.inputLabel}>Difficulty</Text>
        <View style={styles.pillsRow}>
          {DIFFICULTIES.map((diff) => (
            <TouchableOpacity
              key={diff}
              style={[styles.pill, difficulty === diff && styles.pillActive]}
              onPress={() => setDifficulty(diff)}
            >
              <Text style={[styles.pillText, difficulty === diff && styles.pillTextActive]}>
                {diff}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Duration Input */}
        <Text style={styles.inputLabel}>Estimated Duration (Minutes)</Text>
        <TextInput
          style={styles.input}
          value={estimatedDuration}
          onChangeText={setEstimatedDuration}
          keyboardType="numeric"
          placeholder="20"
          placeholderTextColor={themeColors.textMuted}
        />

        <Button
          title={sessionId ? 'Update Metadata' : 'Create Session Draft'}
          variant="primary"
          onPress={handleSaveSessionMetadata}
          loading={saving}
          style={{ marginTop: sp.md }}
        />
      </Card>

      {/* Items & Sections Management (Only if session exists) */}
      {sessionId && detail && (
        <View style={styles.section}>
          <View style={styles.sectionHeadingRow}>
            <View>
              <Text style={styles.sectionHeading}>Learning Items & Syllabus</Text>
              <Text style={styles.sectionSub}>
                {detail.items.length} total steps in sequence
              </Text>
            </View>

            <View style={styles.authoringActionButtons}>
              <TouchableOpacity
                style={styles.smallActionBtn}
                onPress={() => setShowReorderModal(true)}
              >
                <Icon name="activity" size={16} color={themeColors.textPrimary} />
                <Text style={styles.smallActionBtnText}>Reorder</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.smallActionBtn, { backgroundColor: themeColors.accent }]}
                onPress={() => setShowAddItemModal(true)}
              >
                <Icon name="plus" size={16} color="#FFFFFF" />
                <Text style={[styles.smallActionBtnText, { color: '#FFFFFF' }]}>
                  Add Step
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Items List */}
          <Card style={styles.card}>
            {detail.items.length > 0 ? (
              detail.items.map((item, idx) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={styles.itemOrderCircle}>
                    <Text style={styles.itemOrderText}>{idx + 1}</Text>
                  </View>

                  <View style={styles.itemDetails}>
                    <Text style={styles.itemTitleText}>{item.title}</Text>
                    <View style={styles.itemBadgeRow}>
                      <Badge
                        label={item.itemType.replace('_', ' ')}
                        variant="neutral"
                      />
                      {item.durationSeconds && (
                        <Text style={styles.itemSubText}>{item.durationSeconds}s</Text>
                      )}
                      {item.repetitionCount && (
                        <Text style={styles.itemSubText}>{item.repetitionCount} reps</Text>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleDeleteItem(item.id)}
                    style={styles.itemDeleteBtn}
                  >
                    <Icon name="close" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.emptyItemsText}>
                No items added yet. Tap "Add Step" to begin structuring the tutorial sequence.
              </Text>
            )}
          </Card>
        </View>
      )}

      {/* Validation & Publishing Report (Only if session exists) */}
      {sessionId && validationResult && (
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Publishing Validation</Text>

          <Card style={styles.card}>
            <View style={styles.validationStatusRow}>
              <Icon
                name={validationResult.isValid ? 'check-circle' : 'alert-circle'}
                size={22}
                color={validationResult.isValid ? '#10B981' : '#EF4444'}
              />
              <Text
                style={[
                  styles.validationStatusText,
                  { color: validationResult.isValid ? '#10B981' : '#EF4444' },
                ]}
              >
                {validationResult.isValid
                  ? 'Session Ready to Publish'
                  : 'Action Required Before Publishing'}
              </Text>
            </View>

            {validationResult.errors.length > 0 && (
              <View style={styles.validationErrorsBox}>
                <Text style={styles.validationErrorsTitle}>Blocking Errors:</Text>
                {validationResult.errors.map((err, idx) => (
                  <Text key={idx} style={styles.validationErrorItem}>
                    • {err}
                  </Text>
                ))}
              </View>
            )}

            {validationResult.warnings.length > 0 && (
              <View style={styles.validationWarningsBox}>
                <Text style={styles.validationWarningsTitle}>Recommendations:</Text>
                {validationResult.warnings.map((w, idx) => (
                  <Text key={idx} style={styles.validationWarningItem}>
                    • {w}
                  </Text>
                ))}
              </View>
            )}

            <Button
              title="Publish Guided Session"
              variant="primary"
              leftIcon={<Icon name="check-circle" size={16} color="#FFFFFF" />}
              onPress={handlePublish}
              disabled={!validationResult.isValid}
              style={{ marginTop: sp.md }}
            />
          </Card>
        </View>
      )}

      {/* Add Item Modal */}
      <Modal
        visible={showAddItemModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddItemModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Learning Step</Text>

            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={styles.inputLabel}>Step Type</Text>
              <View style={styles.typeGrid}>
                {ITEM_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.typeChip,
                      newItemType === t && styles.typeChipActive,
                    ]}
                    onPress={() => setNewItemType(t)}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        newItemType === t && styles.typeChipTextActive,
                      ]}
                    >
                      {t.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                value={newItemTitle}
                onChangeText={setNewItemTitle}
                placeholder="e.g. Squat Technique Tutorial"
                placeholderTextColor={themeColors.textMuted}
              />

              <Text style={styles.inputLabel}>Instructions / Cue Note</Text>
              <TextInput
                style={styles.input}
                value={newItemDesc}
                onChangeText={setNewItemDesc}
                placeholder="Key coaching cues or setup focus..."
                placeholderTextColor={themeColors.textMuted}
              />

              {/* Exercise reference selector for tutorial or practice */}
              {(newItemType === 'EXERCISE_TUTORIAL' || newItemType === 'PRACTICE' || newItemType === 'TRANSITION') && (
                <View>
                  <Text style={styles.inputLabel}>Linked Exercise</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: sp.sm }}>
                    {availableExercises.map((ex) => (
                      <TouchableOpacity
                        key={ex.id}
                        style={[
                          styles.pill,
                          newItemExerciseId === ex.id && styles.pillActive,
                        ]}
                        onPress={() => {
                          setNewItemExerciseId(ex.id);
                          if (!newItemTitle) setNewItemTitle(`${ex.name} Tutorial`);
                        }}
                      >
                        <Text style={[styles.pillText, newItemExerciseId === ex.id && styles.pillTextActive]}>
                          {ex.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Rep count for Practice */}
              {newItemType === 'PRACTICE' && (
                <View>
                  <Text style={styles.inputLabel}>Target Repetitions (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={newItemReps}
                    onChangeText={setNewItemReps}
                    keyboardType="numeric"
                    placeholder="8"
                    placeholderTextColor={themeColors.textMuted}
                  />
                </View>
              )}

              {/* Duration for Rest / Timer */}
              {(newItemType === 'REST' || newItemType === 'WARMUP' || newItemType === 'COOLDOWN') && (
                <View>
                  <Text style={styles.inputLabel}>Duration in Seconds</Text>
                  <TextInput
                    style={styles.input}
                    value={newItemDuration}
                    onChangeText={setNewItemDuration}
                    keyboardType="numeric"
                    placeholder="45"
                    placeholderTextColor={themeColors.textMuted}
                  />
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Add Item"
                variant="primary"
                onPress={handleAddItem}
                style={{ flex: 1 }}
              />
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setShowAddItemModal(false)}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Reorder Modal */}
      {detail && (
        <GuidedSessionItemReorderModal
          visible={showReorderModal}
          items={detail.items}
          onClose={() => setShowReorderModal(false)}
          onSaveOrder={handleSaveReorder}
          onDeleteItem={handleDeleteItem}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  content: {
    padding: sp.md,
    paddingBottom: 80,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: sp.lg,
  },
  loadingText: {
    ...typography.bodySmall,
    color: themeColors.textMuted,
    marginTop: sp.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: sp.md,
  },
  headerTitle: {
    ...typography.h2,
    color: themeColors.textPrimary,
  },
  headerSub: {
    ...typography.caption,
    color: themeColors.textMuted,
    marginTop: 2,
  },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563EB',
    paddingVertical: 6,
    paddingHorizontal: sp.sm,
    borderRadius: radius.md,
  },
  previewBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.md,
    padding: sp.md,
    marginBottom: sp.lg,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  formSectionHeader: {
    ...typography.h3,
    color: themeColors.textPrimary,
    marginBottom: sp.sm,
  },
  inputLabel: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontWeight: '600',
    marginTop: sp.sm,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#161C28',
    borderRadius: radius.md,
    paddingHorizontal: sp.sm,
    paddingVertical: 10,
    ...typography.body,
    color: themeColors.textPrimary,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  pillsRow: {
    flexDirection: 'row',
    gap: sp.xs,
    marginVertical: 4,
  },
  pill: {
    paddingHorizontal: sp.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: '#1E2638',
    marginRight: sp.xs,
  },
  pillActive: {
    backgroundColor: themeColors.accent,
  },
  pillText: {
    ...typography.caption,
    color: themeColors.textMuted,
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  section: {
    marginBottom: sp.lg,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: sp.sm,
  },
  sectionHeading: {
    ...typography.h3,
    color: themeColors.textPrimary,
  },
  sectionSub: {
    ...typography.caption,
    color: themeColors.textMuted,
  },
  authoringActionButtons: {
    flexDirection: 'row',
    gap: sp.xs,
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E2638',
    paddingVertical: 6,
    paddingHorizontal: sp.sm,
    borderRadius: radius.sm,
  },
  smallActionBtnText: {
    ...typography.caption,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: sp.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2638',
    gap: sp.sm,
  },
  itemOrderCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1E2638',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemOrderText: {
    ...typography.caption,
    fontWeight: '700',
    color: themeColors.accent,
  },
  itemDetails: {
    flex: 1,
  },
  itemTitleText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  itemBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.xs,
    marginTop: 2,
  },
  itemSubText: {
    ...typography.caption,
    color: themeColors.textMuted,
  },
  itemDeleteBtn: {
    padding: 6,
  },
  emptyItemsText: {
    ...typography.bodySmall,
    color: themeColors.textMuted,
    textAlign: 'center',
    paddingVertical: sp.md,
  },
  validationStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.xs,
    marginBottom: sp.sm,
  },
  validationStatusText: {
    ...typography.bodySmall,
    fontWeight: '700',
  },
  validationErrorsBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: radius.sm,
    padding: sp.sm,
    marginBottom: sp.sm,
  },
  validationErrorsTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 2,
  },
  validationErrorItem: {
    ...typography.caption,
    color: '#FCA5A5',
    lineHeight: 16,
  },
  validationWarningsBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: radius.sm,
    padding: sp.sm,
    marginBottom: sp.sm,
  },
  validationWarningsTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: '#F59E0B',
    marginBottom: 2,
  },
  validationWarningItem: {
    ...typography.caption,
    color: '#FDE68A',
    lineHeight: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: sp.md,
  },
  modalCard: {
    width: '100%',
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.lg,
    padding: sp.lg,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  modalTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
    marginBottom: sp.md,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: sp.sm,
  },
  typeChip: {
    paddingVertical: 6,
    paddingHorizontal: sp.sm,
    backgroundColor: '#161C28',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  typeChipActive: {
    backgroundColor: themeColors.accent,
    borderColor: themeColors.accent,
  },
  typeChipText: {
    ...typography.caption,
    color: themeColors.textMuted,
  },
  typeChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    gap: sp.sm,
    marginTop: sp.md,
  },
});

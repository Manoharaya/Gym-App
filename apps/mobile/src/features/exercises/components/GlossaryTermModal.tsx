import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Badge, Icon } from '../../../components/primitives';
import { themeColors, typography, radius, spacing } from '../../../theme';
import { ExerciseService, type GlossaryTermItem } from '../services/exerciseService';

interface GlossaryTermModalProps {
  visible: boolean;
  termSlugOrItem?: string | GlossaryTermItem | null;
  onClose: () => void;
  onOpenExercise?: (exerciseId: string) => void;
  onOpenLesson?: (pathId: string, lessonId: string) => void;
}

export const GlossaryTermModal: React.FC<GlossaryTermModalProps> = ({
  visible,
  termSlugOrItem,
  onClose,
  onOpenExercise,
  onOpenLesson,
}) => {
  const [termData, setTermData] = useState<GlossaryTermItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !termSlugOrItem) {
      setTermData(null);
      return;
    }

    if (typeof termSlugOrItem === 'object' && termSlugOrItem.id) {
      setTermData(termSlugOrItem);
      return;
    }

    // It is a slug or term string
    const fetchTerm = async () => {
      setLoading(true);
      setError(null);
      try {
        const item = await ExerciseService.getGlossaryTerm(termSlugOrItem as string);
        setTermData(item);
      } catch (err: any) {
        setError(err.message || 'Failed to load glossary term');
      } finally {
        setLoading(false);
      }
    };

    fetchTerm();
  }, [visible, termSlugOrItem]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleGroup}>
                <View style={styles.badgeRow}>
                  <Badge label="GLOSSARY" variant="primary" />
                  {termData?.category && (
                    <Badge
                      label={termData.category.replace(/_/g, ' ')}
                      variant="neutral"
                    />
                  )}
                </View>
                <Text style={styles.termTitle} numberOfLines={2}>
                  {termData?.term || (typeof termSlugOrItem === 'string' ? termSlugOrItem : 'Term')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close glossary modal"
              >
                <Icon name="close" size={20} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={themeColors.primary} />
                <Text style={styles.loadingText}>Loading definition...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Icon name="alert-circle" size={24} color={themeColors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : termData ? (
              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Short Explanation Banner */}
                {termData.shortExplanation && (
                  <View style={styles.summaryBanner}>
                    <Icon name="alert-circle" size={16} color="#a78bfa" />
                    <Text style={styles.summaryText}>{termData.shortExplanation}</Text>
                  </View>
                )}

                {/* Comprehensive Definition */}
                <View style={styles.section}>
                  <Text style={styles.sectionHeading}>Definition & Scientific Context</Text>
                  <Text style={styles.definitionText}>{termData.definition}</Text>
                </View>

                {/* Related Movement Patterns */}
                {termData.relatedMovementPatterns && termData.relatedMovementPatterns.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>Related Movement Patterns</Text>
                    <View style={styles.patternPills}>
                      {termData.relatedMovementPatterns.map((pattern) => (
                        <View key={pattern} style={styles.patternPill}>
                          <Icon name="activity" size={12} color="#38bdf8" />
                          <Text style={styles.patternText}>
                            {pattern.replace(/_/g, ' ')}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Related Exercises */}
                {termData.relatedExercises && termData.relatedExercises.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>Applied in Exercises</Text>
                    {termData.relatedExercises.map((ex) => (
                      <TouchableOpacity
                        key={ex.id}
                        activeOpacity={0.8}
                        onPress={() => {
                          onClose();
                          if (onOpenExercise) onOpenExercise(ex.id);
                        }}
                        style={styles.exerciseItem}
                      >
                        <View style={styles.exerciseItemLeft}>
                          <Icon name="dumbbell" size={14} color={themeColors.primary} />
                          <Text style={styles.exerciseItemName}>{ex.name}</Text>
                        </View>
                        <View style={styles.exerciseItemRight}>
                          <Text style={styles.exerciseItemMeta}>{ex.difficulty}</Text>
                          <Icon name="chevron-right" size={14} color={themeColors.textTertiary} />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Related Lessons */}
                {termData.relatedLessons && termData.relatedLessons.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>Taught in Academy Lessons</Text>
                    {termData.relatedLessons.map((les) => (
                      <TouchableOpacity
                        key={les.id}
                        activeOpacity={0.8}
                        onPress={() => {
                          onClose();
                          if (onOpenLesson) onOpenLesson(les.pathId, les.id);
                        }}
                        style={styles.lessonItem}
                      >
                        <View style={styles.lessonItemLeft}>
                          <Icon name="award" size={14} color="#a78bfa" />
                          <View>
                            <Text style={styles.lessonItemTitle}>{les.title}</Text>
                            <Text style={styles.lessonItemSub}>{les.pathTitle}</Text>
                          </View>
                        </View>
                        <Icon name="chevron-right" size={14} color={themeColors.textTertiary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </ScrollView>
            ) : null}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  safeArea: {
    width: '100%',
    maxHeight: '85%',
  },
  card: {
    backgroundColor: themeColors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    maxHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerTitleGroup: {
    flex: 1,
    marginRight: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  termTitle: {
    ...typography.h2,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  closeBtn: {
    padding: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  errorContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  errorText: {
    ...typography.bodySecondary,
    color: themeColors.danger,
    textAlign: 'center',
  },
  scrollArea: {
    maxHeight: 460,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.25)',
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  summaryText: {
    ...typography.bodySecondary,
    color: '#e9d5ff',
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    gap: spacing.xs,
  },
  sectionHeading: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  definitionText: {
    ...typography.body,
    color: themeColors.textPrimary,
    lineHeight: 22,
  },
  patternPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  patternPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  patternText: {
    ...typography.caption,
    color: '#7dd3fc',
    fontWeight: '600',
    fontSize: 11,
  },
  exerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  exerciseItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    flex: 1,
  },
  exerciseItemName: {
    ...typography.bodySecondary,
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  exerciseItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  exerciseItemMeta: {
    ...typography.caption,
    color: themeColors.textTertiary,
    fontSize: 11,
  },
  lessonItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  lessonItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    flex: 1,
  },
  lessonItemTitle: {
    ...typography.bodySecondary,
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  lessonItemSub: {
    ...typography.caption,
    color: themeColors.textTertiary,
    fontSize: 11,
  },
});

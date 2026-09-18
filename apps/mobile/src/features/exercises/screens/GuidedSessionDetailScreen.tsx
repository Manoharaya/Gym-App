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
import { useRoute, useNavigation } from '@react-navigation/native';
import { Card, Badge, Icon, Button } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import {
  ExerciseService,
  GuidedSessionDetail,
  GuidedSessionItem,
} from '../services/exerciseService';

const sp = {
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
  lg: spacing[6],
};

export const GuidedSessionDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { sessionId } = route.params;

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<GuidedSessionDetail | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const loadDetail = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ExerciseService.getGuidedSession(sessionId);
      setDetail(data);
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.response?.data?.message || 'Failed to load guided session detail.',
      );
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [sessionId, navigation]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const toggleSectionCollapse = (sectionId: string) => {
    setCollapsedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const handleStartSession = (startFresh = false) => {
    navigation.navigate('GuidedExerciseSession', {
      sessionId,
      startFresh,
    });
  };

  const handlePreviewSession = () => {
    navigation.navigate('GuidedExerciseSession', {
      sessionId,
      previewMode: true,
    });
  };

  const handleEditSession = () => {
    navigation.navigate('GuidedSessionAuthoring', {
      sessionId,
    });
  };

  const handlePublishSession = async () => {
    try {
      await ExerciseService.publishGuidedSession(sessionId);
      Alert.alert('Success', 'Guided session published successfully!');
      loadDetail();
    } catch (err: any) {
      Alert.alert('Publishing Error', err?.response?.data?.message || 'Validation failed');
    }
  };

  if (loading || !detail) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={themeColors.accent} />
        <Text style={styles.loadingText}>Loading guided program...</Text>
      </View>
    );
  }

  const { session, equipmentNeededSummary, sections, items, userProgress } =
    detail;
  const isCompleted = userProgress?.status === 'COMPLETED';
  const isInProgress = userProgress?.status === 'IN_PROGRESS';
  const currentStep = (userProgress?.currentStepIndex || 0) + 1;

  const getItemTypeIcon = (type: string) => {
    switch (type) {
      case 'INTRO':
        return 'alert-circle';
      case 'WARMUP':
        return 'flame';
      case 'EXERCISE_TUTORIAL':
        return 'dumbbell';
      case 'PRACTICE':
        return 'activity';
      case 'REST':
        return 'clock';
      case 'TRANSITION':
        return 'chevron-right';
      case 'KNOWLEDGE_CHECK':
        return 'sparkles';
      case 'COOLDOWN':
        return 'heart';
      case 'SUMMARY':
        return 'award';
      default:
        return 'activity';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Session Header Card */}
        <Card style={styles.headerCard}>
          <View style={styles.badgeRow}>
            <Badge
              label={session.difficulty}
              variant={
                session.difficulty === 'ADVANCED'
                  ? 'danger'
                  : session.difficulty === 'INTERMEDIATE'
                  ? 'warning'
                  : 'success'
              }
            />
            {session.category && (
              <Badge label={session.category} variant="accent" />
            )}
            {session.contentStatus === 'DRAFT' && (
              <Badge label="DRAFT MODE" variant="neutral" />
            )}
          </View>

          <Text style={styles.title}>{session.title}</Text>

          {session.description ? (
            <Text style={styles.description}>{session.description}</Text>
          ) : null}

          {/* Quick Metrics */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Icon name="clock" size={16} color={themeColors.accent} />
              <Text style={styles.metaText}>
                ~{session.estimatedDurationMinutes} min
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Icon name="dumbbell" size={16} color={themeColors.accent} />
              <Text style={styles.metaText}>
                {items.length} learning steps
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Icon name="shield" size={16} color={themeColors.accent} />
              <Text style={styles.metaText}>
                {session.ownershipType}
              </Text>
            </View>
          </View>

          {/* Progress Status Bar (if member has progress) */}
          {(isInProgress || isCompleted) && (
            <View style={styles.progressBanner}>
              <View style={styles.progressHeaderRow}>
                <Text style={styles.progressBannerTitle}>
                  {isCompleted
                    ? 'Program Completed!'
                    : `In Progress • Step ${currentStep} of ${items.length}`}
                </Text>
                <Text style={styles.progressPercent}>
                  {userProgress?.percentComplete || 0}%
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.max(5, userProgress?.percentComplete || 0)}%` },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Trainer Quick Actions */}
          {session.contentStatus === 'DRAFT' && (
            <View style={styles.trainerActionRow}>
              <Button
                title="Edit Session"
                variant="outline"
                leftIcon={<Icon name="settings" size={16} color={themeColors.textPrimary} />}
                onPress={handleEditSession}
                style={{ flex: 1 }}
              />
              <Button
                title="Publish"
                variant="primary"
                leftIcon={<Icon name="check-circle" size={16} color="#FFFFFF" />}
                onPress={handlePublishSession}
                style={{ flex: 1 }}
              />
            </View>
          )}
        </Card>

        {/* Equipment Needed Card */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Icon name="dumbbell" size={18} color={themeColors.accent} />
            <Text style={styles.sectionHeading}>Equipment Needed</Text>
          </View>

          <Card style={styles.equipmentCard}>
            {equipmentNeededSummary.length > 0 ? (
              <View style={styles.equipmentGrid}>
                {equipmentNeededSummary.map((eq, idx) => (
                  <View key={idx} style={styles.equipmentItem}>
                    <Icon name="check-circle" size={14} color={themeColors.accent} />
                    <Text style={styles.equipmentText}>{eq.replace('_', ' ')}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.noEquipmentText}>
                No special equipment required. Bodyweight friendly!
              </Text>
            )}
          </Card>
        </View>

        {/* Syllabus Breakdown */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Icon name="activity" size={18} color={themeColors.accent} />
            <Text style={styles.sectionHeading}>Session Syllabus</Text>
          </View>

          {sections.length > 0 ? (
            sections.map((sec) => {
              const isCollapsed = !!collapsedSections[sec.id];
              return (
                <Card key={sec.id} style={styles.sectionCard}>
                  <TouchableOpacity
                    style={styles.sectionHeader}
                    onPress={() => toggleSectionCollapse(sec.id)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sectionTitle}>{sec.title}</Text>
                      {sec.description ? (
                        <Text style={styles.sectionDesc}>{sec.description}</Text>
                      ) : null}
                    </View>
                    <Icon
                      name="chevron-down"
                      size={20}
                      color={themeColors.textMuted}
                      style={!isCollapsed ? { transform: [{ rotate: '180deg' }] } : undefined}
                    />
                  </TouchableOpacity>

                  {!isCollapsed && (
                    <View style={styles.itemsList}>
                      {sec.items.map((it: GuidedSessionItem) => (
                        <View key={it.id} style={styles.itemRow}>
                          <View style={styles.itemIconBox}>
                            <Icon
                              name={getItemTypeIcon(it.itemType) as any}
                              size={16}
                              color={themeColors.accent}
                            />
                          </View>
                          <View style={styles.itemTextContainer}>
                            <Text style={styles.itemTitle}>{it.title}</Text>
                            <View style={styles.itemBadgeRow}>
                              <Badge
                                label={it.itemType.replace('_', ' ')}
                                variant="neutral"
                              />
                              {it.durationSeconds && (
                                <Text style={styles.itemDuration}>
                                  {it.durationSeconds}s
                                </Text>
                              )}
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </Card>
              );
            })
          ) : (
            <Card style={styles.sectionCard}>
              <View style={styles.itemsList}>
                {items.map((it: GuidedSessionItem) => (
                  <View key={it.id} style={styles.itemRow}>
                    <View style={styles.itemIconBox}>
                      <Icon
                        name={getItemTypeIcon(it.itemType) as any}
                        size={16}
                        color={themeColors.accent}
                      />
                    </View>
                    <View style={styles.itemTextContainer}>
                      <Text style={styles.itemTitle}>{it.title}</Text>
                      <View style={styles.itemBadgeRow}>
                        <Badge
                          label={it.itemType.replace('_', ' ')}
                          variant="neutral"
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </Card>
          )}
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={styles.bottomBar}>
        <Button
          title={
            isCompleted
              ? 'Restart Guided Session'
              : isInProgress
              ? `Continue (Step ${currentStep} of ${items.length})`
              : 'Start Guided Session'
          }
          variant="primary"
          leftIcon={
            <Icon
              name={isCompleted ? 'refresh' : 'activity'}
              size={16}
              color="#FFFFFF"
            />
          }
          onPress={() => handleStartSession(isCompleted)}
          style={styles.primaryCta}
        />
        {session.contentStatus === 'DRAFT' && (
          <TouchableOpacity
            style={styles.previewBtn}
            onPress={handlePreviewSession}
          >
            <Icon name="activity" size={16} color={themeColors.textSecondary} />
            <Text style={styles.previewBtnText}>Preview as Member</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: sp.md,
    paddingBottom: 100,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: themeColors.background,
    padding: sp.lg,
  },
  loadingText: {
    ...typography.bodySmall,
    color: themeColors.textMuted,
    marginTop: sp.sm,
  },
  headerCard: {
    backgroundColor: themeColors.elevatedBackground,
    borderRadius: radius.lg,
    padding: sp.lg,
    marginBottom: sp.lg,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sp.xs,
    marginBottom: sp.sm,
  },
  title: {
    ...typography.h2,
    color: themeColors.textPrimary,
    marginBottom: sp.xs,
  },
  description: {
    ...typography.body,
    color: themeColors.textSecondary,
    marginBottom: sp.md,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sp.md,
    paddingTop: sp.sm,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
    marginBottom: sp.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    ...typography.caption,
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  progressBanner: {
    marginTop: sp.sm,
    padding: sp.sm,
    backgroundColor: '#161F33',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressBannerTitle: {
    ...typography.caption,
    color: '#93C5FD',
    fontWeight: '600',
  },
  progressPercent: {
    ...typography.caption,
    fontWeight: '700',
    color: '#93C5FD',
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#1E293B',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: themeColors.accent,
  },
  trainerActionRow: {
    flexDirection: 'row',
    gap: sp.sm,
    marginTop: sp.md,
  },
  section: {
    marginBottom: sp.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.xs,
    marginBottom: sp.sm,
  },
  sectionHeading: {
    ...typography.h3,
    color: themeColors.textPrimary,
  },
  equipmentCard: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.md,
    padding: sp.md,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  equipmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sp.sm,
  },
  equipmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: sp.sm,
    backgroundColor: '#1E2638',
    borderRadius: radius.sm,
  },
  equipmentText: {
    ...typography.caption,
    color: themeColors.textPrimary,
    fontWeight: '500',
  },
  noEquipmentText: {
    ...typography.bodySmall,
    color: themeColors.textMuted,
  },
  sectionCard: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.md,
    padding: sp.md,
    marginBottom: sp.sm,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  sectionDesc: {
    ...typography.caption,
    color: themeColors.textMuted,
    marginTop: 2,
  },
  itemsList: {
    marginTop: sp.sm,
    borderTopWidth: 1,
    borderTopColor: '#1E2638',
    paddingTop: sp.xs,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: sp.xs,
    gap: sp.sm,
  },
  itemIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E2638',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '500',
  },
  itemBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.xs,
    marginTop: 2,
  },
  itemDuration: {
    ...typography.caption,
    color: themeColors.textMuted,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: themeColors.elevatedBackground,
    paddingHorizontal: sp.md,
    paddingVertical: sp.sm,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
    gap: sp.xs,
  },
  primaryCta: {
    width: '100%',
    paddingVertical: 14,
  },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  previewBtnText: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
});

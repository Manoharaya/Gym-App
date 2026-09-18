import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  TouchableWithoutFeedback,
  GestureResponderEvent,
} from 'react-native';
import { Card, Badge, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import type { ExerciseMedia } from '@fitcore/types';
import {
  ExerciseService,
  MediaViewAngle,
  ExerciseMediaAnnotation,
  MediaViewsGroupDto,
  AnnotationCategory,
} from '../services/exerciseService';
import { ExerciseMediaAnnotationEditorModal } from './ExerciseMediaAnnotationEditorModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const sp = {
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
  lg: spacing[6],
  xl: spacing[8],
};

const PLAYBACK_SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

const ANGLE_LABELS: Record<string, string> = {
  FRONT: 'Front View',
  SIDE: 'Side View',
  BACK: 'Rear View',
  LEFT: 'Left View',
  RIGHT: 'Right View',
  THREE_QUARTER: '3/4 Angle',
  OVERHEAD: 'Overhead View',
  CLOSE_UP: 'Close-Up',
  CUSTOM: 'Custom View',
};

const CATEGORY_COLORS: Record<string, string> = {
  ALIGNMENT: '#10B981',
  POSTURE: '#3B82F6',
  BREATHING: '#F59E0B',
  RANGE_OF_MOTION: '#8B5CF6',
  SAFETY: '#EF4444',
  COMMON_MISTAKE: '#F97316',
};

export interface ExerciseAngleViewerProps {
  exerciseId: string;
  exerciseName: string;
  mediaList?: ExerciseMedia[];
  activePhase?: {
    id?: string;
    phaseName?: string;
    title?: string | null;
    videoStartTimeSeconds?: number | null;
    videoEndTimeSeconds?: number | null;
  } | null;
  isTrainer?: boolean;
  onAngleChange?: (angle: MediaViewAngle) => void;
  onAnnotationSelect?: (annotation: ExerciseMediaAnnotation) => void;
}

export const ExerciseAngleViewer: React.FC<ExerciseAngleViewerProps> = ({
  exerciseId,
  exerciseName,
  mediaList = [],
  activePhase,
  isTrainer = false,
  onAngleChange,
  onAnnotationSelect,
}) => {
  // Views state
  const [mediaViews, setMediaViews] = useState<MediaViewsGroupDto | null>(null);
  const [loading, setLoading] = useState(true);

  // Selected angle state
  const [primaryAngle, setPrimaryAngle] = useState<MediaViewAngle>('FRONT');
  const [compareAngle, setCompareAngle] = useState<MediaViewAngle>('SIDE');
  const [isCompareMode, setIsCompareMode] = useState(false);

  // Playback state (synchronized)
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [currentTimestamp, setCurrentTimestamp] = useState(0);
  const [isPhaseLoopEnabled, setIsPhaseLoopEnabled] = useState(false);

  // Annotations state
  const [annotations, setAnnotations] = useState<ExerciseMediaAnnotation[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<ExerciseMediaAnnotation | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<AnnotationCategory | 'ALL'>('ALL');

  // Trainer authoring modal state
  const [isAnnotationModalVisible, setIsAnnotationModalVisible] = useState(false);
  const [annotationToEdit, setAnnotationToEdit] = useState<ExerciseMediaAnnotation | null>(null);
  const [newAnnotationCoords, setNewAnnotationCoords] = useState<{ x: number; y: number } | null>(null);

  // Canvas layout measurement for tap-to-annotate
  const [canvasLayout, setCanvasLayout] = useState<{ width: number; height: number }>({
    width: SCREEN_WIDTH - 32,
    height: 220,
  });

  // Fetch media views on mount / exerciseId change
  useEffect(() => {
    let isMounted = true;
    const loadViews = async () => {
      setLoading(true);
      try {
        const viewsData = await ExerciseService.getExerciseMediaViews(exerciseId);
        if (isMounted && viewsData) {
          setMediaViews(viewsData);
          setPrimaryAngle(viewsData.defaultAngle || 'FRONT');

          // Choose distinct compare angle
          const otherAngle = viewsData.availableAngles.find((a) => a !== viewsData.defaultAngle);
          if (otherAngle) {
            setCompareAngle(otherAngle);
          } else {
            setCompareAngle(viewsData.defaultAngle === 'SIDE' ? 'FRONT' : 'SIDE');
          }
        }
      } catch {
        // Fallback: organize from mediaList prop
        if (isMounted) {
          const fallbackViews: Record<string, ExerciseMedia[]> = {};
          for (const m of mediaList) {
            const angle = (m.viewAngle as MediaViewAngle) || 'FRONT';
            if (!fallbackViews[angle]) fallbackViews[angle] = [];
            fallbackViews[angle].push(m);
          }
          const available = Object.keys(fallbackViews) as MediaViewAngle[];
          const def = available.includes('SIDE') ? 'SIDE' : available[0] || 'FRONT';
          setMediaViews({
            exerciseId,
            defaultAngle: def,
            availableAngles: available.length > 0 ? available : ['FRONT', 'SIDE'],
            views: fallbackViews,
            angleMetadata: {},
          });
          setPrimaryAngle(def);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (exerciseId) {
      loadViews();
    }
    return () => {
      isMounted = false;
    };
  }, [exerciseId, mediaList]);

  // Load annotations for current primary media
  const currentPrimaryMedia =
    mediaViews?.views[primaryAngle]?.[0] ||
    mediaList.find((m) => m.viewAngle === primaryAngle) ||
    mediaList[0];

  useEffect(() => {
    let isMounted = true;
    const loadAnnotations = async () => {
      if (!currentPrimaryMedia?.id) {
        setAnnotations([]);
        return;
      }
      try {
        const data = await ExerciseService.getMediaAnnotations(currentPrimaryMedia.id);
        if (isMounted) {
          setAnnotations(data || []);
        }
      } catch {
        if (isMounted) setAnnotations([]);
      }
    };
    loadAnnotations();
    return () => {
      isMounted = false;
    };
  }, [currentPrimaryMedia?.id]);

  // Phase synchronization
  useEffect(() => {
    if (activePhase?.videoStartTimeSeconds != null) {
      setCurrentTimestamp(activePhase.videoStartTimeSeconds);
      setIsPhaseLoopEnabled(true);
    }
  }, [activePhase?.id]);

  // Playback timer tick
  const duration = currentPrimaryMedia?.durationSeconds || 10;
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentTimestamp((prev) => {
          if (isPhaseLoopEnabled && activePhase?.videoEndTimeSeconds != null) {
            if (prev >= activePhase.videoEndTimeSeconds) {
              return activePhase.videoStartTimeSeconds ?? 0;
            }
          }
          if (prev >= duration) {
            return 0;
          }
          return prev + 0.5 * playbackSpeed;
        });
      }, 500);
    }
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, isPhaseLoopEnabled, activePhase, duration]);

  // Angle switching handler
  const handleSelectAngle = (angle: MediaViewAngle) => {
    setPrimaryAngle(angle);
    setSelectedAnnotation(null);
    onAngleChange?.(angle);
  };

  // Compare angle switching handler
  const handleSelectCompareAngle = (angle: MediaViewAngle) => {
    setCompareAngle(angle);
  };

  // Playback speed cycle
  const cycleSpeed = () => {
    const idx = PLAYBACK_SPEEDS.indexOf(playbackSpeed);
    const nextIdx = (idx + 1) % PLAYBACK_SPEEDS.length;
    setPlaybackSpeed(PLAYBACK_SPEEDS[nextIdx] ?? 1.0);
  };

  // Canvas touch handler for trainer authoring
  const handleCanvasPress = (evt: GestureResponderEvent) => {
    if (!isTrainer) return;
    const { locationX, locationY } = evt.nativeEvent;
    if (canvasLayout.width > 0 && canvasLayout.height > 0) {
      const normX = Math.min(1, Math.max(0, locationX / canvasLayout.width));
      const normY = Math.min(1, Math.max(0, locationY / canvasLayout.height));
      setNewAnnotationCoords({ x: normX, y: normY });
      setAnnotationToEdit(null);
      setIsAnnotationModalVisible(true);
    }
  };

  // Filtered annotations by category and active timestamp
  const visibleAnnotations = annotations.filter((ann) => {
    if (categoryFilter !== 'ALL' && ann.category !== categoryFilter) return false;
    if (ann.startTime != null && ann.endTime != null) {
      return currentTimestamp >= ann.startTime && currentTimestamp <= ann.endTime;
    }
    return true;
  });

  const availableAngles: MediaViewAngle[] =
    mediaViews?.availableAngles && mediaViews.availableAngles.length > 0
      ? mediaViews.availableAngles
      : ['FRONT', 'SIDE', 'THREE_QUARTER', 'BACK'];

  const compareMedia =
    mediaViews?.views[compareAngle]?.[0] ||
    mediaList.find((m) => m.viewAngle === compareAngle);

  const formatTimestamp = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = Math.floor(sec % 60);
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Card style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={themeColors.primary} />
        <Text style={styles.loadingText}>Loading multi-angle demonstrations...</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.container}>
      {/* Top Header: Angle Bar + Compare Toggle */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Icon name="activity" size={18} color={themeColors.primary} />
          <Text style={styles.sectionTitle}>Demonstration Angle</Text>
        </View>

        <TouchableOpacity
          style={[styles.compareToggleBtn, isCompareMode && styles.compareToggleBtnActive]}
          onPress={() => setIsCompareMode(!isCompareMode)}
        >
          <Icon
            name="award"
            size={14}
            color={isCompareMode ? '#000000' : themeColors.textSecondary}
          />
          <Text style={[styles.compareToggleText, isCompareMode && styles.compareToggleTextActive]}>
            {isCompareMode ? 'Exit Compare' : 'Compare Angles'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Angle Selector Pills Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.anglePillsContainer}
      >
        {availableAngles.map((angle) => {
          const count = mediaViews?.views[angle]?.length || 0;
          const isSelected = primaryAngle === angle;

          return (
            <TouchableOpacity
              key={angle}
              style={[styles.anglePill, isSelected && styles.anglePillActive]}
              onPress={() => handleSelectAngle(angle)}
            >
              <Text style={[styles.anglePillText, isSelected && styles.anglePillTextActive]}>
                {ANGLE_LABELS[angle] || angle}
              </Text>
              {count > 1 && (
                <View style={[styles.countBadge, isSelected && styles.countBadgeActive]}>
                  <Text style={[styles.countText, isSelected && styles.countTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Primary Video Canvas Area */}
      <View
        style={styles.canvasContainer}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setCanvasLayout({ width, height });
        }}
      >
        <TouchableWithoutFeedback onPress={handleCanvasPress}>
          <View style={styles.mediaFrame}>
            {currentPrimaryMedia?.url || currentPrimaryMedia?.thumbnailUrl ? (
              <Image
                source={{
                  uri:
                    currentPrimaryMedia.url ||
                    currentPrimaryMedia.thumbnailUrl ||
                    (currentPrimaryMedia as any).resolvedUrl,
                }}
                style={styles.mediaImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.fallbackFrame}>
                <Icon name="dumbbell" size={48} color={themeColors.textSecondary} />
                <Text style={styles.fallbackTitle}>{exerciseName}</Text>
                <Badge
                  label={`${ANGLE_LABELS[primaryAngle] || primaryAngle} Illustrated`}
                  variant="primary"
                />
              </View>
            )}

            {/* Dark Vignette Overlay */}
            <View style={styles.vignetteTop} />
            <View style={styles.vignetteBottom} />

            {/* Angle Badge Watermark */}
            <View style={styles.angleWatermark}>
              <Badge
                label={ANGLE_LABELS[primaryAngle] || primaryAngle}
                variant="primary"
              />
              {activePhase && (
                <Badge
                  label={activePhase.title || activePhase.phaseName || 'Active Phase'}
                  variant="accent"
                />
              )}
            </View>

            {/* Play/Pause Overlay Floating Center */}
            <TouchableOpacity
              style={styles.centerPlayBtn}
              onPress={() => setIsPlaying(!isPlaying)}
            >
              <Text style={styles.centerPlayIcon}>{isPlaying ? '⏸' : '▶'}</Text>
            </TouchableOpacity>

            {/* Trainer authoring hint */}
            {isTrainer && (
              <View style={styles.trainerHintBadge}>
                <Icon name="bolt" size={12} color="#000000" />
                <Text style={styles.trainerHintText}>Tap canvas to add visual cue</Text>
              </View>
            )}

            {/* Authored Visual Cue Annotation Markers Overlay */}
            {visibleAnnotations.map((ann) => {
              const markerX = `${ann.x * 100}%`;
              const markerY = `${ann.y * 100}%`;
              const catColor = CATEGORY_COLORS[ann.category] || themeColors.primary;
              const isSelected = selectedAnnotation?.id === ann.id;

              return (
                <TouchableOpacity
                  key={ann.id}
                  style={[
                    styles.annotationMarker,
                    {
                      left: markerX as any,
                      top: markerY as any,
                      borderColor: catColor,
                      backgroundColor: isSelected ? catColor : `${catColor}30`,
                    },
                  ]}
                  onPress={() => {
                    setSelectedAnnotation(ann);
                    onAnnotationSelect?.(ann);
                    if (isTrainer) {
                      setAnnotationToEdit(ann);
                      setIsAnnotationModalVisible(true);
                    }
                  }}
                >
                  <View style={[styles.markerDot, { backgroundColor: catColor }]} />
                  <Text style={[styles.markerLabel, { color: '#FFFFFF' }]}>
                    {ann.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableWithoutFeedback>
      </View>

      {/* Synchronized Compare Mode Secondary View (if enabled) */}
      {isCompareMode && (
        <View style={styles.compareWrapper}>
          <View style={styles.compareHeader}>
            <Text style={styles.compareTitle}>COMPARE VIEW</Text>
            {/* Compare Angle Selector Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {availableAngles.map((angle) => (
                <TouchableOpacity
                  key={angle}
                  style={[
                    styles.comparePill,
                    compareAngle === angle && styles.comparePillActive,
                  ]}
                  onPress={() => handleSelectCompareAngle(angle)}
                >
                  <Text
                    style={[
                      styles.comparePillText,
                      compareAngle === angle && styles.comparePillTextActive,
                    ]}
                  >
                    {ANGLE_LABELS[angle] || angle}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.compareFrame}>
            {compareMedia?.url || compareMedia?.thumbnailUrl ? (
              <Image
                source={{
                  uri:
                    compareMedia.url ||
                    compareMedia.thumbnailUrl ||
                    (compareMedia as any).resolvedUrl,
                }}
                style={styles.mediaImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.fallbackFrame}>
                <Icon name="activity" size={32} color={themeColors.textSecondary} />
                <Text style={styles.fallbackTitle}>{ANGLE_LABELS[compareAngle] || compareAngle}</Text>
              </View>
            )}

            <View style={styles.vignetteTop} />
            <View style={styles.vignetteBottom} />

            <View style={styles.angleWatermark}>
              <Badge
                label={ANGLE_LABELS[compareAngle] || compareAngle}
                variant="accent"
              />
              <Badge label="SYNCED PLAYBACK" variant="primary" />
            </View>
          </View>
        </View>
      )}

      {/* Media Playback Controls Bar */}
      <View style={styles.controlsBar}>
        {/* Timeline Scrubbing Progress Bar */}
        <View style={styles.timelineBar}>
          <View
            style={[
              styles.timelineProgress,
              { width: `${Math.min(100, (currentTimestamp / duration) * 100)}%` },
            ]}
          />
        </View>
        <View style={styles.timeLabels}>
          <Text style={styles.timeText}>{formatTimestamp(currentTimestamp)}</Text>
          <Text style={styles.timeText}>{formatTimestamp(duration)}</Text>
        </View>

        {/* Buttons Row */}
        <View style={styles.buttonsRow}>
          <View style={styles.leftControlButtons}>
            <TouchableOpacity
              style={styles.btnIcon}
              onPress={() => setIsPlaying(!isPlaying)}
            >
              <Text style={styles.btnIconText}>{isPlaying ? '⏸' : '▶'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnIcon}
              onPress={() => setCurrentTimestamp(activePhase?.videoStartTimeSeconds || 0)}
            >
              <Icon name="refresh" size={16} color={themeColors.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.speedBtn} onPress={cycleSpeed}>
              <Text style={styles.speedBtnText}>{playbackSpeed}x</Text>
            </TouchableOpacity>

            {activePhase && (
              <TouchableOpacity
                style={[styles.loopBtn, isPhaseLoopEnabled && styles.loopBtnActive]}
                onPress={() => setIsPhaseLoopEnabled(!isPhaseLoopEnabled)}
              >
                <Text style={[styles.loopBtnText, isPhaseLoopEnabled && styles.loopBtnTextActive]}>
                  Loop Phase
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {isTrainer && (
            <TouchableOpacity
              style={styles.addCueBtn}
              onPress={() => {
                setNewAnnotationCoords({ x: 0.5, y: 0.5 });
                setAnnotationToEdit(null);
                setIsAnnotationModalVisible(true);
              }}
            >
              <Icon name="plus" size={14} color="#000000" />
              <Text style={styles.addCueBtnText}>Add Cue</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filter Chips for Visual Annotations */}
      {annotations.length > 0 && (
        <View style={styles.annotationFilterSection}>
          <Text style={styles.filterTitle}>VISUAL CUE CATEGORIES</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
            {(['ALL', 'ALIGNMENT', 'POSTURE', 'BREATHING', 'RANGE_OF_MOTION', 'SAFETY', 'COMMON_MISTAKE'] as const).map(
              (cat) => {
                const isSelected = categoryFilter === cat;
                const catColor = cat === 'ALL' ? themeColors.primary : CATEGORY_COLORS[cat];
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.filterChip,
                      isSelected && { borderColor: catColor, backgroundColor: `${catColor}20` },
                    ]}
                    onPress={() => setCategoryFilter(cat)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        isSelected && { color: catColor, fontWeight: '700' },
                      ]}
                    >
                      {cat.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                );
              },
            )}
          </ScrollView>
        </View>
      )}

      {/* Selected Annotation Coaching Card */}
      {selectedAnnotation && (
        <Card style={styles.selectedAnnotationCard}>
          <View style={styles.selectedAnnotationHeader}>
            <View style={styles.selectedAnnotationTitleRow}>
              <View
                style={[
                  styles.catColorIndicator,
                  {
                    backgroundColor:
                      CATEGORY_COLORS[selectedAnnotation.category] || themeColors.primary,
                  },
                ]}
              />
              <Text style={styles.selectedAnnotationTitle}>
                {selectedAnnotation.label}
              </Text>
            </View>
            <Badge
              label={selectedAnnotation.category.replace('_', ' ')}
              variant="accent"
            />
          </View>

          {selectedAnnotation.description && (
            <Text style={styles.selectedAnnotationDesc}>
              {selectedAnnotation.description}
            </Text>
          )}

          <View style={styles.selectedAnnotationFooter}>
            {selectedAnnotation.startTime != null && (
              <Text style={styles.timingText}>
                Active: {selectedAnnotation.startTime}s - {selectedAnnotation.endTime}s
              </Text>
            )}
            <TouchableOpacity onPress={() => setSelectedAnnotation(null)}>
              <Text style={styles.dismissText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}

      {/* Trainer Annotation Authoring Modal */}
      {currentPrimaryMedia?.id && (
        <ExerciseMediaAnnotationEditorModal
          visible={isAnnotationModalVisible}
          mediaId={currentPrimaryMedia.id}
          phaseId={activePhase?.id}
          initialCoords={newAnnotationCoords}
          annotationToEdit={annotationToEdit}
          onClose={() => {
            setIsAnnotationModalVisible(false);
            setAnnotationToEdit(null);
          }}
          onSaved={(saved) => {
            setAnnotations((prev) => {
              const existingIdx = prev.findIndex((a) => a.id === saved.id);
              if (existingIdx >= 0) {
                const next = [...prev];
                next[existingIdx] = saved;
                return next;
              }
              return [...prev, saved];
            });
            setSelectedAnnotation(saved);
          }}
          onDeleted={(deletedId) => {
            setAnnotations((prev) => prev.filter((a) => a.id !== deletedId));
            if (selectedAnnotation?.id === deletedId) {
              setSelectedAnnotation(null);
            }
          }}
        />
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: sp.md,
    backgroundColor: themeColors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: themeColors.border,
    marginVertical: sp.sm,
  },
  loadingContainer: {
    padding: sp.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp.sm,
  },
  loadingText: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: sp.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.xs,
  },
  sectionTitle: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  compareToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: sp.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.background,
  },
  compareToggleBtnActive: {
    backgroundColor: themeColors.accent,
    borderColor: themeColors.accent,
  },
  compareToggleText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  compareToggleTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
  anglePillsContainer: {
    flexDirection: 'row',
    gap: sp.xs,
    paddingBottom: sp.sm,
  },
  anglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: sp.md,
    paddingVertical: sp.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.background,
  },
  anglePillActive: {
    borderColor: themeColors.primary,
    backgroundColor: `${themeColors.primary}20`,
  },
  anglePillText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  anglePillTextActive: {
    color: themeColors.primary,
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: themeColors.surfaceElevated,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  countBadgeActive: {
    backgroundColor: themeColors.primary,
  },
  countText: {
    fontSize: 9,
    fontWeight: '700',
    color: themeColors.textSecondary,
  },
  countTextActive: {
    color: '#000000',
  },
  canvasContainer: {
    width: '100%',
    height: 220,
    backgroundColor: '#000000',
    borderRadius: radius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaFrame: {
    width: '100%',
    height: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  fallbackFrame: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: sp.sm,
    backgroundColor: '#111827',
    width: '100%',
  },
  fallbackTitle: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  vignetteTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 48,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  vignetteBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  angleWatermark: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    gap: 6,
  },
  centerPlayBtn: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerPlayIcon: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  trainerHintBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: themeColors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  trainerHintText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000000',
  },
  annotationMarker: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1.5,
    transform: [{ translateX: -12 }, { translateY: -12 }],
  },
  markerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  markerLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  compareWrapper: {
    marginTop: sp.md,
    gap: sp.xs,
  },
  compareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: sp.sm,
  },
  compareTitle: {
    ...typography.caption,
    color: themeColors.accent,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  comparePill: {
    paddingHorizontal: sp.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: themeColors.border,
    marginRight: 4,
  },
  comparePillActive: {
    borderColor: themeColors.accent,
    backgroundColor: `${themeColors.accent}20`,
  },
  comparePillText: {
    fontSize: 10,
    color: themeColors.textSecondary,
  },
  comparePillTextActive: {
    color: themeColors.accent,
    fontWeight: '700',
  },
  compareFrame: {
    width: '100%',
    height: 180,
    backgroundColor: '#000000',
    borderRadius: radius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  controlsBar: {
    marginTop: sp.sm,
    gap: 4,
  },
  timelineBar: {
    height: 4,
    backgroundColor: themeColors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  timelineProgress: {
    height: '100%',
    backgroundColor: themeColors.primary,
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 10,
    color: themeColors.textMuted,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  leftControlButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.xs,
  },
  btnIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: themeColors.background,
    borderWidth: 1,
    borderColor: themeColors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnIconText: {
    fontSize: 12,
    color: themeColors.textPrimary,
  },
  speedBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: themeColors.background,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  speedBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  loopBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: themeColors.background,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  loopBtnActive: {
    backgroundColor: `${themeColors.accent}20`,
    borderColor: themeColors.accent,
  },
  loopBtnText: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  loopBtnTextActive: {
    color: themeColors.accent,
    fontWeight: '700',
  },
  addCueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: themeColors.primary,
    paddingHorizontal: sp.md,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  addCueBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: '#000000',
  },
  annotationFilterSection: {
    marginTop: sp.md,
    gap: 4,
  },
  filterTitle: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  filterChipsRow: {
    gap: sp.xs,
  },
  filterChip: {
    paddingHorizontal: sp.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.background,
  },
  filterChipText: {
    fontSize: 10,
    color: themeColors.textSecondary,
  },
  selectedAnnotationCard: {
    marginTop: sp.md,
    padding: sp.md,
    backgroundColor: themeColors.background,
    borderWidth: 1,
    borderColor: themeColors.border,
    gap: sp.xs,
  },
  selectedAnnotationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedAnnotationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catColorIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  selectedAnnotationTitle: {
    ...typography.bodySm,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  selectedAnnotationDesc: {
    ...typography.caption,
    color: themeColors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  selectedAnnotationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  timingText: {
    fontSize: 9,
    color: themeColors.textMuted,
  },
  dismissText: {
    fontSize: 10,
    color: themeColors.primary,
    fontWeight: '600',
  },
});

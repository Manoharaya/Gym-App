import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Badge, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import type { ExerciseMedia } from '@fitcore/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const sp = {
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
  lg: spacing[6],
};

export interface ExerciseHeroMediaProps {
  mediaList?: ExerciseMedia[];
  exerciseName: string;
  movementPattern?: string;
  difficulty?: string;
  activePhase?: {
    id?: string;
    phaseName?: string;
    phaseType?: string;
    title?: string | null;
    videoStartTimeSeconds?: number | null;
    videoEndTimeSeconds?: number | null;
  } | null;
  onTogglePhaseLoop?: (isLooping: boolean) => void;
}

export const ExerciseHeroMedia: React.FC<ExerciseHeroMediaProps> = ({
  mediaList = [],
  exerciseName,
  movementPattern = 'GENERAL',
  difficulty = 'INTERMEDIATE',
  activePhase,
  onTogglePhaseLoop,
}) => {
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isPhaseLoopActive, setIsPhaseLoopActive] = useState(false);

  // Filter published media or all
  const validMedia = mediaList.filter((m) => m.url || m.thumbnailUrl || (m as any).resolvedUrl);
  const currentMedia = validMedia[selectedMediaIndex] || validMedia[0];

  useEffect(() => {
    if (activePhase?.videoStartTimeSeconds != null && activePhase?.videoEndTimeSeconds != null) {
      setIsPhaseLoopActive(true);
      onTogglePhaseLoop?.(true);
    } else {
      setIsPhaseLoopActive(false);
      onTogglePhaseLoop?.(false);
    }
  }, [activePhase, onTogglePhaseLoop]);

  const togglePhaseLoop = () => {
    const nextState = !isPhaseLoopActive;
    setIsPhaseLoopActive(nextState);
    onTogglePhaseLoop?.(nextState);
  };

  const hasTimestamps =
    activePhase?.videoStartTimeSeconds != null &&
    activePhase?.videoEndTimeSeconds != null &&
    activePhase.videoEndTimeSeconds > activePhase.videoStartTimeSeconds;

  const currentMediaUrl =
    (currentMedia as any)?.resolvedUrl || currentMedia?.url || currentMedia?.thumbnailUrl;

  const isVideo = currentMedia?.mediaType === 'VIDEO';

  const formatTimestamp = (sec?: number | null) => {
    if (sec == null) return '0.0s';
    return `${sec.toFixed(1)}s`;
  };

  return (
    <View style={styles.container}>
      {/* Media Canvas */}
      <View style={styles.mediaFrame}>
        {currentMediaUrl ? (
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: currentMediaUrl }}
              style={styles.mediaImage}
              resizeMode="cover"
            />
            {/* Dark gradient overlay on top & bottom for legibility */}
            <View style={styles.topVignette} />
            <View style={styles.bottomVignette} />
          </View>
        ) : (
          /* Graceful Fallback Frame */
          <View style={styles.fallbackContainer}>
            <View style={styles.fallbackGlow} />
            <View style={styles.fallbackIconBadge}>
              <Icon
                name={
                  movementPattern === 'SQUAT' || movementPattern === 'HINGE'
                    ? 'dumbbell'
                    : movementPattern === 'PUSH' || movementPattern === 'PULL'
                    ? 'bolt'
                    : 'activity'
                }
                size={40}
                color={themeColors.primary}
              />
            </View>
            <Text style={styles.fallbackTitle} numberOfLines={1}>
              {exerciseName}
            </Text>
            <View style={styles.fallbackTags}>
              <Badge label={difficulty} variant="neutral" />
              <Badge label={movementPattern} variant="primary" />
            </View>
            <Text style={styles.fallbackSubtitle}>
              Biomechanical visual demonstration
            </Text>
          </View>
        )}

        {/* Top Badges & Overlays */}
        <View style={styles.topBar}>
          <View style={styles.badgeRow}>
            {isVideo ? (
              <View style={styles.mediaTypeBadge}>
                <View style={styles.recordingDot} />
                <Text style={styles.mediaTypeBadgeText}>HD VIDEO</Text>
              </View>
            ) : currentMedia?.mediaType === 'MODEL_3D' ? (
              <View style={styles.mediaTypeBadge}>
                <Icon name="sparkles" size={12} color={themeColors.accent} />
                <Text style={styles.mediaTypeBadgeText}>3D MOTION</Text>
              </View>
            ) : null}

            {hasTimestamps && isPhaseLoopActive && (
              <TouchableOpacity
                style={styles.phaseLoopBadge}
                onPress={togglePhaseLoop}
                activeOpacity={0.8}
              >
                <Icon name="refresh" size={12} color="#FFFFFF" />
                <Text style={styles.phaseLoopBadgeText}>
                  Loop {formatTimestamp(activePhase?.videoStartTimeSeconds)} -{' '}
                  {formatTimestamp(activePhase?.videoEndTimeSeconds)}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Media Angle Switcher when multiple angles available */}
          {validMedia.length > 1 && (
            <View style={styles.angleSwitcher}>
              {validMedia.map((m, idx) => (
                <TouchableOpacity
                  key={m.id || `media-${idx}`}
                  style={[
                    styles.angleButton,
                    selectedMediaIndex === idx && styles.angleButtonActive,
                  ]}
                  onPress={() => setSelectedMediaIndex(idx)}
                >
                  <Text
                    style={[
                      styles.angleButtonText,
                      selectedMediaIndex === idx && styles.angleButtonTextActive,
                    ]}
                  >
                    {m.title ? m.title.slice(0, 8) : `Angle ${idx + 1}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Video Control Bar (Bottom of Media Frame) */}
        {isVideo && (
          <View style={styles.controlsBar}>
            <TouchableOpacity
              style={styles.controlIconBtn}
              onPress={() => setIsPlaying(!isPlaying)}
              accessibilityLabel={isPlaying ? 'Pause video' : 'Play video'}
            >
              <Icon
                name={isPlaying ? 'activity' : 'dumbbell'}
                size={18}
                color={themeColors.textPrimary}
              />
            </TouchableOpacity>

            {hasTimestamps && (
              <TouchableOpacity
                style={[
                  styles.phaseLoopToggleBtn,
                  isPhaseLoopActive && styles.phaseLoopToggleBtnActive,
                ]}
                onPress={togglePhaseLoop}
              >
                <Icon
                  name="refresh"
                  size={14}
                  color={isPhaseLoopActive ? themeColors.primary : themeColors.textMuted}
                />
                <Text
                  style={[
                    styles.phaseLoopToggleText,
                    isPhaseLoopActive && styles.phaseLoopToggleTextActive,
                  ]}
                >
                  {isPhaseLoopActive ? 'Phase Loop ON' : 'Full Exercise'}
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.spacer} />

            <TouchableOpacity
              style={styles.controlIconBtn}
              onPress={() => setIsMuted(!isMuted)}
              accessibilityLabel={isMuted ? 'Unmute video' : 'Mute video'}
            >
              <Icon
                name={isMuted ? 'shield' : 'sparkles'}
                size={16}
                color={themeColors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: sp.md,
    paddingTop: sp.sm,
    paddingBottom: sp.md,
  },
  mediaFrame: {
    width: '100%',
    height: Math.min(SCREEN_WIDTH * 0.65, 280),
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
    position: 'relative',
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  topVignette: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  bottomVignette: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  fallbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F1318',
    padding: sp.lg,
    position: 'relative',
  },
  fallbackGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  fallbackIconBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: sp.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  fallbackTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
    textAlign: 'center',
    marginBottom: sp.sm,
  },
  fallbackTags: {
    flexDirection: 'row',
    gap: sp.sm,
    marginBottom: sp.xs,
  },
  fallbackSubtitle: {
    ...typography.caption,
    color: themeColors.textMuted,
    marginTop: sp.xs,
  },
  topBar: {
    position: 'absolute',
    top: sp.sm,
    left: sp.sm,
    right: sp.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.xs,
  },
  mediaTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: sp.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  recordingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: themeColors.danger,
  },
  mediaTypeBadgeText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: themeColors.textPrimary,
    letterSpacing: 0.5,
  },
  phaseLoopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: themeColors.primary,
    paddingHorizontal: sp.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  phaseLoopBadgeText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  angleSwitcher: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: radius.full,
    padding: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  angleButton: {
    paddingHorizontal: sp.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  angleButtonActive: {
    backgroundColor: themeColors.primary,
  },
  angleButtonText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
    color: themeColors.textMuted,
  },
  angleButtonTextActive: {
    color: '#FFFFFF',
  },
  controlsBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sp.md,
    zIndex: 10,
  },
  controlIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  phaseLoopToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: sp.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
    marginLeft: sp.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  phaseLoopToggleBtnActive: {
    borderColor: themeColors.primary,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  phaseLoopToggleText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: themeColors.textMuted,
  },
  phaseLoopToggleTextActive: {
    color: themeColors.primary,
  },
  spacer: {
    flex: 1,
  },
});

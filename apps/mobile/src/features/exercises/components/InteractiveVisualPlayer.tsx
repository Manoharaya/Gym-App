import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Card, Badge, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import type {
  TutorialDemonstration,
  TutorialPhase,
} from '../services/exerciseService';

const sp = {
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
  lg: spacing[6],
};

export interface InteractiveVisualPlayerProps {
  demonstrations: TutorialDemonstration[];
  activePhase?: TutorialPhase | null;
  exerciseName: string;
  audioGuidanceUrl?: string | null;
  audioGuidanceTranscript?: string | null;
  onPhaseSelect?: (phaseIndex: number) => void;
  onSeekTimestamp?: (seconds: number) => void;
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export const InteractiveVisualPlayer: React.FC<InteractiveVisualPlayerProps> = ({
  demonstrations = [],
  activePhase,
  exerciseName,
  audioGuidanceUrl,
  audioGuidanceTranscript,
  onSeekTimestamp,
}) => {
  const [selectedDemoIndex, setSelectedDemoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [currentTimestamp, setCurrentTimestamp] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [isPhaseLoopEnabled, setIsPhaseLoopEnabled] = useState(false);

  const currentDemo = demonstrations[selectedDemoIndex] || demonstrations[0];
  const duration = currentDemo?.durationSeconds || 10;

  // Sync timestamp when active phase changes
  useEffect(() => {
    if (activePhase?.videoStartTimeSeconds != null) {
      setCurrentTimestamp(activePhase.videoStartTimeSeconds);
      onSeekTimestamp?.(activePhase.videoStartTimeSeconds);
    }
  }, [activePhase?.id]);

  // Simulating video playback progress ticks
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

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const handleRestart = () => {
    if (activePhase?.videoStartTimeSeconds != null) {
      setCurrentTimestamp(activePhase.videoStartTimeSeconds ?? 0);
    } else {
      setCurrentTimestamp(0);
    }
    setIsPlaying(true);
  };

  const cyclePlaybackSpeed = () => {
    const idx = PLAYBACK_SPEEDS.indexOf(playbackSpeed);
    const nextIdx = (idx + 1) % PLAYBACK_SPEEDS.length;
    setPlaybackSpeed(PLAYBACK_SPEEDS[nextIdx] ?? 1.0);
  };

  return (
    <Card style={styles.container}>
      {/* Player Screen Area */}
      <View style={[styles.playerScreen, isFullscreen && styles.fullscreenScreen]}>
        {currentDemo?.url ? (
          <Image
            source={{ uri: currentDemo.url }}
            style={styles.mediaVisual}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.fallbackScreen}>
            <Icon name="dumbbell" size={56} color={themeColors.textSecondary} />
            <Text style={styles.fallbackTitle}>{exerciseName}</Text>
            <Text style={styles.fallbackSubtitle}>
              Interactive Technique Demonstration Mode
            </Text>
            <Badge label="ILLUSTRATED GUIDE" variant="accent" style={styles.fallbackBadge} />
          </View>
        )}

        {/* Phase Overlay Watermark */}
        {activePhase && (
          <View style={styles.phaseOverlay}>
            <Badge
              label={activePhase.title || activePhase.phaseName}
              variant="accent"
            />
            {activePhase.tempoSeconds != null && (
              <View style={styles.tempoTag}>
                <Icon name="timer" size={12} color={themeColors.textPrimary} />
                <Text style={styles.tempoTagText}>{activePhase.tempoSeconds}s</Text>
              </View>
            )}
          </View>
        )}

        {/* Play/Pause Overlay Floating Center */}
        <TouchableOpacity
          style={styles.centerPlayBtn}
          onPress={() => setIsPlaying(!isPlaying)}
          accessibilityLabel={isPlaying ? 'Pause demonstration' : 'Play demonstration'}
        >
          <Text style={styles.centerPlayText}>{isPlaying ? '⏸' : '▶'}</Text>
        </TouchableOpacity>

        {/* Audio Coach Badge */}
        {audioGuidanceUrl && (
          <TouchableOpacity
            style={[styles.audioCoachBtn, isAudioPlaying && styles.audioCoachActive]}
            onPress={() => setIsAudioPlaying(!isAudioPlaying)}
          >
            <Icon name="bolt" size={14} color={themeColors.textPrimary} />
            <Text style={styles.audioCoachText}>
              {isAudioPlaying ? 'Audio Playing' : 'Voice Coach'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Media Source Tabs (if multiple demonstrations exist) */}
      {demonstrations.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.demoTabContainer}
        >
          {demonstrations.map((demo, idx) => (
            <TouchableOpacity
              key={demo.id}
              style={[
                styles.demoTab,
                selectedDemoIndex === idx && styles.demoTabSelected,
              ]}
              onPress={() => setSelectedDemoIndex(idx)}
            >
              <Text
                style={[
                  styles.demoTabText,
                  selectedDemoIndex === idx && styles.demoTabTextSelected,
                ]}
              >
                Angle {idx + 1} ({demo.mediaType})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Video Controls Bar */}
      <View style={styles.controlsBar}>
        {/* Progress Timeline Track */}
        <View style={styles.timelineContainer}>
          <View style={styles.timelineBackground}>
            <View
              style={[
                styles.timelineFill,
                { width: `${Math.min(100, (currentTimestamp / duration) * 100)}%` },
              ]}
            />
          </View>
          <View style={styles.timeLabels}>
            <Text style={styles.timeText}>{formatTime(currentTimestamp)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>

        {/* Buttons Row */}
        <View style={styles.buttonRow}>
          <View style={styles.leftButtons}>
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={() => setIsPlaying(!isPlaying)}
            >
              <Text style={styles.controlBtnText}>{isPlaying ? '⏸' : '▶'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlBtn} onPress={handleRestart}>
              <Icon name="refresh" size={16} color={themeColors.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.speedBtn} onPress={cyclePlaybackSpeed}>
              <Text style={styles.speedText}>{playbackSpeed}x</Text>
            </TouchableOpacity>

            {activePhase && (
              <TouchableOpacity
                style={[
                  styles.loopBtn,
                  isPhaseLoopEnabled && styles.loopBtnActive,
                ]}
                onPress={() => setIsPhaseLoopEnabled(!isPhaseLoopEnabled)}
              >
                <Text
                  style={[
                    styles.loopText,
                    isPhaseLoopEnabled && styles.loopTextActive,
                  ]}
                >
                  Loop Phase
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.rightButtons}>
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={() => setIsMuted(!isMuted)}
            >
              <Text style={styles.controlBtnText}>{isMuted ? '🔇' : '🔊'}</Text>
            </TouchableOpacity>

            {audioGuidanceTranscript && (
              <TouchableOpacity
                style={styles.controlBtn}
                onPress={() => setShowTranscriptModal(true)}
              >
                <Icon name="settings" size={16} color={themeColors.textPrimary} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.controlBtn}
              onPress={() => setIsFullscreen(!isFullscreen)}
            >
              <Text style={styles.controlBtnText}>{isFullscreen ? '↙' : '⛶'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Transcript Modal */}
      {showTranscriptModal && (
        <Modal
          visible={showTranscriptModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowTranscriptModal(false)}
        >
          <View style={styles.modalBackdrop}>
            <Card style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Audio Coaching Transcript</Text>
                <TouchableOpacity onPress={() => setShowTranscriptModal(false)}>
                  <Icon name="close" size={20} color={themeColors.textPrimary} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalBody}>
                <Text style={styles.transcriptText}>
                  {audioGuidanceTranscript ||
                    'Audio guidance transcript not available for this demonstration.'}
                </Text>
              </ScrollView>
            </Card>
          </View>
        </Modal>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: sp.md,
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: themeColors.cardBorder,
  },
  playerScreen: {
    width: '100%',
    height: 230,
    backgroundColor: '#0B0E14',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenScreen: {
    height: 380,
  },
  mediaVisual: {
    width: '100%',
    height: '100%',
  },
  fallbackScreen: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: sp.lg,
  },
  fallbackTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
    marginTop: sp.sm,
    textAlign: 'center',
  },
  fallbackSubtitle: {
    ...typography.bodySm,
    color: themeColors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  fallbackBadge: {
    marginTop: sp.md,
  },
  phaseOverlay: {
    position: 'absolute',
    top: sp.sm,
    left: sp.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tempoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tempoTagText: {
    ...typography.caption,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  centerPlayBtn: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  centerPlayText: {
    color: '#FFFFFF',
    fontSize: 22,
    marginLeft: 2,
  },
  audioCoachBtn: {
    position: 'absolute',
    top: sp.sm,
    right: sp.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(24, 30, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: themeColors.cardBorder,
  },
  audioCoachActive: {
    borderColor: themeColors.accent,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  audioCoachText: {
    ...typography.caption,
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  demoTabContainer: {
    paddingHorizontal: sp.sm,
    paddingVertical: 6,
    backgroundColor: '#121620',
    gap: 6,
  },
  demoTab: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: themeColors.cardBackground,
    borderWidth: 1,
    borderColor: themeColors.cardBorder,
  },
  demoTabSelected: {
    borderColor: themeColors.accent,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  demoTabText: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  demoTabTextSelected: {
    color: themeColors.accent,
    fontWeight: '700',
  },
  controlsBar: {
    padding: sp.sm,
    backgroundColor: themeColors.cardBackground,
  },
  timelineContainer: {
    marginBottom: 8,
  },
  timelineBackground: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  timelineFill: {
    height: '100%',
    backgroundColor: themeColors.accent,
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtnText: {
    color: themeColors.textPrimary,
    fontSize: 14,
  },
  speedBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  speedText: {
    ...typography.caption,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  loopBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  loopBtnActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.25)',
    borderWidth: 1,
    borderColor: themeColors.accent,
  },
  loopText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 11,
  },
  loopTextActive: {
    color: themeColors.accent,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: sp.lg,
  },
  modalContent: {
    width: '100%',
    maxHeight: '70%',
    padding: sp.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: sp.md,
  },
  modalTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
  },
  modalBody: {
    paddingVertical: sp.sm,
  },
  transcriptText: {
    ...typography.bodyMd,
    color: themeColors.textPrimary,
    lineHeight: 22,
  },
});

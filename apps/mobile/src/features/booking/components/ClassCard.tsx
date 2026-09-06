import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { themeColors } from '../../../theme';
import type { ClassSession } from '../types';
import { CapacityIndicator } from './CapacityIndicator';

interface ClassCardProps {
  session: ClassSession;
  onPress: () => void;
  onBookPress?: () => void;
  isBookedByMe?: boolean;
  isWaitlistedByMe?: boolean;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  HIIT: { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444' },
  YOGA: { bg: 'rgba(56, 189, 248, 0.15)', text: '#38BDF8' },
  STRENGTH: { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B' },
  SPIN: { bg: 'rgba(236, 72, 153, 0.15)', text: '#EC4899' },
  PILATES: { bg: 'rgba(168, 85, 247, 0.15)', text: '#A855F7' },
  BOXING: { bg: 'rgba(220, 38, 38, 0.15)', text: '#DC2626' },
};

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return isoString;
  }
}

export const ClassCard: React.FC<ClassCardProps> = ({
  session,
  onPress,
  onBookPress,
  isBookedByMe = false,
  isWaitlistedByMe = false,
}) => {
  const categoryKey = session.classType?.category || 'HIIT';
  const categoryStyle = CATEGORY_COLORS[categoryKey] || {
    bg: 'rgba(156, 163, 175, 0.15)',
    text: '#9CA3AF',
  };

  const startTimeStr = formatTime(session.startsAt);
  const endTimeStr = formatTime(session.endsAt);
  const spotsLeft = session.spotsRemaining ?? Math.max(0, session.capacity - (session.confirmedBookingCount || 0));
  const isFull = spotsLeft <= 0;
  const isCancelled = session.status === 'CANCELLED';
  const duration = session.classType?.durationMinutes ?? 45;
  const waitlistCount = session.waitlistCount ?? session._count?.waitlistEntries ?? 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.headerRow}>
        <View style={styles.categoryRow}>
          <View style={[styles.categoryBadge, { backgroundColor: categoryStyle.bg }]}>
            <Text style={[styles.categoryText, { color: categoryStyle.text }]}>
              {categoryKey}
            </Text>
          </View>
          <Text style={styles.durationText}>{duration} min</Text>
        </View>

        <CapacityIndicator
          capacity={session.capacity}
          spotsRemaining={spotsLeft}
          waitlistCount={waitlistCount}
          isCancelled={isCancelled}
        />
      </View>

      <Text style={styles.title} numberOfLines={1}>
        {session.name || session.classType?.name}
      </Text>

      <View style={styles.timeRow}>
        <Text style={styles.timeIcon}>🕒</Text>
        <Text style={styles.timeText}>
          {startTimeStr} – {endTimeStr}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Text style={styles.metaIcon}>👤</Text>
          <Text style={styles.metaText} numberOfLines={1}>
            {session.trainer
              ? `${session.trainer.firstName} ${session.trainer.lastName}`
              : 'FitCore Trainer'}
          </Text>
        </View>

        <View style={styles.metaItem}>
          <Text style={styles.metaIcon}>📍</Text>
          <Text style={styles.metaText} numberOfLines={1}>
            {session.resource?.name || session.outlet?.name || 'Studio'}
          </Text>
        </View>
      </View>

      {/* User Status / Action Button */}
      <View style={styles.actionRow}>
        {isBookedByMe ? (
          <View style={styles.bookedBadge}>
            <Text style={styles.bookedBadgeText}>✓ You're Booked</Text>
          </View>
        ) : isWaitlistedByMe ? (
          <View style={styles.waitlistedBadge}>
            <Text style={styles.waitlistedBadgeText}>⏳ On Waitlist</Text>
          </View>
        ) : isCancelled ? (
          <View style={styles.disabledBadge}>
            <Text style={styles.disabledBadgeText}>Session Cancelled</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.actionButton,
              isFull ? styles.waitlistButton : styles.bookButton,
            ]}
            onPress={(e) => {
              e.stopPropagation();
              if (onBookPress) onBookPress();
              else onPress();
            }}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.actionButtonText,
                isFull ? styles.waitlistButtonText : styles.bookButtonText,
              ]}
            >
              {isFull ? 'Join Waitlist' : 'Book Class'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: themeColors.inputBorder,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  durationText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeIcon: {
    fontSize: 13,
    marginRight: 6,
  },
  timeText: {
    color: '#E5E7EB',
    fontSize: 13,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  metaIcon: {
    fontSize: 12,
    marginRight: 5,
  },
  metaText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookButton: {
    backgroundColor: '#E63946',
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  waitlistButton: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderWidth: 1,
    borderColor: '#A855F7',
  },
  waitlistButtonText: {
    color: '#C084FC',
    fontSize: 13,
    fontWeight: '700',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  bookedBadge: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  bookedBadgeText: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '700',
  },
  waitlistedBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  waitlistedBadgeText: {
    color: '#C084FC',
    fontSize: 12,
    fontWeight: '700',
  },
  disabledBadge: {
    backgroundColor: 'rgba(107, 114, 128, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  disabledBadgeText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
});

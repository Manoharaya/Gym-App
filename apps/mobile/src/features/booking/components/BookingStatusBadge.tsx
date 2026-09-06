import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface BookingStatusBadgeProps {
  status: 'CONFIRMED' | 'WAITLISTED' | 'CANCELLED' | 'ATTENDED' | 'NO_SHOW';
}

const BADGE_STYLES: Record<
  BookingStatusBadgeProps['status'],
  { container: ViewStyle; text: TextStyle; label: string }
> = {
  CONFIRMED: {
    container: { backgroundColor: 'rgba(52, 211, 153, 0.15)' },
    text: { color: '#34D399' },
    label: 'CONFIRMED',
  },
  WAITLISTED: {
    container: { backgroundColor: 'rgba(168, 85, 247, 0.15)' },
    text: { color: '#C084FC' },
    label: 'WAITLISTED',
  },
  ATTENDED: {
    container: { backgroundColor: 'rgba(56, 189, 248, 0.15)' },
    text: { color: '#38BDF8' },
    label: 'ATTENDED',
  },
  CANCELLED: {
    container: { backgroundColor: 'rgba(107, 114, 128, 0.2)' },
    text: { color: '#9CA3AF' },
    label: 'CANCELLED',
  },
  NO_SHOW: {
    container: { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
    text: { color: '#EF4444' },
    label: 'NO SHOW',
  },
};

export const BookingStatusBadge: React.FC<BookingStatusBadgeProps> = ({ status }) => {
  const current = BADGE_STYLES[status] || BADGE_STYLES.CONFIRMED;

  return (
    <View style={[styles.badge, current.container]}>
      <Text style={[styles.label, current.text]}>{current.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

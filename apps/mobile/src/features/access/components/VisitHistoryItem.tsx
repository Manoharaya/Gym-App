import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { themeColors } from '../../../theme';
import type { CheckIn } from '../types';

interface VisitHistoryItemProps {
  visit: CheckIn;
}

export const VisitHistoryItem: React.FC<VisitHistoryItemProps> = ({ visit }) => {
  const checkInDate = new Date(visit.checkedInAt);
  const dateFormatted = checkInDate.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const inTimeFormatted = checkInDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  let outTimeFormatted = 'Ongoing';
  let durationFormatted = 'Active';

  if (visit.checkedOutAt) {
    const checkOutDate = new Date(visit.checkedOutAt);
    outTimeFormatted = checkOutDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const durationMin = Math.round(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60)
    );
    durationFormatted = `${durationMin} mins`;
  }

  const isSuccess = visit.status === 'SUCCESS';

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.outletName}>{(visit as any).outlet?.name || 'Gym Outlet'}</Text>
        <View
          style={[
            styles.methodBadge,
            isSuccess ? styles.methodSuccess : styles.methodDenied,
          ]}
        >
          <Text style={styles.methodText}>
            {isSuccess ? visit.method : 'DENIED'}
          </Text>
        </View>
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>Date</Text>
          <Text style={styles.detailValue}>{dateFormatted}</Text>
        </View>
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>Time</Text>
          <Text style={styles.detailValue}>
            {inTimeFormatted} &rarr; {outTimeFormatted}
          </Text>
        </View>
        <View style={styles.detailColRight}>
          <Text style={styles.detailLabel}>Duration</Text>
          <Text style={[styles.detailValue, !visit.checkedOutAt && styles.activeDuration]}>
            {durationFormatted}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: 12,
    padding: 14,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: themeColors.inputBorder,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  outletName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  methodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  methodSuccess: {
    backgroundColor: themeColors.elevatedBackground,
  },
  methodDenied: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  methodText: {
    color: '#D1D5DB',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailCol: {
    flex: 1,
  },
  detailColRight: {
    alignItems: 'flex-end',
  },
  detailLabel: {
    color: '#6B7280',
    fontSize: 11,
    marginBottom: 2,
  },
  detailValue: {
    color: '#E5E7EB',
    fontSize: 13,
    fontWeight: '500',
  },
  activeDuration: {
    color: '#10B981',
    fontWeight: '700',
  },
});

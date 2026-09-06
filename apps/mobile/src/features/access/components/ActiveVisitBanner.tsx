import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';

interface ActiveVisitBannerProps {
  outletName?: string;
  checkedInAt: string;
  onCheckOut: () => void;
  isCheckingOut?: boolean;
}

export const ActiveVisitBanner: React.FC<ActiveVisitBannerProps> = ({
  outletName = 'Facility',
  checkedInAt,
  onCheckOut,
  isCheckingOut = false,
}) => {
  const checkInDate = new Date(checkedInAt);
  const timeFormatted = checkInDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.banner}>
      <View style={styles.infoRow}>
        <View style={styles.pulseContainer}>
          <View style={styles.pulsingDot} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.bannerTitle}>CURRENTLY CHECKED IN</Text>
          <Text style={styles.outletText}>{outletName}</Text>
          <Text style={styles.timeText}>Entry scanned at {timeFormatted}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.checkoutBtn}
        onPress={onCheckOut}
        disabled={isCheckingOut}
        activeOpacity={0.8}
      >
        {isCheckingOut ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.checkoutBtnText}>Check Out</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#064E3B', // Dark emerald
    borderRadius: 14,
    padding: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#10B981',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pulseContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  pulsingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34D399',
  },
  textContainer: {
    flex: 1,
  },
  bannerTitle: {
    color: '#A7F3D0',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  outletText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  timeText: {
    color: '#D1FAE5',
    fontSize: 12,
    marginTop: 1,
  },
  checkoutBtn: {
    backgroundColor: '#047857',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#34D399',
    marginLeft: 10,
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});

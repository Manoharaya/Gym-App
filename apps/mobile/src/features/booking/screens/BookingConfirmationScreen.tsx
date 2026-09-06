import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MemberStackParamList } from '../../../navigation/types';
import { themeColors } from '../../../theme';

type RouteProps = RouteProp<MemberStackParamList, 'BookingConfirmation'>;
type NavigationProp = NativeStackNavigationProp<MemberStackParamList>;

export const BookingConfirmationScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { booking, waitlist, isWaitlisted } = (route.params || {}) as any;

  const session = booking?.classSession || waitlist?.classSession;
  const position = waitlist?.position;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View
          style={[
            styles.iconCircle,
            isWaitlisted ? styles.waitlistCircle : styles.confirmedCircle,
          ]}
        >
          <Text style={styles.iconText}>{isWaitlisted ? '⏳' : '🎉'}</Text>
        </View>

        <Text style={styles.heading}>
          {isWaitlisted ? 'Added to Waitlist' : 'Booking Confirmed!'}
        </Text>

        <Text style={styles.subheading}>
          {isWaitlisted
            ? `You are #${position || 1} in line. If a spot opens up, you will be automatically enrolled!`
            : 'Get ready to sweat! Your spot has been reserved in this session.'}
        </Text>

        {session && (
          <View style={styles.sessionCard}>
            <Text style={styles.sessionCategory}>
              {session.classType?.category || 'GROUP CLASS'}
            </Text>
            <Text style={styles.sessionTitle}>
              {session.title || session.classType?.name}
            </Text>
            <Text style={styles.sessionOutlet}>
              📍 {session.outlet?.name || 'FitCore Outlet'} • {session.resource?.name || 'Studio Room'}
            </Text>
          </View>
        )}

        <View style={styles.tipCard}>
          <Text style={styles.tipIcon}>💡</Text>
          <Text style={styles.tipText}>
            Use your dynamic digital pass on the Access screen for contactless entry at the gym turnstile.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => (navigation as any).navigate('MyBookings')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>View My Classes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => (navigation as any).navigate('Bookings')}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryButtonText}>Back to Schedule</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
    justifyContent: 'space-between',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    paddingTop: 40,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  confirmedCircle: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderWidth: 2,
    borderColor: '#34D399',
  },
  waitlistCircle: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderWidth: 2,
    borderColor: '#C084FC',
  },
  iconText: {
    fontSize: 36,
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  subheading: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sessionCard: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: themeColors.inputBorder,
    alignItems: 'center',
  },
  sessionCategory: {
    color: '#E63946',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  sessionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  sessionOutlet: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  tipIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  tipText: {
    flex: 1,
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 16,
  },
  footer: {
    paddingBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#E63946',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    backgroundColor: themeColors.cardBackground,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: themeColors.inputBorder,
  },
  secondaryButtonText: {
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: '600',
  },
});

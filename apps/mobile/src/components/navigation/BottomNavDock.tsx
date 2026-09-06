import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MemberStackParamList } from '../../navigation/types';
import { Icon, IconName } from '../primitives/Icon';
import { themeColors, radius, spacing } from '../../theme';

interface NavItem {
  id: keyof MemberStackParamList;
  label: string;
  icon: IconName;
  isCenter?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'MemberHome', label: 'Today', icon: 'home' },
  { id: 'Bookings', label: 'Classes', icon: 'calendar' },
  { id: 'QRCode', label: 'Pass', icon: 'qr', isCenter: true },
  { id: 'Progress', label: 'Progress', icon: 'activity' },
  { id: 'MemberProfile', label: 'Profile', icon: 'user' },
];

export interface BottomNavDockProps {
  currentRoute?: keyof MemberStackParamList;
}

export const BottomNavDock: React.FC<BottomNavDockProps> = ({ currentRoute = 'MemberHome' }) => {
  const navigation = useNavigation<NativeStackNavigationProp<MemberStackParamList>>();

  return (
    <View style={styles.dockContainer}>
      <View style={styles.dockBar}>
        {NAV_ITEMS.map((item) => {
          const isActive = currentRoute === item.id;

          if (item.isCenter) {
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => navigation.navigate(item.id as any)}
                style={styles.centerButtonWrapper}
                accessibilityRole="button"
                accessibilityLabel="Digital Access Pass"
              >
                <View style={styles.centerButton}>
                  <Icon name="qr" size={22} color="#FFFFFF" />
                </View>
                <Text style={styles.centerLabel}>PASS</Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => navigation.navigate(item.id as any)}
              style={styles.navItem}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <Icon
                name={item.icon}
                size={20}
                color={isActive ? themeColors.accent : themeColors.textMuted}
              />
              <Text style={[styles.navLabel, isActive && styles.activeNavLabel]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dockContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing[3],
    paddingBottom: spacing[3],
  },
  dockBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#141822',
    borderRadius: radius.full,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderWidth: 1,
    borderColor: '#232B3E',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: themeColors.textMuted,
  },
  activeNavLabel: {
    color: themeColors.accent,
    fontWeight: '700',
  },
  centerButtonWrapper: {
    alignItems: 'center',
    marginTop: -spacing[3],
    gap: 2,
  },
  centerButton: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: themeColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: themeColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 2,
    borderColor: themeColors.background,
  },
  centerLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: themeColors.textPrimary,
    letterSpacing: 0.5,
  },
});

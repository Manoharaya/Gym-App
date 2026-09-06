import { spacing as baseSpacing, radius as baseRadius, shadows as baseShadows } from '@fitcore/ui';
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const spacing = baseSpacing;
export const radius = baseRadius;
export const shadows = baseShadows;

export const dimensions = {
  windowWidth: width,
  windowHeight: height,
  minTouchTarget: 44,
  headerHeight: 56,
  bottomBarHeight: 64,
  cardBorderWidth: 1,
} as const;

export const animations = {
  durations: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 500,
  },
  spring: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
} as const;

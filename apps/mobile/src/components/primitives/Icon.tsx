import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { themeColors } from '../../theme';

export type IconName =
  | 'home'
  | 'calendar'
  | 'qr'
  | 'activity'
  | 'user'
  | 'settings'
  | 'bell'
  | 'chevron-right'
  | 'chevron-left'
  | 'chevron-down'
  | 'search'
  | 'filter'
  | 'close'
  | 'check'
  | 'dumbbell'
  | 'flame'
  | 'heart'
  | 'timer'
  | 'trophy'
  | 'award'
  | 'bolt'
  | 'sparkles'
  | 'shield'
  | 'lock'
  | 'unlock'
  | 'card'
  | 'refresh'
  | 'plus'
  | 'users'
  | 'map-pin'
  | 'clock'
  | 'alert-circle'
  | 'check-circle';

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * FitCore Lightweight Vector Icon Component
 * Precision geometric rendering avoiding external native binary dependencies.
 */
export const Icon: React.FC<IconProps> = ({
  name,
  size = 20,
  color = themeColors.textPrimary,
  style,
}) => {
  const containerStyle = {
    width: size,
    height: size,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  switch (name) {
    case 'home':
      return (
        <View style={[containerStyle, style]}>
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: size * 0.45,
              borderRightWidth: size * 0.45,
              borderBottomWidth: size * 0.4,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: color,
            }}
          />
          <View
            style={{
              width: size * 0.7,
              height: size * 0.45,
              backgroundColor: color,
              borderBottomLeftRadius: 2,
              borderBottomRightRadius: 2,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: size * 0.25,
                height: size * 0.3,
                backgroundColor: themeColors.background,
                marginTop: size * 0.15,
                borderTopLeftRadius: 2,
                borderTopRightRadius: 2,
              }}
            />
          </View>
        </View>
      );

    case 'calendar':
      return (
        <View
          style={[
            containerStyle,
            {
              borderWidth: 1.5,
              borderColor: color,
              borderRadius: 4,
              padding: 2,
            },
            style,
          ]}
        >
          <View
            style={{
              width: '100%',
              height: 3,
              backgroundColor: color,
              position: 'absolute',
              top: 2,
              left: 0,
              right: 0,
            }}
          />
          <View
            style={{
              flexDirection: 'row',
              gap: 2,
              marginTop: 4,
            }}
          >
            <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: color }} />
            <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: color }} />
            <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: color }} />
          </View>
        </View>
      );

    case 'qr':
      return (
        <View
          style={[
            containerStyle,
            {
              borderWidth: 1.5,
              borderColor: color,
              borderRadius: 3,
              padding: 2,
              justifyContent: 'space-between',
            },
            style,
          ]}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ width: 4, height: 4, backgroundColor: color, borderRadius: 1 }} />
            <View style={{ width: 4, height: 4, backgroundColor: color, borderRadius: 1 }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ width: 4, height: 4, backgroundColor: color, borderRadius: 1 }} />
            <View style={{ width: 3, height: 3, backgroundColor: color, borderRadius: 1 }} />
          </View>
        </View>
      );

    case 'activity':
      return (
        <View
          style={[
            containerStyle,
            {
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'center',
              gap: 2,
            },
            style,
          ]}
        >
          <View
            style={{ width: 2.5, height: size * 0.4, backgroundColor: color, borderRadius: 1 }}
          />
          <View
            style={{ width: 2.5, height: size * 0.8, backgroundColor: color, borderRadius: 1 }}
          />
          <View
            style={{ width: 2.5, height: size * 0.55, backgroundColor: color, borderRadius: 1 }}
          />
          <View
            style={{ width: 2.5, height: size * 0.9, backgroundColor: color, borderRadius: 1 }}
          />
        </View>
      );

    case 'user':
      return (
        <View style={[containerStyle, style]}>
          <View
            style={{
              width: size * 0.45,
              height: size * 0.45,
              borderRadius: size * 0.225,
              backgroundColor: color,
              marginBottom: 1,
            }}
          />
          <View
            style={{
              width: size * 0.75,
              height: size * 0.35,
              borderTopLeftRadius: size * 0.2,
              borderTopRightRadius: size * 0.2,
              backgroundColor: color,
            }}
          />
        </View>
      );

    case 'sparkles':
    case 'bolt':
      return (
        <View style={[containerStyle, style]}>
          <View
            style={{
              width: size * 0.3,
              height: size * 0.5,
              backgroundColor: color,
              transform: [{ skewX: '-20deg' }],
              borderRadius: 1,
            }}
          />
          <View
            style={{
              width: size * 0.4,
              height: size * 0.4,
              backgroundColor: color,
              transform: [{ skewX: '20deg' }],
              marginTop: -size * 0.15,
              borderRadius: 1,
            }}
          />
        </View>
      );

    case 'dumbbell':
      return (
        <View
          style={[
            containerStyle,
            {
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            },
            style,
          ]}
        >
          <View
            style={{ width: 3, height: size * 0.7, backgroundColor: color, borderRadius: 1 }}
          />
          <View
            style={{ width: size * 0.5, height: 3, backgroundColor: color, borderRadius: 1 }}
          />
          <View
            style={{ width: 3, height: size * 0.7, backgroundColor: color, borderRadius: 1 }}
          />
        </View>
      );

    case 'heart':
      return (
        <View
          style={[
            containerStyle,
            {
              alignItems: 'center',
              justifyContent: 'center',
            },
            style,
          ]}
        >
          <View
            style={{
              width: size * 0.6,
              height: size * 0.6,
              backgroundColor: color,
              borderRadius: size * 0.15,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );

    case 'flame':
      return (
        <View
          style={[
            containerStyle,
            {
              alignItems: 'center',
              justifyContent: 'flex-end',
            },
            style,
          ]}
        >
          <View
            style={{
              width: size * 0.6,
              height: size * 0.8,
              backgroundColor: color,
              borderTopLeftRadius: size * 0.3,
              borderTopRightRadius: size * 0.3,
              borderBottomLeftRadius: size * 0.3,
              borderBottomRightRadius: size * 0.3,
            }}
          />
        </View>
      );

    case 'search':
      return (
        <View
          style={[
            containerStyle,
            {
              alignItems: 'center',
              justifyContent: 'center',
            },
            style,
          ]}
        >
          <View
            style={{
              width: size * 0.6,
              height: size * 0.6,
              borderRadius: size * 0.3,
              borderWidth: 1.8,
              borderColor: color,
            }}
          />
          <View
            style={{
              width: 2,
              height: size * 0.3,
              backgroundColor: color,
              position: 'absolute',
              bottom: 1,
              right: 2,
              transform: [{ rotate: '-45deg' }],
            }}
          />
        </View>
      );

    case 'chevron-right':
      return (
        <View
          style={[
            containerStyle,
            {
              alignItems: 'center',
              justifyContent: 'center',
            },
            style,
          ]}
        >
          <View
            style={{
              width: size * 0.4,
              height: size * 0.4,
              borderTopWidth: 2,
              borderRightWidth: 2,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );

    case 'chevron-left':
      return (
        <View
          style={[
            containerStyle,
            {
              alignItems: 'center',
              justifyContent: 'center',
            },
            style,
          ]}
        >
          <View
            style={{
              width: size * 0.4,
              height: size * 0.4,
              borderBottomWidth: 2,
              borderLeftWidth: 2,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );

    case 'check':
    case 'check-circle':
      return (
        <View
          style={[
            containerStyle,
            {
              alignItems: 'center',
              justifyContent: 'center',
            },
            style,
          ]}
        >
          <View
            style={{
              width: size * 0.5,
              height: size * 0.25,
              borderBottomWidth: 2,
              borderLeftWidth: 2,
              borderColor: color,
              transform: [{ rotate: '-45deg' }],
              marginTop: -2,
            }}
          />
        </View>
      );

    case 'close':
      return (
        <View
          style={[
            containerStyle,
            {
              alignItems: 'center',
              justifyContent: 'center',
            },
            style,
          ]}
        >
          <View
            style={{
              width: size * 0.7,
              height: 2,
              backgroundColor: color,
              transform: [{ rotate: '45deg' }],
              position: 'absolute',
            }}
          />
          <View
            style={{
              width: size * 0.7,
              height: 2,
              backgroundColor: color,
              transform: [{ rotate: '-45deg' }],
              position: 'absolute',
            }}
          />
        </View>
      );

    default:
      return (
        <View
          style={[
            containerStyle,
            {
              width: size * 0.6,
              height: size * 0.6,
              borderRadius: size * 0.3,
              backgroundColor: color,
            },
            style,
          ]}
        />
      );
  }
};

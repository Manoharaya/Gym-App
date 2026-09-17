import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import { Badge, Icon } from '../../../components/primitives';
import { themeColors, typography, radius, spacing } from '../../../theme';

interface DimensionExplorerCardProps {
  title: string;
  count: number;
  description?: string;
  thumbnailUrl?: string;
  icon?: 'dumbbell' | 'flame' | 'activity' | 'bolt' | 'timer' | 'trophy' | 'award' | 'check-circle' | 'sparkles';
  isHighlighted?: boolean;
  onPress: () => void;
  width?: number | string;
}

export const DimensionExplorerCard: React.FC<DimensionExplorerCardProps> = ({
  title,
  count,
  description,
  thumbnailUrl,
  icon = 'dumbbell',
  isHighlighted = false,
  onPress,
  width = 160,
}) => {
  const content = (
    <View style={styles.cardInner}>
      {/* Overlay gradient scrim if thumbnail present */}
      {thumbnailUrl && <View style={styles.scrim} />}

      {/* Top Header Row with Icon & Count Badge */}
      <View style={styles.headerRow}>
        <View
          style={[
            styles.iconWrapper,
            isHighlighted && styles.iconWrapperHighlighted,
          ]}
        >
          <Icon
            name={icon}
            size={18}
            color={isHighlighted ? '#000000' : themeColors.primary}
          />
        </View>
        <Badge
          label={`${count} ${count === 1 ? 'ex' : 'exs'}`}
          variant={isHighlighted ? 'primary' : 'neutral'}
        />
      </View>

      {/* Title & Description */}
      <View style={styles.textContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {description ? (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${count} exercises`}
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.cardContainer,
        { width: width as any },
        isHighlighted && styles.cardHighlighted,
      ]}
    >
      {thumbnailUrl ? (
        <ImageBackground
          source={{ uri: thumbnailUrl }}
          style={styles.imageBackground}
          imageStyle={styles.imageStyle}
        >
          {content}
        </ImageBackground>
      ) : (
        content
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    height: 140,
    backgroundColor: themeColors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    overflow: 'hidden',
    marginRight: spacing.sm,
  },
  cardHighlighted: {
    borderColor: themeColors.primary,
    borderWidth: 1.5,
  },
  imageBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  imageStyle: {
    borderRadius: radius.md,
    opacity: 0.75,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
  },
  cardInner: {
    flex: 1,
    padding: spacing.sm,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapperHighlighted: {
    backgroundColor: themeColors.primary,
  },
  textContainer: {
    zIndex: 2,
  },
  title: {
    ...typography.subtitle2,
    fontWeight: '700',
    color: themeColors.textPrimary,
    marginBottom: 2,
  },
  description: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 11,
    lineHeight: 14,
  },
});

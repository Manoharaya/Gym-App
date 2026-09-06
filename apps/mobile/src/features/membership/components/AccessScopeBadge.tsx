import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface AccessScopeBadgeProps {
  accessScope: string;
}

export const AccessScopeBadge: React.FC<AccessScopeBadgeProps> = ({ accessScope }) => {
  let label = 'Single Club Access';
  let bg = 'rgba(59, 130, 246, 0.15)';
  let text = '#60A5FA';
  let border = 'rgba(59, 130, 246, 0.3)';

  if (accessScope === 'ALL_ORGANISATION_OUTLETS') {
    label = 'All Clubs Access';
    bg = 'rgba(234, 179, 8, 0.15)';
    text = '#FACC15';
    border = 'rgba(234, 179, 8, 0.3)';
  } else if (accessScope === 'MULTI_OUTLET') {
    label = 'Multi-Club Access';
    bg = 'rgba(168, 85, 247, 0.15)';
    text = '#C084FC';
    border = 'rgba(168, 85, 247, 0.3)';
  }

  return (
    <View style={[styles.container, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

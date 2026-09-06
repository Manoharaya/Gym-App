import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { themeColors } from '../../../theme';

interface SessionFilterBarProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

const CATEGORIES = [
  { id: null, label: 'All' },
  { id: 'HIIT', label: 'HIIT' },
  { id: 'YOGA', label: 'Yoga' },
  { id: 'STRENGTH', label: 'Strength' },
  { id: 'SPIN', label: 'Spin' },
  { id: 'PILATES', label: 'Pilates' },
];

function generateNextDays(count: number = 14): Array<{
  isoDate: string;
  dayOfWeek: string;
  dayOfMonth: number;
  isToday: boolean;
}> {
  const days: Array<{
    isoDate: string;
    dayOfWeek: string;
    dayOfMonth: number;
    isToday: boolean;
  }> = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const isoDate = d.toISOString().split('T')[0] ?? '';
    const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayOfMonth = d.getDate();
    const isToday = i === 0;
    days.push({ isoDate, dayOfWeek, dayOfMonth, isToday });
  }
  return days;
}

export const SessionFilterBar: React.FC<SessionFilterBarProps> = ({
  selectedDate,
  onSelectDate,
  selectedCategory,
  onSelectCategory,
}) => {
  const days = React.useMemo(() => generateNextDays(14), []);

  return (
    <View style={styles.container}>
      {/* Date Strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateScroll}
      >
        {days.map((item) => {
          const isSelected = item.isoDate === selectedDate;
          return (
            <TouchableOpacity
              key={item.isoDate}
              style={[
                styles.dateCard,
                isSelected && styles.dateCardSelected,
              ]}
              onPress={() => onSelectDate(item.isoDate)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.dayOfWeekText,
                  isSelected && styles.dayOfWeekTextSelected,
                ]}
              >
                {item.isToday ? 'TODAY' : item.dayOfWeek.toUpperCase()}
              </Text>
              <Text
                style={[
                  styles.dayOfMonthText,
                  isSelected && styles.dayOfMonthTextSelected,
                ]}
              >
                {item.dayOfMonth}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Category Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.label}
              style={[
                styles.categoryPill,
                isSelected && styles.categoryPillSelected,
              ]}
              onPress={() => onSelectCategory(cat.id)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  isSelected && styles.categoryPillTextSelected,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: themeColors.background,
    paddingVertical: 8,
  },
  dateScroll: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  dateCard: {
    width: 60,
    height: 64,
    backgroundColor: themeColors.cardBackground,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: themeColors.inputBorder,
  },
  dateCardSelected: {
    backgroundColor: '#E63946',
    borderColor: '#E63946',
  },
  dayOfWeekText: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  dayOfWeekTextSelected: {
    color: '#FFFFFF',
  },
  dayOfMonthText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  dayOfMonthTextSelected: {
    color: '#FFFFFF',
  },
  categoryScroll: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 4,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: themeColors.cardBackground,
    marginRight: 8,
    borderWidth: 1,
    borderColor: themeColors.inputBorder,
  },
  categoryPillSelected: {
    backgroundColor: 'rgba(230, 57, 70, 0.2)',
    borderColor: '#E63946',
  },
  categoryPillText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },
  categoryPillTextSelected: {
    color: '#FF4D5E',
    fontWeight: '700',
  },
});

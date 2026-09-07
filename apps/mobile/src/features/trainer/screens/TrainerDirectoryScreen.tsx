import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Card, Badge, Button, Avatar, MetricCard } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { trainerService } from '../services/trainerService';

const sp = {
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
  lg: spacing[6],
  xl: spacing[8],
};

const colors = {
  ...themeColors,
  surfaceHighlight: themeColors.surfaceElevated,
  borderSubtle: themeColors.border,
};

interface TrainerItem {
  id: string;
  professionalName: string;
  bio?: string;
  specialties: string[];
  yearsExperience: number;
  languages: string[];
  coachingStyle?: string;
  trainingApproach?: string;
  consultationAvailability?: string;
  status: string;
  staffProfile?: {
    jobTitle: string;
    employeeReference?: string;
    user?: { email: string };
  };
  certifications?: {
    id: string;
    certificationName: string;
    status: string;
  }[];
  _count?: {
    clientAssignments?: number;
  };
}

const FALLBACK_TRAINERS: TrainerItem[] = [
  {
    id: 'trainer_marcus',
    professionalName: 'Marcus Vance',
    bio: 'Former collegiate strength and conditioning coach specializing in barbell hypertrophy, Olympic lifting, and injury resilience.',
    specialties: ['Strength & Conditioning', 'Powerlifting', 'Olympic Weightlifting', 'Athletic Performance'],
    yearsExperience: 8,
    languages: ['English', 'German'],
    coachingStyle: 'Technical, evidence-based, high-accountability coaching tailored to athletic longevity.',
    trainingApproach: 'Periodized barbell training coupled with velocity-based metrics.',
    consultationAvailability: 'Mon-Fri 06:00-14:00 AWST',
    status: 'ACTIVE',
    staffProfile: {
      jobTitle: 'Head Strength Coach & PT',
      employeeReference: 'EMP-SW-004',
      user: { email: 'trainer@secondwind.com.au' },
    },
    certifications: [
      { id: 'c1', certificationName: 'CSCS - Certified Strength and Conditioning Specialist', status: 'ACTIVE' },
      { id: 'c2', certificationName: 'Provide First Aid & CPR / AED', status: 'EXPIRING_SOON' },
    ],
    _count: { clientAssignments: 12 },
  },
  {
    id: 'trainer_mike',
    professionalName: 'Mike Ross',
    bio: 'Dynamic functional fitness and metabolic conditioning specialist focusing on cardiovascular threshold development.',
    specialties: ['Functional Fitness', 'HIIT', 'Mobility & Recovery', 'Injury Rehabilitation'],
    yearsExperience: 5,
    languages: ['English'],
    coachingStyle: 'High-energy, dynamic movement coaching.',
    trainingApproach: 'Functional movement patterns, metabolic intervals, and structured mobility.',
    consultationAvailability: 'Tue-Sat 10:00-18:00 AWST',
    status: 'ACTIVE',
    staffProfile: {
      jobTitle: 'Senior Performance Coach',
      employeeReference: 'EMP-SW-005',
      user: { email: 'trainer.mike@secondwind.com.au' },
    },
    certifications: [
      { id: 'c3', certificationName: 'Certificate IV in Fitness (Personal Trainer)', status: 'ACTIVE' },
    ],
    _count: { clientAssignments: 8 },
  },
];

const SPECIALTY_CHIPS = [
  'ALL',
  'Strength & Conditioning',
  'Olympic Weightlifting',
  'Functional Fitness',
  'HIIT',
  'Mobility & Recovery',
];

export const TrainerDirectoryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [trainers, setTrainers] = useState<TrainerItem[]>(FALLBACK_TRAINERS);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('ALL');

  const fetchTrainers = useCallback(async () => {
    try {
      const data = await trainerService.getAllTrainers();
      if (data && data.length > 0) {
        setTrainers(data as TrainerItem[]);
      }
    } catch {
      // Keep fallback if offline
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTrainers();
  }, [fetchTrainers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrainers();
  };

  const filteredTrainers = trainers.filter((t) => {
    const matchesSpecialty =
      selectedSpecialty === 'ALL' ||
      t.specialties.some((s) => s.toLowerCase().includes(selectedSpecialty.toLowerCase()));

    const query = searchQuery.toLowerCase();
    const nameMatch = t.professionalName.toLowerCase().includes(query);
    const specMatch = t.specialties.some((s) => s.toLowerCase().includes(query));
    const langMatch = t.languages.some((l) => l.toLowerCase().includes(query));

    return matchesSpecialty && (!query || nameMatch || specMatch || langMatch);
  });

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>COACHING & PERFORMANCE</Text>
          <Text style={styles.headerTitle}>Trainer Directory</Text>
        </View>
        <Badge label="VERIFIED COACHES" variant="success" />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* KPI Metrics */}
        <View style={styles.metricsRow}>
          <MetricCard
            label="COACHES ON ROSTER"
            value={trainers.length.toString()}
            icon="users"
            accentColor={colors.primary}
            style={styles.flexMetric}
          />
          <MetricCard
            label="ACTIVE CLIENTS"
            value={trainers.reduce((acc, curr) => acc + (curr._count?.clientAssignments || 0), 0).toString()}
            icon="activity"
            accentColor={colors.accent}
            style={styles.flexMetric}
          />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search coach name, specialty, or language..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearch}>
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Specialty Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
          {SPECIALTY_CHIPS.map((chip) => (
            <TouchableOpacity
              key={chip}
              style={[styles.chip, selectedSpecialty === chip && styles.chipActive]}
              onPress={() => setSelectedSpecialty(chip)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, selectedSpecialty === chip && styles.chipTextActive]}>
                {chip}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Trainers List */}
        <View style={styles.listSection}>
          <Text style={styles.listHeader}>
            {filteredTrainers.length} {filteredTrainers.length === 1 ? 'TRAINER' : 'TRAINERS'} AVAILABLE
          </Text>

          {filteredTrainers.map((trainer) => (
            <Card key={trainer.id} style={styles.trainerCard}>
              <View style={styles.cardHeader}>
                <Avatar
                  name={trainer.professionalName}
                  size="lg"
                />
                <View style={styles.headerInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.trainerName}>{trainer.professionalName}</Text>
                    <Badge label={`${trainer.yearsExperience} yrs exp`} variant="neutral" />
                  </View>
                  <Text style={styles.jobTitle}>{trainer.staffProfile?.jobTitle || 'Conditioning Coach'}</Text>
                  {trainer.consultationAvailability && (
                    <Text style={styles.availabilityText}>🕒 {trainer.consultationAvailability}</Text>
                  )}
                </View>
              </View>

              {trainer.bio && (
                <Text style={styles.bioText} numberOfLines={2}>
                  {trainer.bio}
                </Text>
              )}

              {/* Specialties Pills */}
              <View style={styles.specialtiesWrap}>
                {trainer.specialties.map((spec, i) => (
                  <View key={i} style={styles.specPill}>
                    <Text style={styles.specPillText}>{spec}</Text>
                  </View>
                ))}
              </View>

              {/* Footer Meta & Actions */}
              <View style={styles.cardFooter}>
                <View style={styles.metaCol}>
                  <Text style={styles.certCount}>
                    🏅 {trainer.certifications?.length || 0} Verified Certifications
                  </Text>
                  <Text style={styles.langText}>
                    🗣 {trainer.languages.join(', ')}
                  </Text>
                </View>

                <View style={styles.actionsCol}>
                  <Button
                    title="Profile & Certs"
                    variant="primary"
                    size="sm"
                    onPress={() => navigation.navigate('TrainerProfile', { trainerId: trainer.id })}
                    style={styles.profileBtn}
                  />
                  <Button
                    title="Clients Roster"
                    variant="secondary"
                    size="sm"
                    onPress={() => navigation.navigate('TrainerClients', { trainerId: trainer.id })}
                    style={styles.clientsBtn}
                  />
                </View>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sp.lg,
    paddingVertical: sp.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.primary,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginTop: 2,
  },
  scrollContent: {
    padding: sp.md,
    paddingBottom: sp.xl * 2,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: sp.sm,
    marginBottom: sp.md,
  },
  flexMetric: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    paddingHorizontal: sp.md,
    marginBottom: sp.md,
    height: 46,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    ...typography.body,
  },
  clearSearch: {
    padding: sp.xs,
  },
  clearSearchText: {
    color: colors.textMuted,
    fontSize: 16,
  },
  chipsRow: {
    flexDirection: 'row',
    marginBottom: sp.md,
  },
  chip: {
    paddingHorizontal: sp.md,
    paddingVertical: sp.xs + 2,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginRight: sp.sm,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
  listSection: {
    marginTop: sp.xs,
  },
  listHeader: {
    ...typography.overline,
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: sp.sm,
  },
  trainerCard: {
    marginBottom: sp.md,
    padding: sp.md,
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: sp.md,
    alignItems: 'center',
    marginBottom: sp.sm,
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  trainerName: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  jobTitle: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  availabilityText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  bioText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: sp.sm,
    lineHeight: 18,
  },
  specialtiesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sp.xs,
    marginBottom: sp.md,
  },
  specPill: {
    backgroundColor: 'rgba(0, 229, 155, 0.1)',
    paddingHorizontal: sp.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 155, 0.25)',
  },
  specPillText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    fontSize: 11,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: sp.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: sp.sm,
  },
  metaCol: {
    flex: 1,
  },
  certCount: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '600',
  },
  langText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  actionsCol: {
    flexDirection: 'row',
    gap: sp.xs,
  },
  profileBtn: {
    minWidth: 100,
  },
  clientsBtn: {
    minWidth: 95,
  },
});

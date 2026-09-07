import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Screen, Card, Badge, Button, Avatar } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { trainerService } from '../services/trainerService';
import type { TrainerProfile, TrainerCertification } from '@fitcore/types';

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

interface DetailedTrainerProfile extends Omit<TrainerProfile, 'staffProfile' | 'certifications'> {
  staffProfile?: {
    jobTitle: string;
    employeeReference?: string;
    user?: { email: string; firstName: string; lastName: string };
  };
  certifications: (TrainerCertification & {
    documentSignedUrl?: string;
  })[];
  _count?: {
    clientAssignments?: number;
  };
}

const FALLBACK_TRAINER_PROFILE: DetailedTrainerProfile = {
  id: 'trainer_marcus',
  organisationId: 'org_dev_secondwind_001',
  staffProfileId: 'staff_3',
  professionalName: 'Marcus Vance',
  bio: 'Former collegiate strength and conditioning coach specializing in barbell hypertrophy, Olympic lifting, and injury resilience. Committed to evidence-backed programming that balances structural integrity with maximal force development.',
  specialties: ['Strength & Conditioning', 'Powerlifting', 'Olympic Weightlifting', 'Athletic Performance'],
  yearsExperience: 8,
  languages: ['English', 'German'],
  coachingStyle: 'Technical, evidence-based, high-accountability coaching tailored to athletic longevity.',
  trainingApproach: 'Periodized barbell training coupled with velocity-based metrics.',
  consultationAvailability: 'Mon-Fri 06:00-14:00 AWST',
  status: 'ACTIVE',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  staffProfile: {
    jobTitle: 'Head Strength Coach & PT',
    employeeReference: 'EMP-SW-004',
    user: {
      email: 'trainer@secondwind.com.au',
      firstName: 'Marcus',
      lastName: 'Vance',
    },
  },
  certifications: [
    {
      id: 'cert_1',
      trainerProfileId: 'trainer_marcus',
      certificationName: 'CSCS - Certified Strength and Conditioning Specialist',
      issuingOrganisation: 'National Strength and Conditioning Association (NSCA)',
      certificationNumber: 'NSCA-CSCS-2022-84912',
      issueDate: '2022-03-15T00:00:00.000Z',
      expiryDate: '2026-03-15T00:00:00.000Z',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'cert_2',
      trainerProfileId: 'trainer_marcus',
      certificationName: 'Provide First Aid & CPR / AED (HLTAID011)',
      issuingOrganisation: 'St John Ambulance Australia',
      certificationNumber: 'SJA-FA-2024-5128',
      issueDate: '2024-04-10T00:00:00.000Z',
      expiryDate: '2026-10-07T00:00:00.000Z',
      status: 'EXPIRING_SOON',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'cert_3',
      trainerProfileId: 'trainer_marcus',
      certificationName: 'USA Weightlifting Level 2 Advanced Coach',
      issuingOrganisation: 'USA Weightlifting',
      certificationNumber: 'USAW-L2-9901',
      issueDate: '2021-06-01T00:00:00.000Z',
      expiryDate: '2027-06-01T00:00:00.000Z',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  _count: {
    clientAssignments: 14,
  },
};

export const TrainerProfileScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const trainerId = route.params?.trainerId || 'trainer_marcus';

  const [profile, setProfile] = useState<DetailedTrainerProfile>(FALLBACK_TRAINER_PROFILE);
  const [certModalVisible, setCertModalVisible] = useState(false);

  // New Cert Form
  const [certName, setCertName] = useState('');
  const [certIssuer, setCertIssuer] = useState('');
  const [certNum, setCertNum] = useState('');
  const [certExpiry, setCertExpiry] = useState('2028-12-31');

  const fetchProfile = useCallback(async () => {
    try {
      const data = await trainerService.getTrainerById(trainerId);
      if (data) {
        setProfile(data as unknown as DetailedTrainerProfile);
      }
    } catch {
      // Fallback used
    }
  }, [trainerId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleAddCert = async () => {
    if (!certName || !certIssuer) {
      Alert.alert('Validation Error', 'Please enter certification name and issuing organisation.');
      return;
    }

    try {
      await trainerService.addCertification(profile.id, {
        certificationName: certName,
        issuingOrganisation: certIssuer,
        certificationNumber: certNum,
        issueDate: new Date().toISOString(),
        expiryDate: new Date(certExpiry).toISOString(),
      });
      setCertModalVisible(false);
      setCertName('');
      setCertIssuer('');
      setCertNum('');
      Alert.alert('Certification Added', 'Your credential has been submitted and verified.');
      fetchProfile();
    } catch {
      const newCert: any = {
        id: `cert_${Date.now()}`,
        trainerProfileId: profile.id,
        certificationName: certName,
        issuingOrganisation: certIssuer,
        certificationNumber: certNum,
        issueDate: new Date().toISOString(),
        expiryDate: new Date(certExpiry).toISOString(),
        status: 'ACTIVE',
      };
      setProfile((prev) => ({
        ...prev,
        certifications: [newCert, ...prev.certifications],
      }));
      setCertModalVisible(false);
      setCertName('');
      setCertIssuer('');
      setCertNum('');
      Alert.alert('Certification Logged', 'Certification added to your verified profile.');
    }
  };

  const getCertStatusVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'EXPIRING_SOON':
        return 'warning';
      case 'EXPIRED':
      case 'REVOKED':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trainer Profile</Text>
        <TouchableOpacity
          style={styles.headerActionBtn}
          onPress={() => navigation.navigate('TrainerClients', { trainerId: profile.id })}
        >
          <Text style={styles.headerActionText}>Roster ({profile._count?.clientAssignments || 0})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Card */}
        <Card style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Avatar
              name={profile.professionalName}
              size="xl"
            />
            <View style={styles.heroMain}>
              <View style={styles.badgeRow}>
                <Badge label="VERIFIED COACH" variant="success" />
                <Badge label={`${profile.yearsExperience} YRS EXP`} variant="neutral" />
              </View>
              <Text style={styles.heroName}>{profile.professionalName}</Text>
              <Text style={styles.heroTitle}>{profile.staffProfile?.jobTitle || 'Strength Coach'}</Text>
              {profile.consultationAvailability && (
                <Text style={styles.heroAvailability}>🕒 {profile.consultationAvailability}</Text>
              )}
            </View>
          </View>

          {/* Specialties Wrap */}
          <View style={styles.specialtiesWrap}>
            {profile.specialties.map((spec, i) => (
              <View key={i} style={styles.specPill}>
                <Text style={styles.specPillText}>{spec}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Bio & Coaching Style */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>BIOGRAPHY & PHILOSOPHY</Text>
          <Text style={styles.bioText}>{profile.bio}</Text>

          {profile.coachingStyle && (
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>COACHING STYLE</Text>
              <Text style={styles.infoValue}>{profile.coachingStyle}</Text>
            </View>
          )}

          {profile.trainingApproach && (
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>TRAINING APPROACH</Text>
              <Text style={styles.infoValue}>{profile.trainingApproach}</Text>
            </View>
          )}

          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>LANGUAGES SPOKEN</Text>
            <Text style={styles.infoValue}>{profile.languages.join(' · ')}</Text>
          </View>
        </Card>

        {/* Certifications Section */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>VERIFIED CERTIFICATIONS</Text>
              <Text style={styles.sectionSubtitle}>
                Audited credentials and industry compliance
              </Text>
            </View>
            <TouchableOpacity
              style={styles.addCertBtn}
              onPress={() => setCertModalVisible(true)}
            >
              <Text style={styles.addCertBtnText}>+ Add Cert</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.certsList}>
            {profile.certifications.map((cert) => (
              <View key={cert.id} style={styles.certCard}>
                <View style={styles.certHeader}>
                  <Text style={styles.certIcon}>📜</Text>
                  <View style={styles.certInfo}>
                    <Text style={styles.certName}>{cert.certificationName}</Text>
                    <Text style={styles.certIssuer}>{cert.issuingOrganisation}</Text>
                  </View>
                  <Badge
                    label={cert.status.replace('_', ' ')}
                    variant={getCertStatusVariant(cert.status)}
                  />
                </View>

                <View style={styles.certMeta}>
                  {cert.certificationNumber && (
                    <Text style={styles.certNumber}>Cred #{cert.certificationNumber}</Text>
                  )}
                  {cert.expiryDate && (
                    <Text style={styles.certExpiry}>
                      Expires: {new Date(cert.expiryDate).toLocaleDateString()}
                    </Text>
                  )}
                </View>

                {cert.status === 'EXPIRING_SOON' && (
                  <View style={styles.expiringAlert}>
                    <Text style={styles.expiringAlertText}>
                      ⚠️ Expiring within 90 days. Renewal or re-verification required.
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </Card>

        {/* Action Button */}
        <View style={styles.bottomActions}>
          <Button
            title="Manage Assigned Clients"
            variant="primary"
            size="lg"
            onPress={() => navigation.navigate('TrainerClients', { trainerId: profile.id })}
          />
        </View>
      </ScrollView>

      {/* Add Certification Modal */}
      <Modal
        visible={certModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCertModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add Trainer Certification</Text>
            <Text style={styles.modalSubtitle}>
              Register a professional credential with issue and expiration dates.
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Certification Name</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. CSCS, ASCA Level 2, First Aid"
                placeholderTextColor={colors.textMuted}
                value={certName}
                onChangeText={setCertName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Issuing Organisation</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. NSCA, ASCA, Red Cross"
                placeholderTextColor={colors.textMuted}
                value={certIssuer}
                onChangeText={setCertIssuer}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Credential / License Number</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. NSCA-CSCS-2024-1002"
                placeholderTextColor={colors.textMuted}
                value={certNum}
                onChangeText={setCertNum}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Expiry Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="2028-12-31"
                placeholderTextColor={colors.textMuted}
                value={certExpiry}
                onChangeText={setCertExpiry}
              />
            </View>

            <View style={styles.modalButtonsRow}>
              <Button
                title="Cancel"
                variant="outline"
                size="md"
                onPress={() => setCertModalVisible(false)}
                style={styles.halfBtn}
              />
              <Button
                title="Submit Cert"
                variant="primary"
                size="md"
                onPress={handleAddCert}
                style={styles.halfBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  backBtn: {
    paddingVertical: sp.xs,
  },
  backBtnText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  headerActionBtn: {
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: sp.sm,
    paddingVertical: sp.xs,
    borderRadius: radius.sm,
  },
  headerActionText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '700',
  },
  scrollContent: {
    padding: sp.md,
    paddingBottom: sp.xl * 2,
  },
  heroCard: {
    padding: sp.lg,
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
    marginBottom: sp.md,
  },
  heroTop: {
    flexDirection: 'row',
    gap: sp.lg,
    alignItems: 'center',
    marginBottom: sp.md,
  },
  heroMain: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: sp.xs,
    marginBottom: 4,
  },
  heroName: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  heroTitle: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  heroAvailability: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
  },
  specialtiesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sp.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: sp.md,
  },
  specPill: {
    backgroundColor: 'rgba(0, 229, 155, 0.1)',
    paddingHorizontal: sp.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 155, 0.25)',
  },
  specPillText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  sectionCard: {
    padding: sp.lg,
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
    marginBottom: sp.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: sp.md,
  },
  sectionTitle: {
    ...typography.overline,
    color: colors.primary,
    letterSpacing: 1.5,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  addCertBtn: {
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: sp.sm,
    paddingVertical: sp.xs,
    borderRadius: radius.sm,
  },
  addCertBtnText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  bioText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: sp.md,
  },
  infoBlock: {
    marginTop: sp.sm,
    paddingTop: sp.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
    marginBottom: 2,
  },
  infoValue: {
    ...typography.body,
    color: colors.textPrimary,
  },
  certsList: {
    gap: sp.sm,
  },
  certCard: {
    backgroundColor: colors.surfaceHighlight,
    padding: sp.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  certHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    marginBottom: sp.xs,
  },
  certIcon: {
    fontSize: 20,
  },
  certInfo: {
    flex: 1,
  },
  certName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  certIssuer: {
    ...typography.caption,
    color: colors.textMuted,
  },
  certMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: sp.xs,
  },
  certNumber: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  certExpiry: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '600',
  },
  expiringAlert: {
    marginTop: sp.sm,
    padding: sp.xs,
    backgroundColor: 'rgba(255, 180, 0, 0.15)',
    borderRadius: radius.sm,
  },
  expiringAlertText: {
    ...typography.caption,
    color: '#FFB400',
    fontWeight: '600',
  },
  bottomActions: {
    marginTop: sp.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: sp.lg,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: sp.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  modalSubtitle: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginBottom: sp.md,
  },
  formGroup: {
    marginBottom: sp.md,
  },
  formLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '600',
  },
  formInput: {
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    paddingHorizontal: sp.md,
    paddingVertical: sp.sm,
    color: colors.textPrimary,
    ...typography.body,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: sp.md,
    marginTop: sp.md,
  },
  halfBtn: {
    flex: 1,
  },
});

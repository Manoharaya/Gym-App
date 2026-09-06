import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '../../../components/primitives/Text';
import { Input } from '../../../components/primitives/Input';
import { StepHeader } from '../components/StepHeader';
import { StepFooter } from '../components/StepFooter';
import { useOnboardingStore } from '../store/onboardingStore';
import { onboardingService } from '../services/onboardingService';
import { themeColors } from '../../../theme';

interface ProfileScreenProps {
  onNext: () => void;
  onBack: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onNext, onBack }) => {
  const { profileForm, setProfileField, isSubmitting, setSubmitting } = useOnboardingStore();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const genders = ['MALE', 'FEMALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY'];

  const handleSaveAndContinue = async () => {
    if (!profileForm.preferredName.trim()) {
      setErrorMsg('Preferred name is required');
      return;
    }
    if (!profileForm.emergencyContactName.trim() || !profileForm.emergencyContactPhone.trim()) {
      setErrorMsg('Emergency contact name and phone are required for club safety');
      return;
    }

    setErrorMsg(null);
    setSubmitting(true);

    try {
      await onboardingService.updateProfile({
        preferredName: profileForm.preferredName.trim(),
        dateOfBirth: profileForm.dateOfBirth,
        gender: profileForm.gender,
        emergencyContactName: profileForm.emergencyContactName.trim(),
        emergencyContactPhone: profileForm.emergencyContactPhone.trim(),
        emergencyContactRelationship: profileForm.emergencyContactRelationship.trim(),
      });
      await onboardingService.updateCurrentStep('PARQ');
      onNext();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save profile details');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    setSubmitting(true);
    try {
      await onboardingService.updateProfile({
        preferredName: profileForm.preferredName,
        emergencyContactName: profileForm.emergencyContactName,
        emergencyContactPhone: profileForm.emergencyContactPhone,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <StepHeader
          title="Personal Profile"
          subtitle="Tell us a bit about yourself and who we should contact in case of an emergency."
        />

        {errorMsg && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Basic Information</Text>
        <Input
          label="Preferred Name *"
          placeholder="e.g. Alex"
          value={profileForm.preferredName}
          onChangeText={(v) => setProfileField('preferredName', v)}
        />

        <Input
          label="Date of Birth (YYYY-MM-DD)"
          placeholder="1995-05-15"
          value={profileForm.dateOfBirth}
          onChangeText={(v) => setProfileField('dateOfBirth', v)}
        />

        <Text style={styles.fieldLabel}>Gender</Text>
        <View style={styles.genderRow}>
          {genders.map((g) => (
            <TouchableOpacity
              key={g}
              style={[
                styles.genderOption,
                profileForm.gender === g && styles.genderOptionSelected,
              ]}
              onPress={() => setProfileField('gender', g)}
            >
              <Text
                style={[
                  styles.genderText,
                  profileForm.gender === g && styles.genderTextSelected,
                ]}
              >
                {g.replace(/_/g, ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Emergency Contact</Text>
        <Input
          label="Contact Full Name *"
          placeholder="e.g. Sarah Mercer"
          value={profileForm.emergencyContactName}
          onChangeText={(v) => setProfileField('emergencyContactName', v)}
        />

        <Input
          label="Contact Phone Number *"
          placeholder="+61 400 123 456"
          keyboardType="phone-pad"
          value={profileForm.emergencyContactPhone}
          onChangeText={(v) => setProfileField('emergencyContactPhone', v)}
        />

        <Input
          label="Relationship"
          placeholder="e.g. Partner, Parent, Sibling"
          value={profileForm.emergencyContactRelationship}
          onChangeText={(v) => setProfileField('emergencyContactRelationship', v)}
        />
      </ScrollView>

      <StepFooter
        onBack={onBack}
        onNext={handleSaveAndContinue}
        onSaveDraft={handleSaveDraft}
        isSubmitting={isSubmitting}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  fieldLabel: {
    color: '#A3A3A3',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  genderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  genderOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333333',
  },
  genderOptionSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: themeColors.primary,
  },
  genderText: {
    color: '#A3A3A3',
    fontSize: 12,
    fontWeight: '600',
  },
  genderTextSelected: {
    color: '#FFFFFF',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '500',
  },
});

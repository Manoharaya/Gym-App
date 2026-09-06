import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from '../../../components/primitives/Text';
import { Button } from '../../../components/primitives/Button';
import { StepHeader } from '../components/StepHeader';
import { StepFooter } from '../components/StepFooter';
import { themeColors } from '../../../theme';

interface DocumentUploadScreenProps {
  onNext: () => void;
  onBack: () => void;
}

export const DocumentUploadScreen: React.FC<DocumentUploadScreenProps> = ({
  onNext,
  onBack,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedDocName, setUploadedDocName] = useState<string | null>(null);

  const handleSimulateUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setUploadedDocName('medical_clearance_letter.pdf');
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <StepHeader
          title="Medical Clearance (Optional)"
          subtitle="If your doctor has provided an exercise clearance letter or physical therapy referral, you may upload it securely here."
        />

        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>
            🔒 Your documents are encrypted and stored in isolated tenant object storage. They are only accessible by authorized clinical staff.
          </Text>
        </View>

        <View style={styles.uploadArea}>
          <Text style={styles.uploadIcon}>📄</Text>
          <Text style={styles.uploadTitle}>
            {uploadedDocName ? 'Document Attached' : 'Attach Medical Clearance'}
          </Text>
          <Text style={styles.uploadSubtitle}>
            Supported formats: PDF, JPG, PNG (Max 15MB)
          </Text>

          {uploadedDocName ? (
            <View style={styles.successBadge}>
              <Text style={styles.successText}>✓ {uploadedDocName}</Text>
            </View>
          ) : (
            <Button
              title="Select File"
              variant="outline"
              onPress={handleSimulateUpload}
              loading={isUploading}
            />
          )}
        </View>
      </ScrollView>

      <StepFooter
        onBack={onBack}
        onNext={onNext}
        nextLabel={uploadedDocName ? 'Continue' : 'Skip & Continue'}
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
  noticeBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
    padding: 14,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: themeColors.primary,
  },
  noticeText: {
    color: '#93C5FD',
    fontSize: 13,
    lineHeight: 18,
  },
  uploadArea: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 12,
    borderStyle: 'dashed',
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIcon: {
    fontSize: 42,
    marginBottom: 12,
  },
  uploadTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  uploadSubtitle: {
    color: '#737373',
    fontSize: 13,
    marginBottom: 18,
    textAlign: 'center',
  },
  successBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  successText: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: '600',
  },
});

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text } from '../../../components/primitives/Text';
import { Card } from '../../../components/primitives/Card';
import { Badge } from '../../../components/primitives/Badge';

export const DataExportScreen: React.FC = () => {
  const [selectedFormat, setSelectedFormat] = useState<'JSON' | 'CSV' | 'PDF_SUMMARY'>('JSON');
  const [exportStatus, setExportStatus] = useState<'IDLE' | 'PROCESSING' | 'COMPLETED'>('IDLE');

  const handleRequestExport = () => {
    setExportStatus('PROCESSING');
    setTimeout(() => {
      setExportStatus('COMPLETED');
      Alert.alert(
        'Export Ready',
        'Your encrypted archive has been compiled. You can download it securely for the next 24 hours.',
      );
    }, 1200);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="h2" style={styles.title}>
        Export Your Data
      </Text>
      <Text variant="bodySmall" style={styles.subtitle}>
        Request a complete, machine-readable export of all information FitCore holds about you.
      </Text>

      <Card style={styles.card}>
        <Text variant="body" style={styles.sectionTitle}>
          Select Export Format
        </Text>
        <Text variant="caption" style={styles.sectionDesc}>
          JSON is the canonical complete format containing full nested exercise and biometric datasets.
        </Text>

        <View style={styles.formatRow}>
          {(['JSON', 'CSV', 'PDF_SUMMARY'] as const).map((fmt) => (
            <TouchableOpacity
              key={fmt}
              style={[
                styles.formatChip,
                selectedFormat === fmt && styles.formatChipSelected,
              ]}
              onPress={() => setSelectedFormat(fmt)}
            >
              <Text
                variant="caption"
                style={
                  selectedFormat === fmt
                    ? styles.formatTextSelected
                    : styles.formatText
                }
              >
                {fmt === 'PDF_SUMMARY' ? 'PDF Summary' : fmt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.securityNote}>
          <Text variant="caption" style={styles.securityTitle}>
            🔒 End-to-End Encryption
          </Text>
          <Text variant="caption" style={styles.securityDesc}>
            All generated archives are encrypted with AES-256-GCM. Download links are single-use, session-bound, and expire automatically after 24 hours.
          </Text>
        </View>

        {exportStatus === 'COMPLETED' ? (
          <View style={styles.completedBox}>
            <View style={styles.rowBetween}>
              <Text variant="body" style={styles.archiveName}>
                FitCore_Data_Archive_{selectedFormat.toLowerCase()}.zip
              </Text>
              <Badge variant="success" label="Available" />
            </View>
            <Text variant="caption" style={styles.archiveMeta}>
              Size: 428 KB • Expires in 23h 58m
            </Text>

            <TouchableOpacity
              style={styles.downloadBtn}
              onPress={() => Alert.alert('Downloading Archive', 'Secure artifact streaming initiated.')}
            >
              <Text variant="bodySmall" style={styles.downloadText}>
                Download Encrypted File
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.requestBtn}
            disabled={exportStatus === 'PROCESSING'}
            onPress={handleRequestExport}
          >
            <Text variant="bodySmall" style={styles.requestText}>
              {exportStatus === 'PROCESSING' ? 'Compiling Archive...' : 'Request Data Export'}
            </Text>
          </TouchableOpacity>
        )}
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    color: '#94A3B8',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionDesc: {
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 16,
  },
  formatRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  formatChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  formatChipSelected: {
    backgroundColor: '#0284C7',
  },
  formatText: {
    color: '#CBD5E1',
    fontWeight: '500',
  },
  formatTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  securityNote: {
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  securityTitle: {
    color: '#38BDF8',
    fontWeight: '600',
    marginBottom: 4,
  },
  securityDesc: {
    color: '#94A3B8',
    lineHeight: 16,
  },
  requestBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  requestText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  completedBox: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 16,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  archiveName: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  archiveMeta: {
    color: '#64748B',
    marginBottom: 12,
  },
  downloadBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  downloadText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text } from '../../../components/primitives/Text';
import { Card } from '../../../components/primitives/Card';

export interface RecoveryCodesProps {
  navigation?: any;
}

export const RecoveryCodesScreen: React.FC<RecoveryCodesProps> = () => {
  const [codes] = useState<string[]>([
    'A1B2-C3D4',
    'E5F6-G7H8',
    'J9K0-L1M2',
    'N3P4-Q5R6',
    'S7T8-U9V0',
    'W1X2-Y3Z4',
    'B5C6-D7E8',
    'F9G0-H1J2',
    'K3L4-M5N6',
    'P7Q8-R9S0',
  ]);

  const handleRegenerate = () => {
    Alert.alert(
      'Regenerate Recovery Codes',
      'Generating new codes will immediately invalidate all existing recovery codes. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: () => {
            // In real app, call /api/v1/security/mfa/recovery-codes/regenerate with step-up token
            Alert.alert('Codes Regenerated', 'Your new emergency recovery codes have been issued.');
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="h2" style={styles.title}>
        Emergency Recovery Codes
      </Text>
      <Text variant="bodySmall" style={styles.subtitle}>
        Keep these codes in a safe place. If you lose access to your authenticator app, each code can be used once to regain access.
      </Text>

      <View style={styles.alertBox}>
        <Text style={styles.alertText}>
          ⚠️ Treat these codes like your password. Never share them with anyone, including FitCore support.
        </Text>
      </View>

      <Card style={styles.card}>
        <View style={styles.codesGrid}>
          {codes.map((code, index) => (
            <View key={index} style={styles.codeItem}>
              <Text style={styles.codeIndex}>{index + 1}.</Text>
              <Text style={styles.codeValue}>{code}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.regenerateBtn} onPress={handleRegenerate}>
          <Text style={styles.regenerateText}>Regenerate New Codes</Text>
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F19' },
  content: { padding: 20, paddingBottom: 40 },
  title: { color: '#FFFFFF', fontWeight: 'bold', marginBottom: 6 },
  subtitle: { color: '#94A3B8', marginBottom: 16 },
  alertBox: {
    backgroundColor: '#7F1D1D22',
    borderColor: '#991B1B',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  alertText: { color: '#FCA5A5', fontSize: 13, lineHeight: 18 },
  card: { backgroundColor: '#1E293B', borderRadius: 12, padding: 18 },
  codesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  codeItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  codeIndex: { color: '#64748B', width: 22, fontSize: 12 },
  codeValue: { color: '#38BDF8', fontFamily: 'monospace', fontWeight: 'bold', fontSize: 14 },
  regenerateBtn: {
    backgroundColor: '#334155',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  regenerateText: { color: '#F87171', fontWeight: '600', fontSize: 15 },
});

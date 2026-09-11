import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Text } from '../../../components/primitives/Text';
import { Card } from '../../../components/primitives/Card';

export interface MfaSetupProps {
  navigation: any;
}

export const MfaSetupScreen: React.FC<MfaSetupProps> = ({ navigation }) => {
  const [step, setStep] = useState<'INSTRUCTIONS' | 'VERIFY'>('INSTRUCTIONS');
  const [manualKey] = useState('JBSWY3DPEHPK3PXP');
  const [verifyCode, setVerifyCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = () => {
    if (verifyCode.trim().length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a 6-digit verification code.');
      return;
    }

    setLoading(true);
    // Simulate verification call to /api/v1/security/mfa/verify
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Success', 'Two-factor authentication has been enabled on your account!', [
        { text: 'View Recovery Codes', onPress: () => navigation.navigate('RecoveryCodes') },
      ]);
    }, 600);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="h2" style={styles.title}>
        Set Up Authenticator
      </Text>
      <Text variant="bodySmall" style={styles.subtitle}>
        Use an authenticator app such as Google Authenticator, Authy, or 1Password.
      </Text>

      {step === 'INSTRUCTIONS' ? (
        <Card style={styles.card}>
          <Text variant="body" style={styles.sectionHeader}>
            Step 1: Add Key to App
          </Text>
          <Text variant="bodySmall" style={styles.text}>
            Open your authenticator app and choose 'Enter a setup key manually'.
          </Text>

          <View style={styles.secretBox}>
            <Text style={styles.secretText}>{manualKey}</Text>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('VERIFY')}>
            <Text style={styles.btnText}>Next: Verify Code</Text>
          </TouchableOpacity>
        </Card>
      ) : (
        <Card style={styles.card}>
          <Text variant="body" style={styles.sectionHeader}>
            Step 2: Enter 6-Digit Code
          </Text>
          <Text variant="bodySmall" style={styles.text}>
            Enter the 6-digit code displayed in your authenticator app.
          </Text>

          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor="#64748B"
            value={verifyCode}
            onChangeText={setVerifyCode}
          />

          <TouchableOpacity
            style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
            onPress={handleVerify}
            disabled={loading}
          >
            <Text style={styles.btnText}>{loading ? 'Verifying...' : 'Activate Two-Factor'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkBtn} onPress={() => setStep('INSTRUCTIONS')}>
            <Text style={styles.linkText}>Back to Setup Key</Text>
          </TouchableOpacity>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F19' },
  content: { padding: 20, paddingBottom: 40 },
  title: { color: '#FFFFFF', fontWeight: 'bold', marginBottom: 6 },
  subtitle: { color: '#94A3B8', marginBottom: 20 },
  card: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16 },
  sectionHeader: { color: '#FFFFFF', fontWeight: '600', marginBottom: 8 },
  text: { color: '#94A3B8', marginBottom: 16 },
  secretBox: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  secretText: { color: '#38BDF8', fontSize: 18, letterSpacing: 2, fontFamily: 'monospace' },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#FFFFFF',
    fontSize: 28,
    textAlign: 'center',
    letterSpacing: 6,
    paddingVertical: 14,
    marginBottom: 20,
  },
  primaryBtn: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
  linkBtn: { marginTop: 14, alignItems: 'center' },
  linkText: { color: '#94A3B8', textDecorationLine: 'underline' },
});

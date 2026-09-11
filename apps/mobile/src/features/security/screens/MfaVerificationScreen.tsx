import React, { useState } from 'react';
import { StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Text } from '../../../components/primitives/Text';
import { Card } from '../../../components/primitives/Card';

export interface MfaVerificationProps {
  route?: {
    params?: {
      challengeToken?: string;
      onSuccess?: () => void;
      action?: string;
    };
  };
  navigation: any;
}

export const MfaVerificationScreen: React.FC<MfaVerificationProps> = ({ route, navigation }) => {
  const [code, setCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleVerify = () => {
    const trimmed = code.trim();
    if (!useRecoveryCode && trimmed.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a 6-digit authenticator code.');
      return;
    }
    if (useRecoveryCode && trimmed.length < 8) {
      Alert.alert('Invalid Code', 'Please enter a valid backup recovery code.');
      return;
    }

    setLoading(true);
    // Call verification
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Verified', 'Verification successful.', [
        {
          text: 'Continue',
          onPress: () => {
            if (route?.params?.onSuccess) {
              route.params.onSuccess();
            } else {
              navigation.goBack();
            }
          },
        },
      ]);
    }, 600);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="h2" style={styles.title}>
        Two-Factor Challenge
      </Text>
      <Text variant="bodySmall" style={styles.subtitle}>
        {useRecoveryCode
          ? 'Enter one of your 8-character single-use recovery codes.'
          : 'Enter the 6-digit code from your authenticator app to confirm your identity.'}
      </Text>

      <Card style={styles.card}>
        <TextInput
          style={styles.input}
          keyboardType={useRecoveryCode ? 'default' : 'number-pad'}
          maxLength={useRecoveryCode ? 10 : 6}
          autoCapitalize="characters"
          placeholder={useRecoveryCode ? 'XXXX-XXXX' : '000000'}
          placeholderTextColor="#64748B"
          value={code}
          onChangeText={setCode}
        />

        <TouchableOpacity
          style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
          onPress={handleVerify}
          disabled={loading}
        >
          <Text style={styles.btnText}>{loading ? 'Verifying...' : 'Verify & Continue'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkBtn}
          onPress={() => {
            setUseRecoveryCode(!useRecoveryCode);
            setCode('');
          }}
        >
          <Text style={styles.linkText}>
            {useRecoveryCode ? 'Use 6-Digit Authenticator App' : 'Lost device? Use a Recovery Code'}
          </Text>
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F19' },
  content: { padding: 20, paddingBottom: 40 },
  title: { color: '#FFFFFF', fontWeight: 'bold', marginBottom: 6 },
  subtitle: { color: '#94A3B8', marginBottom: 20 },
  card: { backgroundColor: '#1E293B', borderRadius: 12, padding: 20 },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#FFFFFF',
    fontSize: 26,
    textAlign: 'center',
    letterSpacing: 4,
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
  linkBtn: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#38BDF8', fontSize: 14 },
});

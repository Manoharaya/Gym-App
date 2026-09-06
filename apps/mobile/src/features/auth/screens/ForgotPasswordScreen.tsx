import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../../navigation/types';
import { Screen, Card, Input, Button, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

export const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setIsSubmitted(true);
    }, 800);
  };

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <View style={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Reset Credentials</Text>
          <Text style={styles.subtitle}>
            Enter your registered email address to receive password recovery instructions.
          </Text>
        </View>

        <Card style={styles.card}>
          {isSubmitted ? (
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Icon name="check-circle" size={28} color={themeColors.success} />
              </View>
              <Text style={styles.successTitle}>Recovery Instructions Sent</Text>
              <Text style={styles.successText}>
                We've sent a secure reset link to <Text style={styles.boldEmail}>{email}</Text>. Please
                check your inbox and spam folder.
              </Text>
              <Button
                title="Return to Sign In"
                onPress={() => navigation.navigate('Login')}
                variant="accent"
                style={styles.returnButton}
              />
            </View>
          ) : (
            <View style={styles.form}>
              <Input
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="you@domain.com"
              />

              <Button
                title={loading ? 'Sending...' : 'Send Recovery Link'}
                onPress={handleSubmit}
                variant="accent"
                loading={loading}
                disabled={!email}
              />
            </View>
          )}
        </Card>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing[4],
    flex: 1,
    gap: spacing[4],
  },
  backButton: {
    padding: spacing[2],
    alignSelf: 'flex-start',
    marginLeft: -spacing[2],
  },
  header: {
    gap: spacing[1],
  },
  title: {
    ...typography.h1,
    color: themeColors.textPrimary,
    fontWeight: '800',
  },
  subtitle: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    lineHeight: 20,
  },
  card: {
    padding: spacing[5],
  },
  form: {
    gap: spacing[4],
  },
  successContainer: {
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: themeColors.successBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  successText: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  boldEmail: {
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  returnButton: {
    width: '100%',
    marginTop: spacing[2],
  },
});

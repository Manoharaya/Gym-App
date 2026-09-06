import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { themeColors } from '../../../theme';
import { useDynamicQR, useAccessStatus } from '../hooks/useAccess';
import { DynamicQRCode } from '../components/DynamicQRCode';

export const QRCodeScreen: React.FC = () => {
  const { data: accessStatus } = useAccessStatus();
  const {
    token,
    displayIdentifier,
    secondsRemaining,
    refetch,
    isFetching,
  } = useDynamicQR();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Facility Entry Pass</Text>
        <Text style={styles.outletName}>
          {accessStatus?.currentOutlet?.name || 'Second Wind Athletic Club'}
        </Text>
      </View>

      {/* Full-size QR component */}
      <DynamicQRCode
        token={token}
        displayIdentifier={displayIdentifier}
        secondsRemaining={secondsRemaining}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
      />

      {/* Hardware Scanner Usage Tips */}
      <View style={styles.instructionsBox}>
        <Text style={styles.instructionsTitle}>Turnstile Scanner Tips</Text>
        <Text style={styles.instructionItem}>
          • Hold your screen facing the glass scanner window at about 10–15 cm.
        </Text>
        <Text style={styles.instructionItem}>
          • Ensure screen brightness is turned up for optical recognition.
        </Text>
        <Text style={styles.instructionItem}>
          • The token rotates automatically every 60 seconds for security.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0C10',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginVertical: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  outletName: {
    color: '#E63946',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  instructionsBox: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: 14,
    padding: 16,
    width: '100%',
    marginTop: 10,
    borderWidth: 1,
    borderColor: themeColors.inputBorder,
  },
  instructionsTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  instructionItem: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
});

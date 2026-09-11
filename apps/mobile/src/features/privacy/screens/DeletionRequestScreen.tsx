import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text } from '../../../components/primitives/Text';
import { Card } from '../../../components/primitives/Card';

export const DeletionRequestScreen: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);

  const handleInitiateDeletion = () => {
    Alert.alert(
      'Permanent Account Deletion',
      'This action cannot be undone. Your profile will be permanently anonymized, workouts and biometric telemetry deleted, and gym facility access revoked.\n\nStatutory financial records will be retained for 7 years as required by tax law.\n\nProceed to identity verification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Verify & Delete',
          style: 'destructive',
          onPress: () => {
            setSubmitted(true);
            Alert.alert(
              'Identity Verification Required',
              'A step-up authentication challenge has been issued to verify your identity before processing deletion.',
            );
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="h2" style={styles.title}>
        Delete Account & Data
      </Text>
      <Text variant="bodySmall" style={styles.subtitle}>
        Understand what is deleted and what must be retained by law before closing your account.
      </Text>

      <Card style={styles.card}>
        <Text variant="body" style={styles.sectionTitle}>
          Data Impact Breakdown
        </Text>

        <View style={styles.itemRow}>
          <Text style={styles.icon}>🗑️</Text>
          <View style={styles.textCol}>
            <Text variant="bodySmall" style={styles.itemTitle}>
              Permanently Deleted
            </Text>
            <Text variant="caption" style={styles.itemDesc}>
              Workout logs, nutrition logs, wearable biometrics, AI coaching history, and personal photos.
            </Text>
          </View>
        </View>

        <View style={styles.itemRow}>
          <Text style={styles.icon}>👤</Text>
          <View style={styles.textCol}>
            <Text variant="bodySmall" style={styles.itemTitle}>
              Irreversibly Anonymized
            </Text>
            <Text variant="caption" style={styles.itemDesc}>
              Name, email, phone number, and emergency contacts replaced with cryptographic pseudonyms.
            </Text>
          </View>
        </View>

        <View style={styles.itemRow}>
          <Text style={styles.icon}>⚖️</Text>
          <View style={styles.textCol}>
            <Text variant="bodySmall" style={styles.itemTitle}>
              Legally Retained Records
            </Text>
            <Text variant="caption" style={styles.itemDesc}>
              Invoices, payment receipts, and tax records are retained for 7 years per statutory taxation requirements.
            </Text>
          </View>
        </View>

        {submitted ? (
          <View style={styles.pendingBox}>
            <Text variant="bodySmall" style={styles.pendingTitle}>
              ⏳ Verification Pending
            </Text>
            <Text variant="caption" style={styles.pendingDesc}>
              Please enter your step-up authentication code or password to authorize deletion execution.
            </Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.deleteBtn} onPress={handleInitiateDeletion}>
            <Text variant="bodySmall" style={styles.deleteText}>
              Request Account Deletion
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
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  icon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  textCol: {
    flex: 1,
  },
  itemTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 2,
  },
  itemDesc: {
    color: '#94A3B8',
    lineHeight: 16,
  },
  deleteBtn: {
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  deleteText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  pendingBox: {
    backgroundColor: '#451A1A',
    borderWidth: 1,
    borderColor: '#EF4444',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  pendingTitle: {
    color: '#F87171',
    fontWeight: '600',
    marginBottom: 4,
  },
  pendingDesc: {
    color: '#FCA5A5',
    lineHeight: 16,
  },
});

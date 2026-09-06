import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { themeColors } from '../../../theme';
import { useAccessStatus, useCheckInMutation } from '../hooks/useAccess';

export const CheckInScreen: React.FC = () => {
  const { data: accessStatus, isLoading: statusLoading } = useAccessStatus();
  const checkInMutation = useCheckInMutation();

  const [selectedOutletId, setSelectedOutletId] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<{
    allowed: boolean;
    title: string;
    details?: string;
  } | null>(null);

  const outlets = accessStatus?.authorizedOutlets || [];
  const activeOutletId = selectedOutletId || outlets[0]?.id;

  const handlePerformCheckIn = async () => {
    if (!activeOutletId) return;

    setResultMessage(null);
    try {
      const response = await checkInMutation.mutateAsync({
        outletId: activeOutletId,
        method: 'MOBILE',
      });

      if (response.allowed) {
        setResultMessage({
          allowed: true,
          title: 'Access Granted! Welcome to Second Wind.',
          details: 'Your session has been logged and the turnstile is unlocked.',
        });
      } else {
        setResultMessage({
          allowed: false,
          title: 'Access Denied',
          details:
            response.decision?.details ||
            response.decision?.reason ||
            'Your membership does not permit entry at this time.',
        });
      }
    } catch (err: any) {
      setResultMessage({
        allowed: false,
        title: 'Check-In Error',
        details: err?.message || 'Unable to communicate with physical access controller.',
      });
    }
  };

  if (statusLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#E63946" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Mobile Facility Check-In</Text>
        <Text style={styles.subtitle}>
          Select a facility to scan or register your workout entry
        </Text>
      </View>

      {/* Outlet Selection */}
      <Text style={styles.sectionHeader}>AUTHORIZED FACILITIES</Text>
      {outlets.length > 0 ? (
        outlets.map((outlet) => {
          const isSelected = (selectedOutletId || outlets[0]?.id) === outlet.id;
          return (
            <TouchableOpacity
              key={outlet.id}
              style={[styles.outletCard, isSelected && styles.outletCardSelected]}
              onPress={() => {
                setSelectedOutletId(outlet.id);
                setResultMessage(null);
              }}
              activeOpacity={0.8}
            >
              <View>
                <Text style={[styles.outletName, isSelected && styles.outletNameSelected]}>
                  {outlet.name}
                </Text>
                <Text style={styles.outletCode}>Outlet Code: {outlet.code}</Text>
              </View>
              <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                {isSelected && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          );
        })
      ) : (
        <View style={styles.noOutletsBox}>
          <Text style={styles.noOutletsText}>
            No facility outlets currently authorized on your membership.
          </Text>
        </View>
      )}

      {/* Result Feedback Banner */}
      {resultMessage && (
        <View
          style={[
            styles.feedbackBanner,
            resultMessage.allowed ? styles.feedbackAllowed : styles.feedbackDenied,
          ]}
        >
          <Text
            style={[
              styles.feedbackTitle,
              resultMessage.allowed ? styles.feedbackTitleAllowed : styles.feedbackTitleDenied,
            ]}
          >
            {resultMessage.title}
          </Text>
          {resultMessage.details && (
            <Text style={styles.feedbackDetails}>{resultMessage.details}</Text>
          )}
        </View>
      )}

      {/* Check-In Action Button */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          (!activeOutletId || checkInMutation.isPending) && styles.submitButtonDisabled,
        ]}
        onPress={handlePerformCheckIn}
        disabled={!activeOutletId || checkInMutation.isPending}
        activeOpacity={0.8}
      >
        {checkInMutation.isPending ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.submitButtonText}>Confirm Entry Check-In</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  content: {
    padding: 20,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 4,
  },
  sectionHeader: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  outletCard: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
    borderWidth: 1,
    borderColor: themeColors.inputBorder,
  },
  outletCardSelected: {
    borderColor: '#E63946',
    backgroundColor: 'rgba(230, 57, 70, 0.08)',
  },
  outletName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  outletNameSelected: {
    color: '#FF4D5E',
  },
  outletCode: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#4B5563',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: '#E63946',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E63946',
  },
  noOutletsBox: {
    backgroundColor: themeColors.cardBackground,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  noOutletsText: {
    color: '#EF4444',
    fontSize: 13,
  },
  feedbackBanner: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
  },
  feedbackAllowed: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
  },
  feedbackDenied: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
  },
  feedbackTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  feedbackTitleAllowed: {
    color: '#10B981',
  },
  feedbackTitleDenied: {
    color: '#EF4444',
  },
  feedbackDetails: {
    color: '#D1D5DB',
    fontSize: 13,
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: '#E63946',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

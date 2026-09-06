import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAddPaymentMethod } from '../hooks';
import { useAuthStore } from '../../../store/authStore';

interface AddPaymentMethodScreenProps {
  navigation: any;
}

export const AddPaymentMethodScreen: React.FC<AddPaymentMethodScreenProps> = ({
  navigation,
}) => {
  const userId = useAuthStore((s) => s.userId);
  const addMethodMutation = useAddPaymentMethod();

  const [cardType, setCardType] = useState<'VISA' | 'MASTERCARD' | 'AMEX'>('VISA');
  const [cardHolder, setCardHolder] = useState('Second Wind Member');
  const [last4, setLast4] = useState('4242');
  const [expiryMonth, setExpiryMonth] = useState('12');
  const [expiryYear, setExpiryYear] = useState('2028');
  const [isDefault, setIsDefault] = useState(true);

  const handleSave = async () => {
    if (!last4 || last4.length !== 4) {
      Alert.alert('Invalid Card', 'Please enter a valid 4-digit card ending.');
      return;
    }

    try {
      // In production, Stripe SDK or gateway tokenizes the PAN directly on device.
      // FitCore backend receives only the secure gateway token and public card descriptors.
      const mockToken = `tok_mock_${cardType.toLowerCase()}_${last4}_${Date.now()}`;

      await addMethodMutation.mutateAsync({
        memberProfileId: userId || '',
        type: 'CARD',
        provider: 'MOCK',
        providerPaymentMethodId: mockToken,
        brand: cardType,
        last4,
        expiryMonth: parseInt(expiryMonth, 10),
        expiryYear: parseInt(expiryYear, 10),
        isDefault,
      });

      Alert.alert('Payment Method Added', 'Your card has been tokenized and saved securely.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Failed to Save Card', err.message || 'Unable to register card.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Add Payment Method</Text>
        <Text style={styles.subtitle}>
          Cards are tokenized via end-to-end encryption. Sensitive numbers are never stored on FitCore servers.
        </Text>
      </View>

      {/* Card Type Selector */}
      <Text style={styles.fieldLabel}>CARD TYPE</Text>
      <View style={styles.typeRow}>
        {(['VISA', 'MASTERCARD', 'AMEX'] as const).map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.typeBtn, cardType === type && styles.activeTypeBtn]}
            onPress={() => setCardType(type)}
          >
            <Text style={[styles.typeBtnText, cardType === type && styles.activeTypeBtnText]}>
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Cardholder Name */}
      <Text style={styles.fieldLabel}>CARDHOLDER NAME</Text>
      <TextInput
        style={styles.input}
        value={cardHolder}
        onChangeText={setCardHolder}
        placeholder="Full Name"
        placeholderTextColor="#64748B"
      />

      {/* Card Preview Details */}
      <View style={styles.row}>
        <View style={styles.flex2}>
          <Text style={styles.fieldLabel}>LAST 4 DIGITS</Text>
          <TextInput
            style={styles.input}
            value={last4}
            onChangeText={setLast4}
            keyboardType="numeric"
            maxLength={4}
            placeholder="4242"
            placeholderTextColor="#64748B"
          />
        </View>

        <View style={styles.flex1}>
          <Text style={styles.fieldLabel}>MONTH</Text>
          <TextInput
            style={styles.input}
            value={expiryMonth}
            onChangeText={setExpiryMonth}
            keyboardType="numeric"
            maxLength={2}
            placeholder="12"
            placeholderTextColor="#64748B"
          />
        </View>

        <View style={styles.flex1}>
          <Text style={styles.fieldLabel}>YEAR</Text>
          <TextInput
            style={styles.input}
            value={expiryYear}
            onChangeText={setExpiryYear}
            keyboardType="numeric"
            maxLength={4}
            placeholder="2028"
            placeholderTextColor="#64748B"
          />
        </View>
      </View>

      {/* Default Checkbox */}
      <TouchableOpacity
        style={styles.defaultCheckboxRow}
        onPress={() => setIsDefault(!isDefault)}
      >
        <View style={[styles.checkbox, isDefault && styles.checkboxChecked]}>
          {isDefault && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.defaultLabel}>Set as default payment method</Text>
      </TouchableOpacity>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveBtn, addMethodMutation.isPending && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={addMethodMutation.isPending}
      >
        {addMethodMutation.isPending ? (
          <ActivityIndicator color="#0F172A" />
        ) : (
          <Text style={styles.saveBtnText}>Tokenize & Save Card</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  fieldLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 14,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  typeBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  activeTypeBtn: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  typeBtnText: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 13,
  },
  activeTypeBtnText: {
    color: '#0F172A',
  },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  flex2: {
    flex: 2,
  },
  flex1: {
    flex: 1,
  },
  defaultCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#64748B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  checkmark: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 13,
  },
  defaultLabel: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '500',
  },
  saveBtn: {
    backgroundColor: '#38BDF8',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
  },
});

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  usePaymentMethods,
  useSetDefaultPaymentMethod,
  useRemovePaymentMethod,
} from '../hooks';
import { PaymentMethodCard } from '../components';

interface PaymentMethodsScreenProps {
  navigation: any;
}

export const PaymentMethodsScreen: React.FC<PaymentMethodsScreenProps> = ({
  navigation,
}) => {
  const { data: methods, isLoading, refetch } = usePaymentMethods();
  const setDefaultMutation = useSetDefaultPaymentMethod();
  const removeMutation = useRemovePaymentMethod();

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultMutation.mutateAsync(id);
      refetch();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update default card');
    }
  };

  const handleRemove = (id: string) => {
    Alert.alert(
      'Remove Payment Method',
      'Are you sure you want to remove this payment method from your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMutation.mutateAsync(id);
              refetch();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to remove card');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Loading payment methods...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved Payment Methods</Text>
        <Text style={styles.headerSubtitle}>
          Securely tokenized payment instruments for recurring dues and purchases.
        </Text>
      </View>

      {!methods || methods.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Payment Methods Saved</Text>
          <Text style={styles.emptySubtext}>
            Add a card to enable automatic subscription renewals and instant payments.
          </Text>
        </View>
      ) : (
        methods.map((method) => (
          <PaymentMethodCard
            key={method.id}
            method={method}
            showActions={true}
            onSetDefault={() => handleSetDefault(method.id)}
            onRemove={() => handleRemove(method.id)}
          />
        ))
      )}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddPaymentMethod')}
      >
        <Text style={styles.addButtonText}>+ Add New Payment Method</Text>
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
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 20,
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    paddingHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtext: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  addButton: {
    backgroundColor: '#38BDF8',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  addButtonText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
});

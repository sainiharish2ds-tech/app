import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTransactionStore } from '../store/transactionStore';

export default function CreateFinancialScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const partyId = params.partyId as string;
  
  const { createFinancialTransaction } = useTransactionStore();
  
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState<'payment' | 'receipt'>('payment');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      await createFinancialTransaction({
        party_id: partyId,
        amount: parseFloat(amount),
        payment_type: paymentType,
        payment_method: paymentMethod,
        description: description.trim(),
      });
      Alert.alert('Success', 'Financial transaction created successfully');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Transaction Type *</Text>
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  paymentType === 'payment' && styles.toggleButtonActive,
                ]}
                onPress={() => setPaymentType('payment')}
              >
                <Text
                  style={[
                    styles.toggleText,
                    paymentType === 'payment' && styles.toggleTextActive,
                  ]}
                >
                  Payment (Out)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  paymentType === 'receipt' && styles.toggleButtonActive,
                ]}
                onPress={() => setPaymentType('receipt')}
              >
                <Text
                  style={[
                    styles.toggleText,
                    paymentType === 'receipt' && styles.toggleTextActive,
                  ]}
                >
                  Receipt (In)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Amount *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Payment Method</Text>
            <View style={styles.methodContainer}>
              <TouchableOpacity
                style={[
                  styles.methodButton,
                  paymentMethod === 'cash' && styles.methodButtonActive,
                ]}
                onPress={() => setPaymentMethod('cash')}
              >
                <Text
                  style={[
                    styles.methodText,
                    paymentMethod === 'cash' && styles.methodTextActive,
                  ]}
                >
                  Cash
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.methodButton,
                  paymentMethod === 'card' && styles.methodButtonActive,
                ]}
                onPress={() => setPaymentMethod('card')}
              >
                <Text
                  style={[
                    styles.methodText,
                    paymentMethod === 'card' && styles.methodTextActive,
                  ]}
                >
                  Card
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.methodButton,
                  paymentMethod === 'upi' && styles.methodButtonActive,
                ]}
                onPress={() => setPaymentMethod('upi')}
              >
                <Text
                  style={[
                    styles.methodText,
                    paymentMethod === 'upi' && styles.methodTextActive,
                  ]}
                >
                  UPI
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.methodButton,
                  paymentMethod === 'bank' && styles.methodButtonActive,
                ]}
                onPress={() => setPaymentMethod('bank')}
              >
                <Text
                  style={[
                    styles.methodText,
                    paymentMethod === 'bank' && styles.methodTextActive,
                  ]}
                >
                  Bank
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter description (optional)"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              placeholderTextColor="#999"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCreate}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating...' : 'Create Transaction'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    flexGrow: 1,
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#007AFF',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  toggleTextActive: {
    color: '#FFF',
  },
  methodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  methodButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  methodButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  methodText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  methodTextActive: {
    color: '#FFF',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

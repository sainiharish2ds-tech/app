import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePartyStore } from '../../store/partyStore';

export default function PartiesScreen() {
  const router = useRouter();
  const { parties, loading, fetchParties } = usePartyStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadParties();
  }, []);

  const loadParties = async () => {
    await fetchParties();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadParties();
    setRefreshing(false);
  };

  const renderParty = ({ item }: any) => (
    <TouchableOpacity
      style={styles.partyCard}
      onPress={() => router.push(`/party-detail?id=${item.id}`)}
    >
      <View style={styles.partyIconContainer}>
        <Ionicons name="person" size={32} color="#007AFF" />
      </View>
      <View style={styles.partyInfo}>
        <Text style={styles.partyName}>{item.name}</Text>
        {item.contact && <Text style={styles.partyContact}>{item.contact}</Text>}
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Balance: </Text>
          <Text
            style={[
              styles.balanceAmount,
              item.balance >= 0 ? styles.positiveBalance : styles.negativeBalance,
            ]}
          >
            ₹{Math.abs(item.balance).toFixed(2)}
          </Text>
          <Text style={styles.balanceType}>
            {item.balance >= 0 ? ' (To Receive)' : ' (To Pay)'}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#C7C7CC" />
    </TouchableOpacity>
  );

  if (loading && parties.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={parties}
        renderItem={renderParty}
        keyExtractor={(item) => item.id!}
        contentContainerStyle={styles.listContainer}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>No parties yet</Text>
            <Text style={styles.emptySubtext}>Create a party to get started</Text>
          </View>
        }
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/create-party')}
      >
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  partyCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  partyIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E3F2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  partyInfo: {
    flex: 1,
  },
  partyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  partyContact: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  positiveBalance: {
    color: '#34C759',
  },
  negativeBalance: {
    color: '#FF3B30',
  },
  balanceType: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { usePartyStore } from '../store/partyStore';
import { useOrderStore } from '../store/orderStore';
import { useTransactionStore } from '../store/transactionStore';

type TabType = 'orders' | 'material' | 'financial';

export default function PartyDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const partyId = params.id as string;
  
  const { getParty } = usePartyStore();
  const { orders, fetchOrders, updateOrder, reorderOrders } = useOrderStore();
  const { materialTransactions, financialTransactions, fetchMaterialTransactions, fetchFinancialTransactions } = useTransactionStore();
  
  const [party, setParty] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [orderTab, setOrderTab] = useState<'purchase' | 'sale'>('sale');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [partyId])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const partyData = await getParty(partyId);
      setParty(partyData);
      await Promise.all([
        fetchOrders(partyId),
        fetchMaterialTransactions(partyId),
        fetchFinancialTransactions(partyId),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleOrderStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await updateOrder(orderId, { status: newStatus });
      await loadData();
      Alert.alert('Success', `Order status updated to ${newStatus}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update order');
    }
  };

  const handleDragEnd = async ({ data }: any) => {
    const orderIds = data.map((order: any) => order.id);
    try {
      await reorderOrders(orderIds);
      await fetchOrders(partyId);
    } catch (error) {
      console.error('Error reordering:', error);
    }
  };

  const filteredOrders = orders.filter(
    (order) => order.order_type === orderTab && order.party_id === partyId
  );

  const activeOrders = filteredOrders.filter((o) => o.status === 'start' || o.status === 'inprocess');
  const completedOrders = filteredOrders.filter((o) => o.status === 'completed');

  const renderOrderItem = ({ item, drag, isActive }: RenderItemParams<any>) => {
    const isCompleted = item.status === 'completed';
    
    return (
      <View
        style={[
          styles.orderCard,
          isActive && styles.orderCardDragging,
          isCompleted && styles.orderCardCompleted,
        ]}
      >
        <View style={styles.orderHeader}>
          {!isCompleted && (
            <TouchableOpacity onLongPress={drag} style={styles.dragHandle}>
              <Ionicons name="reorder-three" size={24} color="#666" />
            </TouchableOpacity>
          )}
          <View style={styles.orderHeaderInfo}>
            <View style={styles.orderStatusBadge}>
              <Text style={styles.orderStatusText}>{item.status.toUpperCase()}</Text>
            </View>
            <Text style={styles.orderType}>{item.order_type}</Text>
          </View>
        </View>

        <View style={styles.orderProducts}>
          {item.products.map((product: any, index: number) => (
            <Text key={index} style={styles.productText}>
              • {product.product_name} - Qty: {product.quantity} - ₹{product.price}
            </Text>
          ))}
        </View>

        <View style={styles.orderFooter}>
          <View style={styles.orderTotal}>
            <Text style={styles.orderTotalLabel}>Total:</Text>
            <Text style={styles.orderTotalAmount}>₹{item.total_price.toFixed(2)}</Text>
            <Text style={styles.orderWeight}>{item.total_weight} kg</Text>
          </View>

          {!isCompleted && (
            <View style={styles.orderActions}>
              {item.status === 'start' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.inprocessButton]}
                  onPress={() => handleOrderStatusChange(item.id, 'inprocess')}
                >
                  <Text style={styles.actionButtonText}>Start</Text>
                </TouchableOpacity>
              )}
              {item.status === 'inprocess' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.completeButton]}
                  onPress={() => handleOrderStatusChange(item.id, 'completed')}
                >
                  <Text style={styles.actionButtonText}>Complete</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderOrdersTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.orderTypeToggle}>
        <TouchableOpacity
          style={[styles.toggleButton, orderTab === 'purchase' && styles.toggleButtonActive]}
          onPress={() => setOrderTab('purchase')}
        >
          <Text style={[styles.toggleText, orderTab === 'purchase' && styles.toggleTextActive]}>
            Purchase Orders
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, orderTab === 'sale' && styles.toggleButtonActive]}
          onPress={() => setOrderTab('sale')}
        >
          <Text style={[styles.toggleText, orderTab === 'sale' && styles.toggleTextActive]}>
            Sale Orders
          </Text>
        </TouchableOpacity>
      </View>

      {activeOrders.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Orders (Drag to reorder)</Text>
          <DraggableFlatList
            data={activeOrders}
            renderItem={renderOrderItem}
            keyExtractor={(item) => item.id!}
            onDragEnd={handleDragEnd}
            scrollEnabled={false}
          />
        </View>
      )}

      {completedOrders.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Completed Orders</Text>
          {completedOrders.map((order) => (
            <View key={order.id}>
              {renderOrderItem({ item: order, drag: () => {}, isActive: false } as any)}
            </View>
          ))}
        </View>
      )}

      {filteredOrders.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color="#CCC" />
          <Text style={styles.emptyText}>No {orderTab} orders yet</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push(`/create-order?partyId=${partyId}&orderType=${orderTab}`)}
      >
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>
    </View>
  );

  const renderMaterialTab = () => (
    <ScrollView
      style={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {materialTransactions.length > 0 ? (
        materialTransactions.map((transaction) => (
          <View key={transaction.id} style={styles.transactionCard}>
            <View style={styles.transactionHeader}>
              <Ionicons
                name={transaction.order_type === 'sale' ? 'arrow-up-circle' : 'arrow-down-circle'}
                size={24}
                color={transaction.order_type === 'sale' ? '#34C759' : '#FF3B30'}
              />
              <Text style={styles.transactionType}>{transaction.order_type.toUpperCase()}</Text>
            </View>
            <Text style={styles.transactionDescription}>{transaction.description}</Text>
            <View style={styles.transactionFooter}>
              <Text
                style={[
                  styles.transactionAmount,
                  transaction.amount >= 0 ? styles.positiveAmount : styles.negativeAmount,
                ]}
              >
                ₹{Math.abs(transaction.amount).toFixed(2)}
              </Text>
              <Text style={styles.transactionDate}>
                {new Date(transaction.created_at!).toLocaleDateString()}
              </Text>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="swap-horizontal-outline" size={64} color="#CCC" />
          <Text style={styles.emptyText}>No material transactions</Text>
        </View>
      )}
    </ScrollView>
  );

  const renderFinancialTab = () => (
    <ScrollView
      style={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {financialTransactions.length > 0 ? (
        financialTransactions.map((transaction) => (
          <View key={transaction.id} style={styles.transactionCard}>
            <View style={styles.transactionHeader}>
              <Ionicons
                name={transaction.payment_type === 'receipt' ? 'cash' : 'card'}
                size={24}
                color={transaction.payment_type === 'receipt' ? '#34C759' : '#FF3B30'}
              />
              <Text style={styles.transactionType}>
                {transaction.payment_type.toUpperCase()} - {transaction.payment_method}
              </Text>
            </View>
            {transaction.description && (
              <Text style={styles.transactionDescription}>{transaction.description}</Text>
            )}
            <View style={styles.transactionFooter}>
              <Text
                style={[
                  styles.transactionAmount,
                  transaction.payment_type === 'receipt' ? styles.positiveAmount : styles.negativeAmount,
                ]}
              >
                ₹{transaction.amount.toFixed(2)}
              </Text>
              <Text style={styles.transactionDate}>
                {new Date(transaction.created_at!).toLocaleDateString()}
              </Text>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="wallet-outline" size={64} color="#CCC" />
          <Text style={styles.emptyText}>No financial transactions</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push(`/create-financial?partyId=${partyId}`)}
      >
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!party) {
    return (
      <View style={styles.centerContainer}>
        <Text>Party not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.partyInfo}>
        <Text style={styles.partyName}>{party.name}</Text>
        {party.contact && <Text style={styles.partyContact}>{party.contact}</Text>}
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Balance: </Text>
          <Text
            style={[
              styles.balanceAmount,
              party.balance >= 0 ? styles.positiveBalance : styles.negativeBalance,
            ]}
          >
            ₹{Math.abs(party.balance).toFixed(2)}
          </Text>
          <Text style={styles.balanceType}>
            {party.balance >= 0 ? ' (To Receive)' : ' (To Pay)'}
          </Text>
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'orders' && styles.tabActive]}
          onPress={() => setActiveTab('orders')}
        >
          <Text style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]}>
            Orders
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'material' && styles.tabActive]}
          onPress={() => setActiveTab('material')}
        >
          <Text style={[styles.tabText, activeTab === 'material' && styles.tabTextActive]}>
            Material
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'financial' && styles.tabActive]}
          onPress={() => setActiveTab('financial')}
        >
          <Text style={[styles.tabText, activeTab === 'financial' && styles.tabTextActive]}>
            Financial
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'orders' && renderOrdersTab()}
      {activeTab === 'material' && renderMaterialTab()}
      {activeTab === 'financial' && renderFinancialTab()}
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
  partyInfo: {
    backgroundColor: '#FFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  partyName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  partyContact: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 16,
    color: '#666',
  },
  balanceAmount: {
    fontSize: 20,
    fontWeight: '700',
  },
  positiveBalance: {
    color: '#34C759',
  },
  negativeBalance: {
    color: '#FF3B30',
  },
  balanceType: {
    fontSize: 14,
    color: '#999',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  tabTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  orderTypeToggle: {
    flexDirection: 'row',
    margin: 16,
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
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  orderCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderCardDragging: {
    opacity: 0.8,
    elevation: 8,
  },
  orderCardCompleted: {
    opacity: 0.7,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dragHandle: {
    marginRight: 8,
  },
  orderHeaderInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderStatusBadge: {
    backgroundColor: '#E3F2FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  orderStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  orderType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    textTransform: 'uppercase',
  },
  orderProducts: {
    marginBottom: 12,
  },
  productText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 12,
  },
  orderTotal: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderTotalLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  orderTotalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginRight: 8,
  },
  orderWeight: {
    fontSize: 14,
    color: '#666',
  },
  orderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  inprocessButton: {
    backgroundColor: '#FF9500',
  },
  completeButton: {
    backgroundColor: '#34C759',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  transactionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
  },
  transactionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  positiveAmount: {
    color: '#34C759',
  },
  negativeAmount: {
    color: '#FF3B30',
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
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

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProductStore } from '../store/productStore';
import { useOrderStore } from '../store/orderStore';

interface SelectedProduct {
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  weight: number;
}

export default function CreateOrderScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const partyId = params.partyId as string;
  const orderType = params.orderType as string;
  const referenceOrderId = params.referenceOrderId as string | undefined;
  
  const { products, fetchProducts } = useProductStore();
  const { createOrder } = useOrderStore();
  
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleProductSelect = (product: any) => {
    const existing = selectedProducts.find((p) => p.product_id === product.id);
    if (existing) {
      Alert.alert('Info', 'Product already added');
      return;
    }

    setSelectedProducts([
      ...selectedProducts,
      {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        price: product.price,
        weight: product.weight,
      },
    ]);
    setShowProductModal(false);
  };

  const handleQuantityChange = (productId: string, quantity: string) => {
    const qty = parseFloat(quantity) || 0;
    setSelectedProducts(
      selectedProducts.map((p) =>
        p.product_id === productId ? { ...p, quantity: qty } : p
      )
    );
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter((p) => p.product_id !== productId));
  };

  const calculateTotals = () => {
    const total_price = selectedProducts.reduce((sum, p) => sum + p.quantity * p.price, 0);
    const total_weight = selectedProducts.reduce((sum, p) => sum + p.quantity * p.weight, 0);
    return { total_price, total_weight };
  };

  const handleCreateOrder = async () => {
    if (selectedProducts.length === 0) {
      Alert.alert('Error', 'Please add at least one product');
      return;
    }

    if (selectedProducts.some((p) => p.quantity <= 0)) {
      Alert.alert('Error', 'All products must have quantity greater than 0');
      return;
    }

    setLoading(true);
    try {
      await createOrder({
        party_id: partyId,
        order_type: orderType,
        products: selectedProducts,
        reference_order_id: referenceOrderId,
      });
      Alert.alert('Success', 'Order created successfully');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const { total_price, total_weight } = calculateTotals();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{orderType === 'sale' ? 'Sale' : 'Purchase'} Order</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Products</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowProductModal(true)}
            >
              <Ionicons name="add-circle" size={24} color="#007AFF" />
              <Text style={styles.addButtonText}>Add Product</Text>
            </TouchableOpacity>
          </View>

          {selectedProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={48} color="#CCC" />
              <Text style={styles.emptyText}>No products added</Text>
            </View>
          ) : (
            selectedProducts.map((product) => (
              <View key={product.product_id} style={styles.productCard}>
                <View style={styles.productHeader}>
                  <Text style={styles.productName}>{product.product_name}</Text>
                  <TouchableOpacity onPress={() => handleRemoveProduct(product.product_id)}>
                    <Ionicons name="close-circle" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
                <View style={styles.productDetails}>
                  <Text style={styles.productDetail}>Price: ₹{product.price}</Text>
                  <Text style={styles.productDetail}>Weight: {product.weight} kg</Text>
                </View>
                <View style={styles.quantityContainer}>
                  <Text style={styles.quantityLabel}>Quantity:</Text>
                  <TextInput
                    style={styles.quantityInput}
                    value={product.quantity.toString()}
                    onChangeText={(text) => handleQuantityChange(product.product_id, text)}
                    keyboardType="numeric"
                  />
                  <Text style={styles.quantityTotal}>
                    Total: ₹{(product.quantity * product.price).toFixed(2)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {selectedProducts.length > 0 && (
          <View style={styles.totalsContainer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Price:</Text>
              <Text style={styles.totalValue}>₹{total_price.toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Weight:</Text>
              <Text style={styles.totalValue}>{total_weight.toFixed(2)} kg</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.createButton, loading && styles.buttonDisabled]}
          onPress={handleCreateOrder}
          disabled={loading || selectedProducts.length === 0}
        >
          <Text style={styles.createButtonText}>
            {loading ? 'Creating...' : 'Create Order'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showProductModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProductModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Product</Text>
            <TouchableOpacity onPress={() => setShowProductModal(false)}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={products}
            keyExtractor={(item) => item.id!}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalProductCard}
                onPress={() => handleProductSelect(item)}
              >
                <View style={styles.modalProductInfo}>
                  <Text style={styles.modalProductName}>{item.name}</Text>
                  <Text style={styles.modalProductDescription}>{item.description}</Text>
                  <View style={styles.modalProductDetails}>
                    <Text style={styles.modalProductDetail}>₹{item.price}</Text>
                    <Text style={styles.modalProductDetail}>{item.weight} kg</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#C7C7CC" />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No products available</Text>
              </View>
            }
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  productCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  productDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  productDetail: {
    fontSize: 14,
    color: '#666',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  quantityInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
    minWidth: 60,
    textAlign: 'center',
  },
  quantityTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 'auto',
  },
  totalsContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
  },
  createButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  modalProductCard: {
    backgroundColor: '#FFF',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalProductInfo: {
    flex: 1,
  },
  modalProductName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  modalProductDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  modalProductDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  modalProductDetail: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
});

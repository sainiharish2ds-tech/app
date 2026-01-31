import { create } from 'zustand';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface OrderProduct {
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  weight: number;
}

interface Order {
  id?: string;
  party_id: string;
  party_name: string;
  order_type: string;
  products: OrderProduct[];
  total_price: number;
  total_weight: number;
  status: string;
  priority: number;
  reference_order_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface OrderStore {
  orders: Order[];
  loading: boolean;
  error: string | null;
  fetchOrders: (partyId?: string, orderType?: string) => Promise<void>;
  createOrder: (order: any) => Promise<void>;
  updateOrder: (orderId: string, update: any) => Promise<void>;
  reorderOrders: (orderIds: string[]) => Promise<void>;
}

export const useOrderStore = create<OrderStore>((set, get) => ({
  orders: [],
  loading: false,
  error: null,

  fetchOrders: async (partyId?: string, orderType?: string) => {
    set({ loading: true, error: null });
    try {
      let url = `${API_URL}/api/orders`;
      const params = [];
      if (partyId) params.push(`party_id=${partyId}`);
      if (orderType) params.push(`order_type=${orderType}`);
      if (params.length > 0) url += `?${params.join('&')}`;
      
      const response = await axios.get(url);
      set({ orders: response.data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createOrder: async (order) => {
    set({ loading: true, error: null });
    try {
      await axios.post(`${API_URL}/api/orders`, order);
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateOrder: async (orderId: string, update: any) => {
    set({ loading: true, error: null });
    try {
      await axios.patch(`${API_URL}/api/orders/${orderId}`, update);
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  reorderOrders: async (orderIds: string[]) => {
    try {
      await axios.post(`${API_URL}/api/orders/reorder`, orderIds);
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },
}));

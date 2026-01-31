import { create } from 'zustand';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Product {
  id?: string;
  name: string;
  price: number;
  weight: number;
  description?: string;
}

interface ProductStore {
  products: Product[];
  loading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  initializeProducts: () => Promise<void>;
}

export const useProductStore = create<ProductStore>((set) => ({
  products: [],
  loading: false,
  error: null,

  fetchProducts: async () => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/api/products`);
      set({ products: response.data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  initializeProducts: async () => {
    const sampleProducts = [
      { name: 'Product X', price: 100, weight: 1.5, description: 'High quality product X' },
      { name: 'Product Y', price: 150, weight: 2.0, description: 'Premium product Y' },
      { name: 'Product Z', price: 200, weight: 2.5, description: 'Deluxe product Z' },
    ];

    try {
      for (const product of sampleProducts) {
        await axios.post(`${API_URL}/api/products`, product);
      }
      // Refresh the list
      const response = await axios.get(`${API_URL}/api/products`);
      set({ products: response.data });
    } catch (error: any) {
      set({ error: error.message });
    }
  },
}));

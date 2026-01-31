import { create } from 'zustand';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface MaterialTransaction {
  id?: string;
  party_id: string;
  party_name: string;
  order_id: string;
  order_type: string;
  amount: number;
  description: string;
  created_at?: string;
}

interface FinancialTransaction {
  id?: string;
  party_id: string;
  party_name: string;
  amount: number;
  payment_type: string;
  payment_method?: string;
  description?: string;
  created_at?: string;
}

interface TransactionStore {
  materialTransactions: MaterialTransaction[];
  financialTransactions: FinancialTransaction[];
  loading: boolean;
  error: string | null;
  fetchMaterialTransactions: (partyId?: string) => Promise<void>;
  fetchFinancialTransactions: (partyId?: string) => Promise<void>;
  createFinancialTransaction: (transaction: any) => Promise<void>;
}

export const useTransactionStore = create<TransactionStore>((set, get) => ({
  materialTransactions: [],
  financialTransactions: [],
  loading: false,
  error: null,

  fetchMaterialTransactions: async (partyId?: string) => {
    set({ loading: true, error: null });
    try {
      let url = `${API_URL}/api/material-transactions`;
      if (partyId) url += `?party_id=${partyId}`;
      
      const response = await axios.get(url);
      set({ materialTransactions: response.data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchFinancialTransactions: async (partyId?: string) => {
    set({ loading: true, error: null });
    try {
      let url = `${API_URL}/api/financial-transactions`;
      if (partyId) url += `?party_id=${partyId}`;
      
      const response = await axios.get(url);
      set({ financialTransactions: response.data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createFinancialTransaction: async (transaction) => {
    set({ loading: true, error: null });
    try {
      await axios.post(`${API_URL}/api/financial-transactions`, transaction);
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
}));

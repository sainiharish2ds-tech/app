import { create } from 'zustand';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Party {
  id?: string;
  name: string;
  contact?: string;
  balance: number;
  created_at?: string;
}

interface PartyStore {
  parties: Party[];
  loading: boolean;
  error: string | null;
  fetchParties: () => Promise<void>;
  createParty: (party: { name: string; contact?: string }) => Promise<void>;
  getParty: (id: string) => Promise<Party | null>;
}

export const usePartyStore = create<PartyStore>((set, get) => ({
  parties: [],
  loading: false,
  error: null,

  fetchParties: async () => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/api/parties`);
      set({ parties: response.data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createParty: async (party) => {
    set({ loading: true, error: null });
    try {
      await axios.post(`${API_URL}/api/parties`, party);
      await get().fetchParties();
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  getParty: async (id: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/parties/${id}`);
      return response.data;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    }
  },
}));

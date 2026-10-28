import { create } from 'zustand';
import type { Product } from '@/types/api';

export interface PosCartItem {
  product: Product;
  quantity: number;
}

interface PosState {
  items: PosCartItem[];
  cashReceived: number;
  idempotencyKey: string | null;
  addItem: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  setCashReceived: (val: number) => void;
  resetSale: () => void;
  setIdempotencyKey: (key: string | null) => void;
  subtotal: () => number;
  changeAmount: () => number;
}

export const usePosStore = create<PosState>()((set, get) => ({
  items: [],
  cashReceived: 0,
  idempotencyKey: null,
  addItem: (product, quantity = 1) => {
    if (product.stock <= 0 || quantity <= 0) return;
    set(state => {
      const existing = state.items.find(i => i.product.id === product.id);
      if (existing) {
        return {
          items: state.items.map(i =>
            i.product.id === product.id
              ? {
                  product,
                  quantity: Math.min(product.stock, i.quantity + Math.floor(quantity)),
                }
              : i,
          ),
        };
      }
      return {
        items: [
          ...state.items,
          { product, quantity: Math.min(product.stock, Math.floor(quantity)) },
        ],
      };
    });
  },
  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    set(state => ({
      items: state.items.map(i =>
        i.product.id === productId
          ? { ...i, quantity: Math.min(i.product.stock, Math.floor(quantity)) }
          : i,
      ),
    }));
  },
  removeItem: productId => {
    set(state => ({
      items: state.items.filter(i => i.product.id !== productId),
    }));
  },
  setCashReceived: val => set({ cashReceived: val }),
  resetSale: () => set({ items: [], cashReceived: 0, idempotencyKey: null }),
  setIdempotencyKey: key => set({ idempotencyKey: key }),
  subtotal: () =>
    get().items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
  changeAmount: () => {
    const sub = get().subtotal();
    const cash = get().cashReceived;
    return Math.max(0, cash - sub);
  },
}));

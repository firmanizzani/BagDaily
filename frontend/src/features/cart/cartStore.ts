import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '@/types/api';

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  totalItems: () => number;
  subtotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
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
                      quantity: Math.min(
                        product.stock,
                        i.quantity + Math.floor(quantity),
                      ),
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
      clearCart: () => set({ items: [] }),
      totalItems: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: () =>
        get().items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    }),
    {
      name: 'bagdaily_customer_cart',
    },
  ),
);

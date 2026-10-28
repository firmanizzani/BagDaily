import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export const useWishlist = create(
  persist<{ ids: string[]; toggle: (id: string) => void }>(
    set => ({
      ids: [],
      toggle: id =>
        set(s => ({
          ids: s.ids.includes(id) ? s.ids.filter(i => i !== id) : [...s.ids, id],
        })),
    }),
    { name: 'bagdaily-wishlist' },
  ),
);

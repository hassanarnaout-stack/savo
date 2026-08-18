import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartLineItem {
  productId: string;
  name: string;
  slug: string;
  image: string | null;
  originalPrice: number;
  saveoPrice: number;
  quantity: number;
  stockQty: number;
  // Mystery Box (2026 approved Figma flow) — the customer's REAL,
  // already-locked CHOICE-pool picks, carried from the Build/Lock
  // experience through the existing cart into the existing checkout
  // submission (checkout/page.tsx pre-fills its mysteryBoxChoices
  // state from this — see CheckoutMysteryBoxChoices). Purely additive;
  // undefined for every normal product and for any mystery box added
  // through a path that hasn't made its picks yet (that box still
  // falls back to the existing at-checkout picker UI).
  mysteryBoxChoiceIds?: string[];
}

interface CartState {
  items: CartLineItem[];
  isOpen: boolean;
  addItem: (item: Omit<CartLineItem, "quantity">, qty?: number) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clear: () => void;
  openCart: () => void;
  closeCart: () => void;
  subtotal: () => number;
  originalTotal: () => number;
  totalSavings: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (item, qty = 1) => {
        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId);
          if (existing) {
            const newQty = Math.min(existing.quantity + qty, item.stockQty);
            return {
              items: state.items.map((i) =>
                i.productId === item.productId ? { ...i, quantity: newQty } : i
              ),
              isOpen: true,
            };
          }
          return {
            items: [...state.items, { ...item, quantity: Math.min(qty, item.stockQty) }],
            isOpen: true,
          };
        });
      },

      removeItem: (productId) =>
        set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),

      updateQty: (productId, qty) =>
        set((state) => ({
          items: state.items
            .map((i) => (i.productId === productId ? { ...i, quantity: Math.max(0, qty) } : i))
            .filter((i) => i.quantity > 0),
        })),

      clear: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      subtotal: () => get().items.reduce((sum, i) => sum + i.saveoPrice * i.quantity, 0),
      originalTotal: () => get().items.reduce((sum, i) => sum + i.originalPrice * i.quantity, 0),
      totalSavings: () => get().originalTotal() - get().subtotal(),
      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: "saveo-cart",
      partialize: (state) => ({ items: state.items }) as CartState,
      merge: (persisted, current) => ({
        ...current,
        items: (persisted as Partial<CartState>)?.items ?? [],
        isOpen: false,
      }),
      // The persisted cart lives in localStorage, which doesn't exist during
      // server rendering. Auto-hydrating on the client would make the first
      // client render diverge from the server-rendered HTML (a React
      // hydration mismatch) whenever a returning visitor already has items
      // in their cart. Skipping auto-hydration keeps server and first
      // client render identical (empty cart); CartHydration below then
      // rehydrates from localStorage right after mount.
      skipHydration: true,
    }
  )
);

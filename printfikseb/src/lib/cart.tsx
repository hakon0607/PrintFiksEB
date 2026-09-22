'use client';

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';

export type SelectedExtra = {
  id: string;
  name: string;
  price: number;
  scope: 'item' | 'order';
};

export type PrintItem = {
  kind: 'print';
  key: string;
  qty: number;
  title: string;
  materialId: string;
  materialName: string;
  colorName?: string;
  pricePerGram: number;
  weightMode: 'range' | 'exact';
  rangeLabel?: string;
  minG: number;
  maxG: number;
  extras: SelectedExtra[];
  note?: string;
};

export type ProductItem = {
  kind: 'product';
  key: string;
  qty: number;
  title: string;
  productId: string;
  code: string;
  price: number;
  imageUrl?: string;
  note?: string;
};

export type RepairItem = {
  kind: 'repair';
  key: string;
  qty: number;
  title: string;
  description: string;
  note?: string;
};

export type CartItem = PrintItem | ProductItem | RepairItem;

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** Et element som skal legges i handlelisten (nøkkel lages automatisk). */
export type NewCartItem = DistributiveOmit<CartItem, 'key'> & { key?: string };

const STORAGE_KEY = 'printfikseb_handleliste_v1';

type CartContextValue = {
  items: CartItem[];
  count: number;
  ready: boolean;
  add: (item: NewCartItem) => void;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function newKey() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {
      /* handlelisten er ikke kritisk – ignorer feil */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignorer */
    }
  }, [items, ready]);

  const add = useCallback((item: NewCartItem) => {
    setItems((prev) => {
      // Slå sammen like galleriprodukter
      if (item.kind === 'product') {
        const idx = prev.findIndex(
          (p) => p.kind === 'product' && p.productId === (item as ProductItem).productId
        );
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], qty: copy[idx].qty + (item.qty || 1) };
          return copy;
        }
      }
      return [...prev, { ...(item as CartItem), key: item.key ?? newKey() }];
    });
  }, []);

  const remove = useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, qty: Math.max(1, Math.min(99, qty)) } : i))
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({
      items,
      count: items.reduce((sum, i) => sum + i.qty, 0),
      ready,
      add,
      remove,
      setQty,
      clear,
    }),
    [items, ready, add, remove, setQty, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart må brukes inne i <CartProvider>');
  return ctx;
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  endConnection,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  isUserCancelledError,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  restorePurchases,
  type Purchase,
} from 'expo-iap';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { PRO_PRODUCT_ID } from '../config';
import { t } from '../i18n/core';

const STORAGE_KEY = 'blast-radius:pro';

interface PremiumState {
  /** True once Pro is owned. Starts from the cached value so ads never flash for paying users. */
  isPro: boolean;
  /** False until the cached value has been read; ads wait on this. */
  hydrated: boolean;
  /** Localised price from the store, e.g. "$3.99". Null until loaded. */
  price: string | null;
  busy: boolean;
  error: string | null;
  purchase: () => Promise<void>;
  restore: () => Promise<boolean>;
}

const PremiumContext = createContext<PremiumState | null>(null);

const ownsPro = (purchases: Purchase[]) =>
  purchases.some((p) => p.productId === PRO_PRODUCT_ID && p.purchaseState === 'purchased');

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [isPro, setIsPro] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [price, setPrice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const connected = useRef<Promise<unknown> | null>(null);

  const setPro = useCallback((value: boolean) => {
    setIsPro(value);
    AsyncStorage.setItem(STORAGE_KEY, value ? '1' : '0').catch(() => {});
  }, []);

  const connect = useCallback(() => {
    connected.current ??= initConnection().catch((e: unknown) => {
      connected.current = null;
      throw e;
    });
    return connected.current;
  }, []);

  const refreshEntitlement = useCallback(async () => {
    await connect();
    const purchases = await getAvailablePurchases();
    const owned = ownsPro(purchases);
    setPro(owned);
    return owned;
  }, [connect, setPro]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => setIsPro(v === '1'))
      .catch(() => {})
      .finally(() => setHydrated(true));

    const updated = purchaseUpdatedListener(async (purchase) => {
      if (purchase.productId !== PRO_PRODUCT_ID || purchase.purchaseState !== 'purchased') return;
      // No backend in v1: StoreKit 2 verifies the transaction on-device before
      // expo-iap reports it, so we unlock and finish right away.
      setPro(true);
      setBusy(false);
      try {
        await finishTransaction({ purchase, isConsumable: false });
      } catch {
        // An unfinished transaction is replayed next launch; harmless for a non-consumable.
      }
    });
    const failed = purchaseErrorListener((e) => {
      setBusy(false);
      if (!isUserCancelledError(e)) setError(e.message || t('purchase.failed'));
    });

    (async () => {
      try {
        await connect();
        const products = await fetchProducts({ skus: [PRO_PRODUCT_ID], type: 'in-app' });
        const pro = products?.find((p) => p.id === PRO_PRODUCT_ID);
        if (pro) setPrice(pro.displayPrice);
        await refreshEntitlement();
      } catch {
        // Offline or store unavailable: keep the cached entitlement.
      }
    })();

    return () => {
      updated.remove();
      failed.remove();
      endConnection().catch(() => {});
      connected.current = null;
    };
  }, [connect, refreshEntitlement, setPro]);

  const purchase = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      await connect();
      await requestPurchase({
        request: { apple: { sku: PRO_PRODUCT_ID }, google: { skus: [PRO_PRODUCT_ID] } },
        type: 'in-app',
      });
      // The outcome arrives via purchaseUpdatedListener / purchaseErrorListener.
    } catch (e) {
      setBusy(false);
      if (!isUserCancelledError(e)) {
        setError(e instanceof Error ? e.message : t('purchase.failed'));
      }
    }
  }, [connect]);

  const restore = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      await connect();
      await restorePurchases();
      const owned = await refreshEntitlement();
      if (!owned) setError(t('purchase.nothingToRestore'));
      return owned;
    } catch (e) {
      setError(e instanceof Error ? e.message : t('purchase.restoreFailed'));
      return false;
    } finally {
      setBusy(false);
    }
  }, [connect, refreshEntitlement]);

  const value = useMemo(
    () => ({ isPro, hydrated, price, busy, error, purchase, restore }),
    [isPro, hydrated, price, busy, error, purchase, restore],
  );

  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
}

export function usePremium(): PremiumState {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error('usePremium must be used inside PremiumProvider');
  return ctx;
}

import {
  getTrackingPermissionsAsync,
  isAvailable as isTrackingAvailable,
  requestTrackingPermissionsAsync,
} from 'expo-tracking-transparency';
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
import { Platform } from 'react-native';
import mobileAds, {
  AdEventType,
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  InterstitialAd,
  type RequestOptions,
} from 'react-native-google-mobile-ads';

import {
  AD_UNITS,
  INTERSTITIAL_EVERY_N_SIMULATIONS,
  INTERSTITIAL_MIN_INTERVAL_MS,
} from '../config';
import { usePremium } from '../state/premium';

interface AdsState {
  /** True when banners may render: SDK ready, consent allows it, and the user isn't Pro. */
  adsEnabled: boolean;
  requestOptions: RequestOptions;
  /** Call on every "Simulate". Resolves once any interstitial it showed has closed. */
  onSimulation: () => Promise<void>;
  /** Re-open the UMP privacy options form (required in the EEA/UK). */
  showPrivacyOptions: (() => Promise<void>) | null;
}

const AdsContext = createContext<AdsState | null>(null);

/**
 * Consent → tracking → SDK start-up order, as Google recommends:
 * 1. UMP (GDPR/US-state consent form where required)
 * 2. iOS App Tracking Transparency prompt
 * 3. mobileAds().initialize()
 * Pro users never see any of it.
 */
export function AdsProvider({ children }: { children: ReactNode }) {
  const { isPro, hydrated } = usePremium();
  const [ready, setReady] = useState(false);
  const [personalized, setPersonalized] = useState(false);
  const [privacyOptionsRequired, setPrivacyOptionsRequired] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!hydrated || isPro || started.current) return;
    started.current = true;
    (async () => {
      let canRequestAds = false;
      try {
        const info = await AdsConsent.gatherConsent();
        canRequestAds = info.canRequestAds;
        setPrivacyOptionsRequired(
          info.privacyOptionsRequirementStatus ===
            AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
        );
      } catch {
        // Consent servers unreachable: fall back to what was gathered last session.
        try {
          canRequestAds = (await AdsConsent.getConsentInfo()).canRequestAds;
        } catch {
          canRequestAds = false;
        }
      }
      if (!canRequestAds) return;

      let trackingGranted = Platform.OS !== 'ios';
      if (Platform.OS === 'ios' && isTrackingAvailable()) {
        let perm = await getTrackingPermissionsAsync();
        if (perm.status === 'undetermined' && perm.canAskAgain) {
          perm = await requestTrackingPermissionsAsync();
        }
        trackingGranted = perm.granted;
      }
      setPersonalized(trackingGranted);

      try {
        await mobileAds().initialize();
        setReady(true);
      } catch {
        // Ads simply stay off.
      }
    })();
  }, [hydrated, isPro]);

  const requestOptions = useMemo<RequestOptions>(
    () => ({ requestNonPersonalizedAdsOnly: !personalized }),
    [personalized],
  );

  const adsEnabled = ready && !isPro;

  // --- Interstitial ---------------------------------------------------------
  const interstitial = useRef<InterstitialAd | null>(null);
  const loaded = useRef(false);
  const simulations = useRef(0);
  const lastShownAt = useRef(0);

  useEffect(() => {
    if (!adsEnabled) return;
    const ad = InterstitialAd.createForAdRequest(AD_UNITS.interstitial, requestOptions);
    interstitial.current = ad;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const unsubs = [
      ad.addAdEventListener(AdEventType.LOADED, () => {
        loaded.current = true;
      }),
      ad.addAdEventListener(AdEventType.CLOSED, () => {
        loaded.current = false;
        ad.load();
      }),
      ad.addAdEventListener(AdEventType.ERROR, () => {
        loaded.current = false;
        clearTimeout(retry);
        retry = setTimeout(() => ad.load(), 60_000);
      }),
    ];
    ad.load();
    return () => {
      clearTimeout(retry);
      unsubs.forEach((u) => u());
      interstitial.current = null;
      loaded.current = false;
    };
  }, [adsEnabled, requestOptions]);

  const onSimulation = useCallback(async () => {
    simulations.current += 1;
    const ad = interstitial.current;
    const due =
      simulations.current % INTERSTITIAL_EVERY_N_SIMULATIONS === 0 &&
      Date.now() - lastShownAt.current >= INTERSTITIAL_MIN_INTERVAL_MS;
    if (!adsEnabled || !ad || !loaded.current || !due) return;

    await new Promise<void>((resolve) => {
      const done = () => {
        offClosed();
        offError();
        resolve();
      };
      const offClosed = ad.addAdEventListener(AdEventType.CLOSED, done);
      const offError = ad.addAdEventListener(AdEventType.ERROR, done);
      lastShownAt.current = Date.now();
      ad.show().catch(done);
    });
  }, [adsEnabled]);

  const showPrivacyOptions = useCallback(async () => {
    await AdsConsent.showPrivacyOptionsForm().catch(() => {});
  }, []);

  const value = useMemo<AdsState>(
    () => ({
      adsEnabled,
      requestOptions,
      onSimulation,
      showPrivacyOptions: privacyOptionsRequired ? showPrivacyOptions : null,
    }),
    [adsEnabled, requestOptions, onSimulation, privacyOptionsRequired, showPrivacyOptions],
  );

  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
}

export function useAds(): AdsState {
  const ctx = useContext(AdsContext);
  if (!ctx) throw new Error('useAds must be used inside AdsProvider');
  return ctx;
}

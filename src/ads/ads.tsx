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
  RewardedAd,
  RewardedAdEventType,
  type RequestOptions,
} from 'react-native-google-mobile-ads';

import {
  ADS_CONFIGURED,
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
  /** A rewarded ad is loaded and can be offered ("Watch a short ad to try it once"). */
  rewardedReady: boolean;
  /**
   * Shows the rewarded ad. Resolves true only if the reward event fired before
   * the ad closed; false if it was skipped, failed or wasn't loaded.
   */
  showRewarded: () => Promise<boolean>;
  /** An interstitial just closed and the "Remove ads" card hasn't been shown this session. */
  postAdNudge: boolean;
  /** Hide the nudge; it won't come back this session. */
  dismissNudge: () => void;
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
    // No real ad units yet (release build): stay ad-free and never ask for tracking.
    if (!ADS_CONFIGURED || !hydrated || isPro || started.current) return;
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
  /** Simulations since the last interstitial (or since launch). */
  const sinceLastAd = useRef(0);
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

  // --- Rewarded ---------------------------------------------------------------
  const rewarded = useRef<RewardedAd | null>(null);
  const [rewardedReady, setRewardedReady] = useState(false);

  useEffect(() => {
    if (!adsEnabled) return;
    const ad = RewardedAd.createForAdRequest(AD_UNITS.rewarded, requestOptions);
    rewarded.current = ad;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const unsubs = [
      ad.addAdEventListener(RewardedAdEventType.LOADED, () => setRewardedReady(true)),
      ad.addAdEventListener(AdEventType.CLOSED, () => {
        setRewardedReady(false);
        ad.load();
      }),
      ad.addAdEventListener(AdEventType.ERROR, () => {
        // No fill or a network error: hide the option and try again later.
        setRewardedReady(false);
        clearTimeout(retry);
        retry = setTimeout(() => ad.load(), 60_000);
      }),
    ];
    ad.load();
    return () => {
      clearTimeout(retry);
      unsubs.forEach((u) => u());
      rewarded.current = null;
      setRewardedReady(false);
    };
  }, [adsEnabled, requestOptions]);

  const showRewarded = useCallback(async () => {
    const ad = rewarded.current;
    if (!adsEnabled || !ad || !rewardedReady) return false;
    return new Promise<boolean>((resolve) => {
      let earned = false;
      const finish = () => {
        offEarned();
        offClosed();
        offError();
        resolve(earned);
      };
      const offEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        earned = true;
      });
      const offClosed = ad.addAdEventListener(AdEventType.CLOSED, finish);
      const offError = ad.addAdEventListener(AdEventType.ERROR, finish);
      ad.show().catch(finish);
    });
  }, [adsEnabled, rewardedReady]);

  // --- Post-interstitial nudge -------------------------------------------------
  const [postAdNudge, setPostAdNudge] = useState(false);
  const nudgedThisSession = useRef(false);
  const dismissNudge = useCallback(() => setPostAdNudge(false), []);

  const onSimulation = useCallback(async () => {
    sinceLastAd.current += 1;
    const ad = interstitial.current;
    // Due from the Nth simulation on. If the ad isn't loaded yet (or the 90 s
    // gap hasn't passed) it stays due, so the next simulation shows it instead
    // of skipping a whole cycle.
    const due =
      sinceLastAd.current >= INTERSTITIAL_EVERY_N_SIMULATIONS &&
      Date.now() - lastShownAt.current >= INTERSTITIAL_MIN_INTERVAL_MS;
    if (!adsEnabled || !ad || !loaded.current || !due) return;
    sinceLastAd.current = 0;

    const closed = await new Promise<boolean>((resolve) => {
      const done = (wasClosed: boolean) => {
        offClosed();
        offError();
        resolve(wasClosed);
      };
      const offClosed = ad.addAdEventListener(AdEventType.CLOSED, () => done(true));
      const offError = ad.addAdEventListener(AdEventType.ERROR, () => done(false));
      lastShownAt.current = Date.now();
      ad.show().catch(() => done(false));
    });
    // Offer "Remove ads for good" right after the user has sat through one, once a session.
    if (closed && !nudgedThisSession.current && !isPro) {
      nudgedThisSession.current = true;
      setPostAdNudge(true);
    }
  }, [adsEnabled, isPro]);

  const showPrivacyOptions = useCallback(async () => {
    await AdsConsent.showPrivacyOptionsForm().catch(() => {});
  }, []);

  const value = useMemo<AdsState>(
    () => ({
      adsEnabled,
      requestOptions,
      onSimulation,
      rewardedReady: adsEnabled && rewardedReady,
      showRewarded,
      postAdNudge: postAdNudge && !isPro,
      dismissNudge,
      showPrivacyOptions: privacyOptionsRequired ? showPrivacyOptions : null,
    }),
    [
      adsEnabled,
      requestOptions,
      onSimulation,
      rewardedReady,
      showRewarded,
      postAdNudge,
      isPro,
      dismissNudge,
      privacyOptionsRequired,
      showPrivacyOptions,
    ],
  );

  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
}

export function useAds(): AdsState {
  const ctx = useContext(AdsContext);
  if (!ctx) throw new Error('useAds must be used inside AdsProvider');
  return ctx;
}

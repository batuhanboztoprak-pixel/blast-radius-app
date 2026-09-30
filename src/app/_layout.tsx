import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AdsProvider } from '../ads/ads';
import { IntroSplash } from '../components/IntroSplash';
import { initI18n } from '../i18n/detect';
import { PremiumProvider } from '../state/premium';
import { SimulationProvider } from '../state/simulation';
import { UnitsProvider } from '../state/units';
import { WorldProvider } from '../state/world';
import { UpsellProvider } from '../upsell/upsell';
import { colors } from '../theme';

// Pick the language before anything renders; iOS relaunches the app if it changes.
initI18n();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });
  // The launch intro plays once per launch, over the first screen.
  const [intro, setIntro] = useState(true);

  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <SafeAreaProvider>
      <PremiumProvider>
        <AdsProvider>
          <UnitsProvider>
            <SimulationProvider>
              <WorldProvider>
                <UpsellProvider>
                  <StatusBar style="light" />
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: colors.bg },
                    }}
                  >
                    <Stack.Screen name="index" />
                    <Stack.Screen name="asteroid" />
                    <Stack.Screen name="result" />
                    <Stack.Screen name="share" />
                    <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
                    <Stack.Screen name="upgrade-stats" options={{ presentation: 'modal' }} />
                  </Stack>
                  {intro && <IntroSplash onDone={() => setIntro(false)} />}
                </UpsellProvider>
              </WorldProvider>
            </SimulationProvider>
          </UnitsProvider>
        </AdsProvider>
      </PremiumProvider>
    </SafeAreaProvider>
  );
}

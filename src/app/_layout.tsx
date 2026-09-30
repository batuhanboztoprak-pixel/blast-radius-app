import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AdsProvider } from '../ads/ads';
import { initI18n } from '../i18n/detect';
import { PremiumProvider } from '../state/premium';
import { SimulationProvider } from '../state/simulation';
import { UnitsProvider } from '../state/units';
import { WorldProvider } from '../state/world';
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

  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <SafeAreaProvider>
      <PremiumProvider>
        <AdsProvider>
          <UnitsProvider>
            <SimulationProvider>
              <WorldProvider>
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
                </Stack>
              </WorldProvider>
            </SimulationProvider>
          </UnitsProvider>
        </AdsProvider>
      </PremiumProvider>
    </SafeAreaProvider>
  );
}

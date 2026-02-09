import { useCallback, useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useFonts } from 'expo-font'
import {
  AppState,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { configureFonts, MD3LightTheme, PaperProvider } from 'react-native-paper'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { theme as appTheme } from '../constants/theme'
import { AuthProvider } from '../contexts/AuthContext'
import { useScreenTracking } from '../hooks/useScreenTracking'
import { initTelemetry } from '../lib/telemetry'
import { supabase } from '../lib/supabase'

SplashScreen.preventAutoHideAsync().catch(() => undefined)

const APP_VERSION_NUMBER = 1.0
const APP_STORE_URL = 'https://apps.apple.com/app/id0000000000'
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.priyanshukumar18.keepmore'

const fontConfig = {
  displayLarge: {
    fontFamily: appTheme.fonts.display.regular,
    fontWeight: '400' as const,
  },
  displayMedium: {
    fontFamily: appTheme.fonts.display.regular,
    fontWeight: '400' as const,
  },
  displaySmall: {
    fontFamily: appTheme.fonts.display.regular,
    fontWeight: '400' as const,
  },
  headlineLarge: {
    fontFamily: appTheme.fonts.display.regular,
    fontWeight: '400' as const,
  },
  headlineMedium: {
    fontFamily: appTheme.fonts.display.regular,
    fontWeight: '400' as const,
  },
  headlineSmall: {
    fontFamily: appTheme.fonts.display.regular,
    fontWeight: '400' as const,
  },
  titleLarge: {
    fontFamily: appTheme.fonts.display.medium,
    fontWeight: '500' as const,
  },
  titleMedium: {
    fontFamily: appTheme.fonts.body.medium,
    fontWeight: '500' as const,
  },
  titleSmall: {
    fontFamily: appTheme.fonts.body.medium,
    fontWeight: '500' as const,
  },
  labelLarge: {
    fontFamily: appTheme.fonts.body.medium,
    fontWeight: '500' as const,
  },
  labelMedium: {
    fontFamily: appTheme.fonts.body.medium,
    fontWeight: '500' as const,
  },
  labelSmall: {
    fontFamily: appTheme.fonts.body.medium,
    fontWeight: '500' as const,
  },
  bodyLarge: {
    fontFamily: appTheme.fonts.body.regular,
    fontWeight: '400' as const,
  },
  bodyMedium: {
    fontFamily: appTheme.fonts.body.regular,
    fontWeight: '400' as const,
  },
  bodySmall: {
    fontFamily: appTheme.fonts.body.regular,
    fontWeight: '400' as const,
  },
}

const paperTheme = {
  ...MD3LightTheme,
  roundness: appTheme.radii.button,
  colors: {
    ...MD3LightTheme.colors,
    primary: appTheme.colors.primary,
    secondary: appTheme.colors.accent,
    tertiary: appTheme.colors.accentStrong,
    background: appTheme.colors.background,
    surface: appTheme.colors.surface,
    surfaceVariant: appTheme.colors.surfaceAlt,
    onSurface: appTheme.colors.ink,
    onBackground: appTheme.colors.ink,
    outline: appTheme.colors.border,
  },
  fonts: configureFonts({ config: fontConfig }),
}

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false)
  const [isOutdated, setIsOutdated] = useState(false)
  const [fontsLoaded, fontError] = useFonts({
    'SpaceMono-Regular': require('../assets/fonts/SpaceMono-Regular.ttf'),
  })

  useEffect(() => {
    if (fontsLoaded || fontError) {
      setAppIsReady(true)
    }
  }, [fontsLoaded, fontError])

  useEffect(() => {
    void initTelemetry()
  }, [])

  const checkAppVersion = useCallback(async () => {
    const { data, error } = await supabase
      .from('app_version')
      .select('is_latest')
      .eq('version_number', APP_VERSION_NUMBER)
      .maybeSingle()

    if (error) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[app_version] failed to check version', error)
      }
      setIsOutdated(false)
      return
    }

    setIsOutdated(data?.is_latest === false)
  }, [])

  useEffect(() => {
    void checkAppVersion()
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void checkAppVersion()
      }
    })

    return () => {
      subscription.remove()
    }
  }, [checkAppVersion])

  useScreenTracking()

  const onLayoutRootView = useCallback(() => {
    if (appIsReady) {
      SplashScreen.hideAsync().catch(() => undefined)
    }
  }, [appIsReady])

  if (!appIsReady) {
    return null
  }

  const storeUrl = Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL

  const handleUpdatePress = () => {
    if (!storeUrl) return
    void Linking.openURL(storeUrl)
  }

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <AuthProvider>
          <PaperProvider theme={paperTheme}>
            <Modal
              animationType="fade"
              transparent
              visible={isOutdated}
              onRequestClose={() => undefined}
            >
              <View style={styles.updateOverlay}>
                <View style={styles.updateCard}>
                  <Text style={styles.updateTitle}>Your version is outdated</Text>
                  <Text style={styles.updateBody}>
                    Please update it on the app store to continue.
                  </Text>
                  <Pressable style={styles.updateButton} onPress={handleUpdatePress}>
                    <Text style={styles.updateButtonText}>Update</Text>
                  </Pressable>
                </View>
              </View>
            </Modal>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(settings)" />
              <Stack.Screen name="assistant" options={{ presentation: 'modal' }} />
            </Stack>
          </PaperProvider>
        </AuthProvider>
      </View>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  updateOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: appTheme.spacing.page,
  },
  updateCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: appTheme.colors.surface,
    borderRadius: appTheme.radii.cardLarge,
    paddingVertical: 24,
    paddingHorizontal: 20,
    ...appTheme.shadows.card,
  },
  updateTitle: {
    fontFamily: appTheme.fonts.display.medium,
    fontSize: 22,
    color: appTheme.colors.ink,
    marginBottom: 8,
    textAlign: 'center',
  },
  updateBody: {
    fontFamily: appTheme.fonts.body.regular,
    fontSize: 15,
    lineHeight: 22,
    color: appTheme.colors.muted,
    textAlign: 'center',
    marginBottom: 20,
  },
  updateButton: {
    backgroundColor: appTheme.colors.primary,
    borderRadius: appTheme.radii.button,
    paddingVertical: 12,
    alignItems: 'center',
  },
  updateButtonText: {
    fontFamily: appTheme.fonts.body.medium,
    fontSize: 16,
    color: appTheme.colors.surface,
  },
})

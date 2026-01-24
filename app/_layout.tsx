import { useCallback, useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useFonts } from 'expo-font'
import { View } from 'react-native'
import { configureFonts, MD3LightTheme, PaperProvider } from 'react-native-paper'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { theme as appTheme } from '../constants/theme'
import { AuthProvider } from '../contexts/AuthContext'

SplashScreen.preventAutoHideAsync().catch(() => undefined)

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
  const [fontsLoaded, fontError] = useFonts({
    'Manrope-Regular': require('../assets/fonts/Manrope-Regular.ttf'),
    'Manrope-Medium': require('../assets/fonts/Manrope-Medium.ttf'),
    'PlayfairDisplay-Regular': require('../assets/fonts/PlayfairDisplay-Regular.ttf'),
    'PlayfairDisplay-Medium': require('../assets/fonts/PlayfairDisplay-Medium.ttf'),
    'SpaceMono-Regular': require('../assets/fonts/SpaceMono-Regular.ttf'),
  })

  useEffect(() => {
    if (fontsLoaded || fontError) {
      setAppIsReady(true)
    }
  }, [fontsLoaded, fontError])

  const onLayoutRootView = useCallback(() => {
    if (appIsReady) {
      SplashScreen.hideAsync().catch(() => undefined)
    }
  }, [appIsReady])

  if (!appIsReady) {
    return null
  }

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <AuthProvider>
          <PaperProvider theme={paperTheme}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="assistant" options={{ presentation: 'modal' }} />
            </Stack>
          </PaperProvider>
        </AuthProvider>
      </View>
    </SafeAreaProvider>
  )
}

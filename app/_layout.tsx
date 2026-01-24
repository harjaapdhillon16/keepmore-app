import { Stack } from 'expo-router'
import { MD3LightTheme, PaperProvider } from 'react-native-paper'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { theme as appTheme } from '../constants/theme'

const paperTheme = {
  ...MD3LightTheme,
  roundness: appTheme.radii.card,
  colors: {
    ...MD3LightTheme.colors,
    primary: appTheme.colors.accent,
    secondary: appTheme.colors.accent,
    tertiary: appTheme.colors.accentStrong,
    background: appTheme.colors.background,
    surface: appTheme.colors.surface,
    onSurface: appTheme.colors.ink,
    onBackground: appTheme.colors.ink,
    outline: appTheme.colors.border,
  },
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
        <PaperProvider theme={paperTheme}>
          <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="assistant" options={{ presentation: 'modal' }} />
        </Stack>
        </PaperProvider>
    </SafeAreaProvider>
  )
}

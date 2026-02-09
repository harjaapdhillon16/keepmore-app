import { Stack } from 'expo-router'
import { theme } from '../../constants/theme'

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.colors.background },
        headerTitleStyle: {
          fontFamily: theme.fonts.body.medium,
          color: theme.colors.ink,
          fontSize: 16,
        },
        headerTintColor: theme.colors.ink,
      }}
    />
  )
}

import { Ionicons } from '@expo/vector-icons'
import { Stack, useRouter } from 'expo-router'
import { Pressable, StyleSheet } from 'react-native'
import { theme } from '../../constants/theme'

export default function SettingsLayout() {
  const router = useRouter()

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
        headerBackTitleVisible: false,
        headerLeft: ({ canGoBack }) =>
          canGoBack ? (
            <Pressable
              accessibilityLabel="Go back"
              onPress={() => router.back()}
              hitSlop={12}
              style={styles.backButton}
            >
              <Ionicons name="chevron-back" size={22} color={theme.colors.ink} />
            </Pressable>
          ) : null,
      }}
    >
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
      <Stack.Screen name="connected-accounts" options={{ title: 'Connected Accounts' }} />
      <Stack.Screen name="reconnect-banks" options={{ title: 'Reconnect Banks' }} />
      <Stack.Screen name="subscription" options={{ title: 'Subscription' }} />
      <Stack.Screen name="preferences" options={{ title: 'Preferences' }} />
      <Stack.Screen name="privacy" options={{ title: 'Data and Privacy' }} />
      <Stack.Screen name="support" options={{ title: 'Support' }} />
    </Stack>
  )
}

const styles = StyleSheet.create({
  backButton: {
    padding: 4,
    marginLeft: theme.spacing.page - 4,
  },
})

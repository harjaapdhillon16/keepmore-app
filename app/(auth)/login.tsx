import { useRouter } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '../../constants/theme'

export default function LoginScreen() {
  const router = useRouter()

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text variant="headlineMedium" style={styles.title}>
          Keep More of What You Earn
        </Text>
        <Text style={styles.subtitle}>
          Average user saves $2,847 per year with smarter tax tracking.
        </Text>
        <Button
          mode="contained"
          style={styles.primaryButton}
          contentStyle={styles.primaryButtonContent}
          onPress={() => router.push('/(auth)')}
        >
          Continue with Apple
        </Button>
        <Text style={styles.legal}>By continuing, you agree to Terms and Privacy.</Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.page,
    justifyContent: 'center',
    gap: 18,
    backgroundColor: theme.colors.background,
  },
  title: {
    fontWeight: '700',
    color: theme.colors.ink,
  },
  subtitle: {
    color: theme.colors.muted,
  },
  primaryButton: {
    borderRadius: theme.radii.pill,
  },
  primaryButtonContent: {
    paddingVertical: 6,
  },
  legal: {
    color: theme.colors.mutedLight,
    fontSize: 12,
  },
})

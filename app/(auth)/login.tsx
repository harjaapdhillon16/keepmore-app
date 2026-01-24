import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '../../constants/theme'
import { useAuth } from '../../contexts/AuthContext'

export default function LoginScreen() {
  const router = useRouter()
  const { signInWithApple, isWorking, error } = useAuth()

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Join thousands managing their finances smarter.
          </Text>
        </View>

        <View style={styles.actions}>
          <Button
            mode="contained"
            buttonColor={theme.colors.primary}
            textColor="#ffffff"
            style={styles.primaryButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.primaryLabel}
            icon={() => <Ionicons name="logo-apple" size={18} color="#ffffff" />}
            onPress={async () => {
              const success = await signInWithApple()
              if (success) {
                router.push('/(auth)/plaid-intro')
              }
            }}
            loading={isWorking}
            disabled={isWorking}
          >
            Continue with Apple
          </Button>
          <Button
            mode="outlined"
            textColor={theme.colors.ink}
            style={styles.secondaryButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.secondaryLabel}
            icon={() => <Ionicons name="mail-outline" size={18} color={theme.colors.ink} />}
            onPress={() => router.push('/(auth)/email')}
            disabled={isWorking}
          >
            Continue with Email
          </Button>
        </View>

        <View style={styles.footer}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Text style={styles.legal}>
            By continuing, you agree to Terms and Privacy Policy.
          </Text>
          <Text style={styles.loginHint}>Already have account? Login</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.page,
    gap: 28,
  },
  header: {
    gap: 8,
  },
  title: {
    fontFamily: theme.fonts.display.regular,
    fontSize: 30,
    color: theme.colors.ink,
  },
  subtitle: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.muted,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    borderRadius: theme.radii.button,
  },
  secondaryButton: {
    borderRadius: theme.radii.button,
    borderColor: theme.colors.border,
    borderWidth: 1.5,
  },
  buttonContent: {
    paddingVertical: 10,
  },
  primaryLabel: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 15,
  },
  secondaryLabel: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 15,
  },
  footer: {
    gap: 8,
  },
  error: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 12,
    color: theme.colors.danger,
  },
  legal: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.mutedLight,
  },
  loginHint: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 12,
    color: theme.colors.muted,
  },
})

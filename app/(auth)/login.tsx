import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import AuthLegalLinks from '../../components/AuthLegalLinks'
import { theme } from '../../constants/theme'
import { APP_VERSION_NUMBER } from '../../constants/appVersion'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { getPostSignInRoute } from '../../utils/postSignIn'

export default function LoginScreen() {
  const router = useRouter()
  const { signInWithApple, isWorking, error, user } = useAuth()
  const [isRouting, setIsRouting] = useState(false)
  const [routingError, setRoutingError] = useState<string | null>(null)
  const [showPasswordLogin, setShowPasswordLogin] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadReviewFlag = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('app_version')
          .select('is_apple_review')
          .eq('version_number', APP_VERSION_NUMBER)
          .maybeSingle()

        if (fetchError) {
          throw fetchError
        }

        if (isMounted) {
          setShowPasswordLogin(Boolean(data?.is_apple_review))
        }
      } catch {
        if (isMounted) {
          setShowPasswordLogin(false)
        }
      }
    }

    void loadReviewFlag()

    return () => {
      isMounted = false
    }
  }, [])

  const handlePostSignIn = async (userId?: string) => {
    setRoutingError(null)
    setIsRouting(true)
    try {
      const resolvedUserId = userId ?? user?.id
      if (!resolvedUserId) {
        throw new Error('Missing cached user')
      }
      const nextRoute = await getPostSignInRoute(resolvedUserId)
      router.replace(nextRoute)
    } catch (err) {
      setRoutingError('Unable to continue. Please try again.')
    } finally {
      setIsRouting(false)
    }
  }

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
              const result = await signInWithApple()
              if (result.success) {
                await handlePostSignIn(result.userId)
              }
            }}
            loading={isWorking || isRouting}
            disabled={isWorking || isRouting}
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
            disabled={isWorking || isRouting}
          >
            Continue with Email
          </Button>
          {showPasswordLogin ? (
            <Button
              mode="outlined"
              textColor={theme.colors.ink}
              style={styles.secondaryButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.secondaryLabel}
              icon={() => (
                <Ionicons name="lock-closed-outline" size={18} color={theme.colors.ink} />
              )}
              onPress={() => router.push('/(auth)/password')}
              disabled={isWorking || isRouting}
            >
              Continue with Password
            </Button>
          ) : null}
        </View>

        <View style={styles.footer}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {routingError ? <Text style={styles.error}>{routingError}</Text> : null}
          <AuthLegalLinks align="left" variant="agreement" />
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
  loginHint: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 12,
    color: theme.colors.muted,
  },
})

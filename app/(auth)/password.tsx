import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Button, Text, TextInput } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '../../constants/theme'
import { useAuth } from '../../contexts/AuthContext'
import { getPostSignInRoute } from '../../utils/postSignIn'

export default function PasswordLoginScreen() {
  const router = useRouter()
  const { signInWithPassword, isWorking, error, user } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [routingError, setRoutingError] = useState<string | null>(null)
  const [isRouting, setIsRouting] = useState(false)

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

  const handleLogin = async () => {
    setRoutingError(null)

    if (!email.trim() || !password) {
      setRoutingError('Enter your email and password.')
      return
    }

    const result = await signInWithPassword(email.trim(), password)
    if (result.success) {
      await handlePostSignIn(result.userId)
    }
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Sign in with password</Text>
          <Text style={styles.subtitle}>Enter your email and password to continue.</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            mode="outlined"
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
            style={styles.input}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {routingError ? <Text style={styles.error}>{routingError}</Text> : null}

        <Button
          mode="contained"
          buttonColor={theme.colors.primary}
          textColor="#ffffff"
          style={styles.primaryButton}
          contentStyle={styles.buttonContent}
          labelStyle={styles.primaryLabel}
          onPress={handleLogin}
          loading={isWorking || isRouting}
          disabled={isWorking || isRouting}
        >
          Sign in
        </Button>
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
    gap: 24,
  },
  header: {
    gap: 8,
  },
  title: {
    fontFamily: theme.fonts.display.regular,
    fontSize: 28,
    color: theme.colors.ink,
  },
  subtitle: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 14,
    color: theme.colors.muted,
  },
  form: {
    gap: 12,
  },
  input: {
    backgroundColor: theme.colors.surface,
  },
  error: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 12,
    color: theme.colors.danger,
  },
  primaryButton: {
    borderRadius: theme.radii.button,
  },
  buttonContent: {
    paddingVertical: 10,
  },
  primaryLabel: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 15,
  },
})

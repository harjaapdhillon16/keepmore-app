import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Button, Text, TextInput } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '../../constants/theme'
import { useAuth } from '../../contexts/AuthContext'

export default function EmailAuthScreen() {
  const router = useRouter()
  const { signInWithEmail, signUpWithEmail, isWorking, error } = useAuth()
  const [mode, setMode] = useState<'signup' | 'signin'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  const handleSubmit = async () => {
    setNotice(null)
    if (!email || !password) {
      setNotice('Enter your email and password to continue.')
      return
    }
    if (mode === 'signup') {
      const result = await signUpWithEmail(email.trim(), password)
      if (result.success) {
        if (result.needsEmailConfirmation) {
          setNotice('Check your email to confirm your account.')
        } else {
          router.push('/(auth)/plaid-intro')
        }
      }
      return
    }
    const signedIn = await signInWithEmail(email.trim(), password)
    if (signedIn) {
      router.push('/(auth)/plaid-intro')
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
          <Text style={styles.title}>
            {mode === 'signup' ? 'Create your account' : 'Welcome back'}
          </Text>
          <Text style={styles.subtitle}>
            {mode === 'signup'
              ? 'Use your email to start your free trial.'
              : 'Sign in to continue your onboarding.'}
          </Text>
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

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          mode="contained"
          buttonColor={theme.colors.primary}
          textColor="#ffffff"
          style={styles.primaryButton}
          contentStyle={styles.buttonContent}
          labelStyle={styles.primaryLabel}
          onPress={handleSubmit}
          loading={isWorking}
          disabled={isWorking}
        >
          {mode === 'signup' ? 'Create account' : 'Sign in'}
        </Button>

        <Button
          mode="text"
          textColor={theme.colors.muted}
          labelStyle={styles.switchLabel}
          onPress={() => {
            setNotice(null)
            setMode(mode === 'signup' ? 'signin' : 'signup')
          }}
        >
          {mode === 'signup'
            ? 'Already have an account? Sign in'
            : "Don't have an account? Create one"}
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
  notice: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 12,
    color: theme.colors.accentStrong,
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
  switchLabel: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 13,
  },
})

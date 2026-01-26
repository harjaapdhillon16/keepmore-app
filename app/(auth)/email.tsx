import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Button, Text, TextInput } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '../../constants/theme'
import { useAuth } from '../../contexts/AuthContext'

export default function EmailOtpAuthScreen() {
  const router = useRouter()
  const { sendEmailOtp, verifyEmailOtp, isWorking, error } = useAuth()

  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [notice, setNotice] = useState<string | null>(null)

  const handleSendCode = async () => {
    setNotice(null)

    if (!email) {
      setNotice('Enter your email to continue.')
      return
    }

    const result = await sendEmailOtp(email.trim())

    if (result.success) {
      setStep('otp')
      setNotice('We sent a 8-digit code to your email.')
    }
  }

  const handleVerify = async () => {
    setNotice(null)

    if (!otp) {
      setNotice('Enter the verification code.')
      return
    }

    const result = await verifyEmailOtp(email.trim(), otp)

    if (result.success) {
      router.push('/(auth)/plaid-connect')
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
            {step === 'email' ? 'Sign in or create account' : 'Check your email'}
          </Text>

          <Text style={styles.subtitle}>
            {step === 'email'
              ? 'We’ll email you a one-time code.'
              : `Enter the 8-digit code sent to ${email}`}
          </Text>
        </View>

        <View style={styles.form}>
          {step === 'email' && (
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
          )}

          {step === 'otp' && (
            <TextInput
              mode="outlined"
              label="Verification code"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={8}
              style={styles.input}
            />
          )}
        </View>

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {step === 'email' ? (
          <Button
            mode="contained"
            buttonColor={theme.colors.primary}
            textColor="#ffffff"
            style={styles.primaryButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.primaryLabel}
            onPress={handleSendCode}
            loading={isWorking}
            disabled={isWorking}
          >
            Send code
          </Button>
        ) : (
          <>
            <Button
              mode="contained"
              buttonColor={theme.colors.primary}
              textColor="#ffffff"
              style={styles.primaryButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.primaryLabel}
              onPress={handleVerify}
              loading={isWorking}
              disabled={isWorking}
            >
              Verify & continue
            </Button>

            <Button
              mode="text"
              textColor={theme.colors.muted}
              labelStyle={styles.switchLabel}
              onPress={() => {
                setOtp('')
                setStep('email')
              }}
            >
              Change email
            </Button>
          </>
        )}
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

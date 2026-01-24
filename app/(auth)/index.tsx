import { useState } from 'react'
import { useRouter } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '../../constants/theme'
import { usePlaid } from '../../hooks/usePlaid'

const STEPS = [
  {
    title: 'Connect your bank accounts securely',
    detail: 'Link checking, savings, credit cards, and investments with Plaid.',
  },
  {
    title: 'Set your profile',
    detail: 'Choose employment type, location, and currency preference.',
  },
  {
    title: 'Start your trial',
    detail: '7-day free trial. Annual plans save more over time.',
  },
]

const DEMO_USER_ID = 'demo-user'

export default function OnboardingScreen() {
  const [step, setStep] = useState(0)
  const [hasLinkedBank, setHasLinkedBank] = useState(false)
  const router = useRouter()
  const { openLinkFlow, isLoading, error } = usePlaid()
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1
  const isBankStep = step === 0

  const primaryLabel = isLast
    ? 'Go to dashboard'
    : isBankStep
      ? hasLinkedBank
        ? 'Continue'
        : 'Connect bank'
      : 'Continue'

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.kicker}>Step {step + 1} of {STEPS.length}</Text>
        <Text variant="headlineSmall" style={styles.title}>
          {current.title}
        </Text>
        <Text style={styles.detail}>{current.detail}</Text>
        {isBankStep && hasLinkedBank ? (
          <Text style={styles.success}>Bank connected</Text>
        ) : null}
        {isBankStep && error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.actions}>
          <Button
            mode="contained"
            style={styles.primaryButton}
            contentStyle={styles.primaryButtonContent}
            onPress={() => {
              if (isBankStep && !hasLinkedBank) {
                openLinkFlow({
                  userId: DEMO_USER_ID,
                  onSuccess: () => {
                    setHasLinkedBank(true)
                    setStep((prev) => prev + 1)
                  },
                })
                return
              }
              if (isLast) {
                router.replace('/(tabs)')
                return
              }
              setStep((prev) => prev + 1)
            }}
            loading={isBankStep && isLoading}
            disabled={isBankStep && isLoading}
          >
            {primaryLabel}
          </Button>
          <Button mode="text" onPress={() => router.replace('/(tabs)')}>
            Skip for now
          </Button>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.page,
    justifyContent: 'center',
    gap: 16,
    backgroundColor: theme.colors.background,
  },
  kicker: {
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    fontSize: 12,
    color: theme.colors.mutedLight,
  },
  title: {
    fontWeight: '700',
    color: theme.colors.ink,
  },
  detail: {
    color: theme.colors.muted,
  },
  success: {
    color: theme.colors.accentStrong,
    fontWeight: '600',
  },
  error: {
    color: theme.colors.danger,
  },
  actions: {
    gap: 12,
    marginTop: 12,
  },
  primaryButton: {
    borderRadius: theme.radii.pill,
  },
  primaryButtonContent: {
    paddingVertical: 6,
  },
})

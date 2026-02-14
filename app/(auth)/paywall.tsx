import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { ActivityIndicator, Text } from 'react-native-paper'
import Purchases, { PurchasesOffering } from 'react-native-purchases'
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui'
import { SafeAreaView } from 'react-native-safe-area-context'
import AuthLegalLinks from '../../components/AuthLegalLinks'
import { theme } from '../../constants/theme'

const features = [
  { icon: 'sparkles', title: 'Unlimited AI Questions', detail: 'Ask anything about finances' },
  { icon: 'trending-up', title: 'Smart Analytics', detail: 'Track spending & savings' },
  { icon: 'flag', title: 'Goal Tracking', detail: 'Budgets & investment goals' },
  { icon: 'shield-checkmark', title: 'Secure & Private', detail: 'Bank-level encryption' },
]

export default function PaywallScreen() {
  const router = useRouter()
  const [offering, setOffering] = useState<PurchasesOffering | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const loadOfferings = async () => {
      try {
        const offerings = await Purchases.getOfferings()
        console.log('Offerings loaded:', JSON.stringify(offerings, null, 2))
        
        if (isMounted) {
          if (offerings.current) {
            setOffering(offerings.current)
          } else {
            setError('No subscription plans available.')
          }
        }
      } catch (err) {
        console.error('Error loading offerings:', err)
        if (isMounted) {
          setError('Unable to load subscription options.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadOfferings()

    return () => {
      isMounted = false
    }
  }, [])

  const handleStartTrial = async () => {
    if (!offering || isPurchasing) return

    setIsPurchasing(true)
    setError(null)

    try {
      const paywallResult: PAYWALL_RESULT = await RevenueCatUI.presentPaywall({
        offering,
        
      })

      console.log('Paywall result:', paywallResult)

      switch (paywallResult) {
        case PAYWALL_RESULT.PURCHASED:
        case PAYWALL_RESULT.RESTORED:
          const customerInfo = await Purchases.getCustomerInfo()
          if (customerInfo.entitlements.active.premium) {
            router.replace('/(auth)/trial')
          } else {
            router.replace('/(tabs)')
          }
          break

        case PAYWALL_RESULT.CANCELLED:
          console.log('User cancelled the paywall')
          break

        case PAYWALL_RESULT.ERROR:
          setError('Something went wrong. Please try again.')
          break

        case PAYWALL_RESULT.NOT_PRESENTED:
          setError('Unable to show subscription options.')
          break
      }
    } catch (err: any) {
      console.error('Paywall error:', err)
      setError('An unexpected error occurred.')
    } finally {
      setIsPurchasing(false)
    }
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Premium Features</Text>
          <Text style={styles.subtitle}>Unlock full access with a 7-day free trial</Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          {features.map((feature) => (
            <View key={feature.title} style={styles.featureRow}>
              <View style={styles.iconCircle}>
                <Ionicons name={feature.icon as any} size={18} color={theme.colors.accent} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDetail}>{feature.detail}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Benefits */}
        <View style={styles.benefits}>
          <View style={styles.benefitRow}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.accent} />
            <Text style={styles.benefitText}>Cancel anytime</Text>
          </View>
          <View style={styles.benefitRow}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.accent} />
            <Text style={styles.benefitText}>No charge for 7 days</Text>
          </View>
          <View style={styles.benefitRow}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.accent} />
            <Text style={styles.benefitText}>Instant access</Text>
          </View>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* CTA */}
        <View style={styles.ctaSection}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.accent} />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : (
            <Pressable
              style={[styles.ctaButton, (!offering || isPurchasing) && styles.ctaButtonDisabled]}
              onPress={handleStartTrial}
              disabled={!offering || isPurchasing}
            >
              {isPurchasing ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.ctaButtonText}>Start Free Trial</Text>
                  <Ionicons name="arrow-forward" size={18} color="#ffffff" />
                </>
              )}
            </Pressable>
          )}
        </View>

        <View style={styles.legalLinks}>
          <AuthLegalLinks />
        </View>
      </View>
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
    padding: theme.spacing.page,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontFamily: theme.fonts.display.regular,
    fontSize: 28,
    color: theme.colors.ink,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 15,
    color: theme.colors.muted,
    textAlign: 'center',
  },
  features: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 14,
    color: theme.colors.ink,
    marginBottom: 2,
  },
  featureDetail: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  benefits: {
    justifyContent: 'space-around',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  benefitText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 13,
    color: theme.colors.danger,
    textAlign: 'center',
  },
  ctaSection: {
    gap: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  loadingText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 14,
    color: theme.colors.muted,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  ctaButtonDisabled: {
    opacity: 0.5,
  },
  ctaButtonText: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 16,
    color: '#ffffff',
  },
  legalLinks: {
    marginTop: 18,
  },
})

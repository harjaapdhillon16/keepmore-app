import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { ActivityIndicator, Text } from 'react-native-paper'
import Purchases, { PACKAGE_TYPE, PurchasesPackage } from 'react-native-purchases'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '../../constants/theme'

const features = [
  {
    icon: 'chatbubble-ellipses',
    title: 'Unlimited AI Questions',
    detail: 'Ask anything about your spending and investments.',
  },
  {
    icon: 'bar-chart',
    title: 'Advanced Insights',
    detail: 'Predictions, trends, and recommendations.',
  },
  {
    icon: 'flag',
    title: 'Goal Tracking',
    detail: 'Track savings, budgets, and investment goals.',
  },
  {
    icon: 'documents',
    title: 'Full History',
    detail: 'Access all transactions and account data.',
  },
]

export default function PaywallScreen() {
  const router = useRouter()
  const [packages, setPackages] = useState<PurchasesPackage[]>([])
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const loadOfferings = async () => {
      try {
        const offerings = await Purchases.getOfferings()
        const available = offerings.current?.availablePackages ?? []
        const preferred =
          available.find((item) => item.packageType === PACKAGE_TYPE.ANNUAL) ??
          available[0] ??
          null
        if (isMounted) {
          setPackages(available)
          setSelectedPackage(preferred)
          if (available.length === 0) {
            setError('No subscription plans are available yet.')
          }
        }
      } catch (err) {
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

  const selectedLabel = useMemo(() => {
    if (!selectedPackage) return ''
    const price = selectedPackage.product.priceString
    const title = selectedPackage.product.title
    return `${title} · ${price}`
  }, [selectedPackage])

  const isPayDisabled = isLoading || !selectedPackage || isPurchasing

  const handlePurchase = async () => {
    if (!selectedPackage) return
    setIsPurchasing(true)
    setError(null)
    try {
      const result = await Purchases.purchasePackage(selectedPackage)
      if (result.customerInfo.entitlements.active.premium) {
        router.replace('/(auth)/trial')
        return
      }
      router.replace('/(tabs)')
    } catch (err: any) {
      if (!err?.userCancelled) {
        setError('Purchase failed. Please try again.')
      }
    } finally {
      setIsPurchasing(false)
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
          <Text style={styles.title}>Unlock Your Financial Copilot</Text>
          <Text style={styles.subtitle}>
            Start your 7-day free trial. Face ID to continue.
          </Text>
        </View>

        <View style={styles.featureCard}>
          {features.map((feature) => (
            <View key={feature.title} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={feature.icon} size={16} color={theme.colors.accent} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDetail}>{feature.detail}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.payCard}>
          <Text style={styles.payTitle}>Start 7-Day Free Trial</Text>
          <Text style={styles.paySubtitle}>
            Then $12.99/month or save with annual billing.
          </Text>

          {isLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={theme.colors.accent} />
              <Text style={styles.loadingText}>Loading plans...</Text>
            </View>
          ) : (
            <View style={styles.planList}>
              {packages.map((item) => {
                const isSelected = selectedPackage?.identifier === item.identifier
                return (
                  <Pressable
                    key={item.identifier}
                    style={[styles.planRow, isSelected && styles.planRowSelected]}
                    onPress={() => setSelectedPackage(item)}
                  >
                    <View style={styles.planInfo}>
                      <Text style={styles.planTitle}>{item.product.title}</Text>
                      <Text style={styles.planMeta}>{item.product.priceString}</Text>
                    </View>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={18} color={theme.colors.accent} />
                    ) : (
                      <Ionicons name="ellipse-outline" size={18} color={theme.colors.mutedLight} />
                    )}
                  </Pressable>
                )
              })}
            </View>
          )}

          <Pressable
            style={[styles.applePayButton, isPayDisabled && styles.applePayDisabled]}
            onPress={handlePurchase}
            disabled={isPayDisabled}
          >
            <Ionicons name="logo-apple" size={18} color="#ffffff" />
            <Text style={styles.applePayText}>
              {isPurchasing ? 'Processing...' : 'Pay'}
            </Text>
          </Pressable>
          {selectedLabel ? (
            <Text style={styles.planSelected}>{selectedLabel}</Text>
          ) : null}
          <View style={styles.payNotes}>
            <Text style={styles.payNote}>No charge for 7 days</Text>
            <Text style={styles.payNote}>Cancel anytime</Text>
            <Text style={styles.payNote}>Instant access</Text>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
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
    gap: 20,
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
  featureCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 12,
  },
  featureIcon: {
    height: 28,
    width: 28,
    borderRadius: 9,
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    gap: 4,
  },
  featureTitle: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 14,
    color: theme.colors.ink,
  },
  featureDetail: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  payCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  payTitle: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 16,
    color: theme.colors.ink,
  },
  paySubtitle: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  planList: {
    gap: 10,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  planRowSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentSoft,
  },
  planInfo: {
    gap: 4,
  },
  planTitle: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 14,
    color: theme.colors.ink,
  },
  planMeta: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  applePayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#111111',
    borderRadius: 12,
    paddingVertical: 12,
  },
  applePayDisabled: {
    opacity: 0.6,
  },
  applePayText: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 15,
    color: '#ffffff',
  },
  planSelected: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 12,
    color: theme.colors.muted,
    textAlign: 'center',
  },
  payNotes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  payNote: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.mutedLight,
  },
  error: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 13,
    color: theme.colors.danger,
    textAlign: 'center',
  },
})

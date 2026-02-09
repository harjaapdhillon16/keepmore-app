import { useEffect, useState } from 'react'
import { Linking, Platform, StyleSheet, View } from 'react-native'
import { ActivityIndicator, Button, Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '../../constants/theme'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

type SubscriptionRow = {
  app_user_id: string
  product_id?: string | null
  entitlement_id?: string | null
  period_type?: string | null
  purchase_date?: string | null
  expiration_date?: string | null
  is_active?: boolean | null
  store?: string | null
}

const getManageUrl = () => {
  if (Platform.OS === 'ios') {
    return 'https://apps.apple.com/account/subscriptions'
  }
  if (Platform.OS === 'android') {
    return 'https://play.google.com/store/account/subscriptions'
  }
  return 'https://www.keepmore.finance'
}

export default function SubscriptionScreen() {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('revenuecat_subscriptions')
          .select(
            'app_user_id, product_id, entitlement_id, period_type, purchase_date, expiration_date, is_active, store',
          )
          .eq('app_user_id', user.id)
          .maybeSingle()
        if (error) throw error
        setSubscription(data ?? null)
      } catch {
        setSubscription(null)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [user?.id])

  const handleManage = () => {
    void Linking.openURL(getManageUrl())
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Subscription</Text>
        <Text style={styles.subtitle}>Manage your plan and billing status.</Text>

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={theme.colors.accent} />
            <Text style={styles.loadingText}>Loading subscription...</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Current plan</Text>
            <Text style={styles.cardValue}>
              {subscription?.product_id ?? subscription?.entitlement_id ?? 'Free'}
            </Text>
            <Text style={styles.cardMeta}>
              Status: {subscription?.is_active ? 'Active' : 'Inactive'}
            </Text>
            <Text style={styles.cardMeta}>
              Billing date:{' '}
              {subscription?.expiration_date
                ? new Date(subscription.expiration_date).toLocaleDateString()
                : 'Not available'}
            </Text>
            <Button
              mode="contained"
              onPress={handleManage}
              buttonColor={theme.colors.primary}
              textColor="#ffffff"
              style={styles.manageButton}
            >
              Manage subscription
            </Button>
          </View>
        )}
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
    gap: 16,
  },
  title: {
    fontFamily: theme.fonts.display.regular,
    fontSize: 22,
    color: theme.colors.ink,
  },
  subtitle: {
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
    fontSize: 13,
    color: theme.colors.muted,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  cardLabel: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    color: theme.colors.mutedLight,
  },
  cardValue: {
    fontFamily: theme.fonts.display.regular,
    fontSize: 22,
    color: theme.colors.ink,
  },
  cardMeta: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  manageButton: {
    marginTop: 8,
  },
})

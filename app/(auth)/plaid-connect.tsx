import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '../../constants/theme'
import { useAuth } from '../../contexts/AuthContext'
import { useCurrency } from '../../contexts/CurrencyContext'
import { usePlaid } from '../../hooks/usePlaid'

export default function PlaidConnectScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { setCurrency } = useCurrency()
  const { openLinkFlow, isLoading, error } = usePlaid()
  const [linked, setLinked] = useState(false)
  const [region, setRegion] = useState<'US' | 'CA' | 'OTHER' | null>(null)

  const bullets = [
    'Bank-level encryption',
    'Read-only access',
    'We never move money',
    '12,000+ institutions',
  ]

  const showPlaid = useMemo(() => region === 'US' || region === 'CA', [region])

  const handleConnect = () => {
    openLinkFlow({
      userId: user?.id ?? 'demo-user',
      onSuccess: () => {
        setLinked(true)
        router.replace('/(auth)/syncing')
      },
    })
  }

  const renderFlag = (value: 'US' | 'CA' | 'OTHER') => {
    if (value === 'US') {
      return (
        <View style={styles.flagBase}>
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <View
              key={`us-${index}`}
              style={[
                styles.flagStripe,
                index % 2 === 0 ? styles.flagStripeRed : styles.flagStripeWhite,
              ]}
            />
          ))}
          <View style={styles.flagUsCanton} />
        </View>
      )
    }

    if (value === 'CA') {
      return (
        <View style={[styles.flagBase, styles.flagCanada]}>
          <View style={styles.flagCanadaSide} />
          <View style={styles.flagCanadaCenter} />
          <View style={styles.flagCanadaSide} />
        </View>
      )
    }

    return (
      <View style={[styles.flagBase, styles.flagWorld]}>
        <View style={styles.flagWorldCircle} />
      </View>
    )
  }

  const handleRegionSelect = (value: 'US' | 'CA' | 'OTHER') => {
    setRegion(value)
    if (value === 'US') {
      void setCurrency('USD', { source: 'manual' })
    } else if (value === 'CA') {
      void setCurrency('CAD', { source: 'manual' })
    }
  }

  if (!region) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.countryScreen}>
          <View style={styles.countryHeader}>
            <Text style={styles.kicker}>Step 2 of 7</Text>
            <Text style={styles.countryTitle}>Where are you located?</Text>
            <Text style={styles.subtitle}>
              We will show the best way to connect your accounts.
            </Text>
          </View>

          <View style={styles.countryGrid}>
            {[
              {
                label: 'United States',
                value: 'US',
                helper: 'Connect with Plaid or upload a statement.',
              },
              {
                label: 'Canada',
                value: 'CA',
                helper: 'Connect with Plaid or upload a statement.',
              },
              {
                label: 'Other countries',
                value: 'OTHER',
                helper: 'Upload a bank statement.',
              },
            ].map((option) => (
              <Pressable
                key={option.value}
                onPress={() => handleRegionSelect(option.value as 'US' | 'CA' | 'OTHER')}
                style={({ pressed }) => [
                  styles.countryCard,
                  pressed && styles.countryCardPressed,
                ]}
              >
                <View style={styles.countryRow}>
                  {renderFlag(option.value as 'US' | 'CA' | 'OTHER')}
                  <View style={styles.countryText}>
                    <Text style={styles.countryLabel}>{option.label}</Text>
                    <Text style={styles.countryHelper}>{option.helper}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.kicker}>Step 2 of 7</Text>
          <Text style={styles.title}>Connect Your Accounts</Text>
          <Text style={styles.subtitle}>
            {showPlaid
              ? 'Connect with Plaid or upload a statement.'
              : 'Upload a statement to connect your accounts.'}
          </Text>
        </View>

        <View style={styles.regionRow}>
          <Text style={styles.regionLabel}>
            Country: {region === 'US' ? 'United States' : region === 'CA' ? 'Canada' : 'Other'}
          </Text>
          <Button
            mode="text"
            onPress={() => setRegion(null)}
            labelStyle={styles.changeLabel}
            compact
          >
            Change
          </Button>
        </View>

        <View style={styles.optionsHeader}>
          <Text style={styles.sectionTitle}>Choose a connection method</Text>
          <Text style={styles.optionsSubtitle}>
            {showPlaid
              ? 'Plaid is fastest. Statements are always available.'
              : 'Bank statements are available worldwide.'}
          </Text>
        </View>

        {showPlaid ? (
          <>
            <View style={styles.plaidBadge}>
              <Text style={styles.plaidText}>Plaid</Text>
            </View>

            <View style={styles.card}>
              {bullets.map((item) => (
                <View key={item} style={styles.bulletRow}>
                  <Ionicons name="checkmark-circle" size={18} color={theme.colors.accent} />
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.trustText}>
              Used by Venmo, Robinhood, and millions of users.
            </Text>
          </>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {linked ? <Text style={styles.success}>Account connected.</Text> : null}

        {showPlaid ? (
          <Button
            mode="contained"
            buttonColor={theme.colors.primary}
            textColor="#ffffff"
            style={styles.primaryButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.primaryLabel}
            onPress={handleConnect}
            loading={isLoading}
            disabled={isLoading}
          >
            Connect with Plaid
          </Button>
        ) : null}

        <Button
          mode="outlined"
          style={styles.secondaryButton}
          contentStyle={styles.buttonContent}
          labelStyle={styles.secondaryLabel}
          onPress={() => router.push('/(auth)/bank-statement-upload')}
        >
          Upload bank statement
        </Button>

        <Text style={styles.altNote}>
          Plaid is available for the United States and Canada only. Statements work worldwide.
        </Text>
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
  kicker: {
    fontFamily: theme.fonts.body.medium,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontSize: 11,
    color: theme.colors.mutedLight,
  },
  title: {
    fontFamily: theme.fonts.display.regular,
    fontSize: 28,
    color: theme.colors.ink,
  },
  subtitle: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.muted,
  },
  countryScreen: {
    flex: 1,
    padding: theme.spacing.page,
    gap: 20,
    justifyContent: 'center',
  },
  countryHeader: {
    gap: 8,
  },
  countryTitle: {
    fontFamily: theme.fonts.display.regular,
    fontSize: 30,
    color: theme.colors.ink,
  },
  countryGrid: {
    gap: 14,
  },
  countryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    ...theme.shadows.card,
  },
  countryCardPressed: {
    transform: [{ scale: 0.98 }],
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  countryText: {
    flex: 1,
    gap: 4,
  },
  countryLabel: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 16,
    color: theme.colors.ink,
  },
  countryHelper: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  flagBase: {
    width: 54,
    height: 36,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  flagStripe: {
    flex: 1,
  },
  flagStripeRed: {
    backgroundColor: '#b91c1c',
  },
  flagStripeWhite: {
    backgroundColor: '#fff7ed',
  },
  flagUsCanton: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '45%',
    height: '50%',
    backgroundColor: '#1e3a8a',
  },
  flagCanada: {
    flexDirection: 'row',
  },
  flagCanadaSide: {
    flex: 1,
    backgroundColor: '#b91c1c',
  },
  flagCanadaCenter: {
    flex: 1.4,
    backgroundColor: '#ffffff',
  },
  flagWorld: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
  },
  flagWorldCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#22c55e',
  },
  plaidBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  plaidText: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 13,
    color: theme.colors.ink,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bulletText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 14,
    color: theme.colors.muted,
  },
  sectionTitle: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 14,
    color: theme.colors.ink,
  },
  regionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  regionLabel: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 13,
    color: theme.colors.muted,
  },
  changeLabel: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 13,
    color: theme.colors.accentStrong,
  },
  optionsHeader: {
    gap: 6,
  },
  optionsSubtitle: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  trustText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 13,
    color: theme.colors.mutedLight,
  },
  error: {
    fontFamily: theme.fonts.body.medium,
    color: theme.colors.danger,
  },
  success: {
    fontFamily: theme.fonts.body.medium,
    color: theme.colors.accentStrong,
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
  secondaryButton: {
    borderRadius: theme.radii.button,
  },
  secondaryLabel: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 14,
  },
  altNote: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.muted,
    textAlign: 'center',
  },
  linkLabel: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 13,
  },
})

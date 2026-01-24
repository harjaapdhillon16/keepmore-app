import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '../../constants/theme'
import { useAuth } from '../../contexts/AuthContext'
import { usePlaid } from '../../hooks/usePlaid'

export default function PlaidConnectScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { openLinkFlow, isLoading, error } = usePlaid()
  const [linked, setLinked] = useState(false)

  const handleConnect = () => {
    openLinkFlow({
      userId: user?.id ?? 'demo-user',
      onSuccess: () => {
        setLinked(true)
        router.replace('/(auth)/syncing')
      },
    })
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.kicker}>Step 3 of 8</Text>
          <Text style={styles.title}>Connect Accounts</Text>
          <Text style={styles.subtitle}>
            Link your primary bank and investment accounts to personalize your insights.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Ionicons name="shield-checkmark" size={18} color={theme.colors.accent} />
            <Text style={styles.cardText}>Bank-grade security through Plaid</Text>
          </View>
          <View style={styles.cardRow}>
            <Ionicons name="lock-closed" size={18} color={theme.colors.accent} />
            <Text style={styles.cardText}>Read-only access. Your money stays put.</Text>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {linked ? <Text style={styles.success}>Account connected.</Text> : null}

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
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 14,
    color: theme.colors.muted,
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
  linkLabel: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 13,
  },
})

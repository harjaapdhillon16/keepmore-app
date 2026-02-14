import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import AuthLegalLinks from '../../components/AuthLegalLinks'
import { theme } from '../../constants/theme'

export default function TrialConfirmationScreen() {
  const router = useRouter()
  const trialEnd = new Date()
  trialEnd.setDate(trialEnd.getDate() + 7)
  const trialEndLabel = trialEnd.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={28} color="#ffffff" />
          </View>
          <Text style={styles.title}>You're All Set!</Text>
          <Text style={styles.subtitle}>
            Your 7-day trial has started. Full access to all features is now active.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Trial ends</Text>
          <Text style={styles.cardValue}>{trialEndLabel}</Text>
          <Text style={styles.cardMeta}>
            You'll be charged $12.99 unless you cancel before then.
          </Text>
          <Text style={styles.cardMeta}>
            Manage your subscription in Settings or the App Store.
          </Text>
        </View>

        <Button
          mode="contained"
          buttonColor={theme.colors.primary}
          textColor="#ffffff"
          style={styles.primaryButton}
          contentStyle={styles.buttonContent}
          labelStyle={styles.primaryLabel}
          onPress={() => router.replace('/(tabs)')}
        >
          Start Using KeepMore
        </Button>

        <AuthLegalLinks />
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
  hero: {
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  checkBadge: {
    height: 64,
    width: 64,
    borderRadius: 22,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: theme.fonts.display.regular,
    fontSize: 28,
    color: theme.colors.ink,
  },
  subtitle: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 14,
    textAlign: 'center',
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
    letterSpacing: 1.2,
    color: theme.colors.mutedLight,
  },
  cardValue: {
    fontFamily: theme.fonts.display.regular,
    fontSize: 24,
    color: theme.colors.ink,
  },
  cardMeta: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.muted,
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

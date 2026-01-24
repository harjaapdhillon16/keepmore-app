import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '../../constants/theme'

const bullets = [
  'Bank-level encryption',
  'Read-only access',
  'We never move money',
  '12,000+ institutions',
]

export default function PlaidIntroScreen() {
  const router = useRouter()

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Connect Your Accounts</Text>
          <Text style={styles.subtitle}>
            We use Plaid to securely connect your bank and investment accounts.
          </Text>
        </View>

        <View style={styles.plaidBadge}>
          <Text style={styles.plaidText}>Plaid</Text>
        </View>

        <View style={styles.card}>
          {bullets.map((item) => (
            <View key={item} style={styles.bulletRow}>
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={theme.colors.accent}
              />
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.trustText}>
          Used by Venmo, Robinhood, and millions of users.
        </Text>

        <Button
          mode="contained"
          buttonColor={theme.colors.primary}
          textColor="#ffffff"
          style={styles.primaryButton}
          contentStyle={styles.buttonContent}
          labelStyle={styles.primaryLabel}
          onPress={() => router.push('/(auth)/plaid-connect')}
        >
          Continue Securely
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
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.muted,
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
  trustText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 13,
    color: theme.colors.mutedLight,
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

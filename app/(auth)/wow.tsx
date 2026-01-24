import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '../../constants/theme'

const spendingRows = [
  { label: 'Dining', value: '$847', change: '↑ 35%' },
  { label: 'Housing', value: '$1,850' },
  { label: 'Transport', value: '$420' },
]

export default function WowMomentScreen() {
  const router = useRouter()

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Here's What We Found</Text>
          <Text style={styles.subtitle}>Your first insights, free preview.</Text>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.cardLabel}>Total Balance</Text>
          <Text style={styles.cardValue}>$52,847</Text>
          <Text style={styles.cardMeta}>Across 3 accounts</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Last Month's Spending</Text>
          <Text style={styles.sectionValue}>$3,420</Text>
        </View>

        <View style={styles.card}>
          {spendingRows.map((row) => (
            <View key={row.label} style={styles.row}>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>{row.value}</Text>
                {row.change ? (
                  <Text style={styles.rowChange}>{row.change}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Ionicons name="sparkles" size={18} color={theme.colors.accent} />
            <Text style={styles.insightTitle}>AI Insight</Text>
          </View>
          <Text style={styles.insightText}>
            Your dining spending is $280 above your 6-month average. By reducing
            30%, you could save $3,000/year.
          </Text>
        </View>

        <Button
          mode="contained"
          buttonColor={theme.colors.primary}
          textColor="#ffffff"
          style={styles.primaryButton}
          contentStyle={styles.buttonContent}
          labelStyle={styles.primaryLabel}
          onPress={() => router.push('/(auth)/paywall')}
        >
          See Full Insights
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
    gap: 20,
  },
  header: {
    gap: 6,
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
  balanceCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.cardLarge,
    padding: 18,
    gap: 6,
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
    fontSize: 28,
    color: theme.colors.ink,
  },
  cardMeta: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.mutedLight,
  },
  section: {
    gap: 6,
  },
  sectionTitle: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: theme.colors.mutedLight,
  },
  sectionValue: {
    fontFamily: theme.fonts.display.regular,
    fontSize: 24,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 14,
    color: theme.colors.ink,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowValue: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 14,
    color: theme.colors.ink,
  },
  rowChange: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 12,
    color: theme.colors.accent,
  },
  insightCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radii.card,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  insightTitle: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 14,
    color: theme.colors.ink,
  },
  insightText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 13,
    lineHeight: 20,
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

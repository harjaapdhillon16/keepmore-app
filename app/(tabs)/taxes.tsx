import { ScrollView, StyleSheet, View } from 'react-native'
import { Button, Chip, Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '../../constants/theme'

const prompts = [
  'What can I deduct this month?',
  'Build a quarterly tax plan',
  'Optimize my savings rate',
  'Should I switch to an S-Corp?',
]

const snapshot = [
  { label: 'Cash runway', value: '6.4 months' },
  { label: 'Tax set-aside', value: '$1,950 / mo' },
  { label: 'Savings rate', value: '22%' },
  { label: 'Next payment', value: 'Jun 15' },
]

const assistantFindings = [
  {
    title: 'Quarterly estimate ready',
    detail: 'Q2 estimate is $2,300. Want a payment schedule?',
  },
  {
    title: 'Deductions detected',
    detail: '8 expenses flagged for review totaling $540.',
  },
  {
    title: 'Expense drift',
    detail: 'Dining spend is up 23% compared to last month.',
  },
]

export default function TaxesScreen() {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>AI Financial Assistant</Text>
          <Text style={styles.subtitle}>
            Ask questions, plan ahead, and get guidance in plain language.
          </Text>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Ask the assistant</Text>
          <Text style={styles.heroDetail}>
            Get instant answers for deductions, planning, and cash flow.
          </Text>
          <Button mode="contained" onPress={() => {}}>
            Start a chat
          </Button>
        </View>

        <Text style={styles.sectionTitle}>Suggested prompts</Text>
        <View style={styles.promptRow}>
          {prompts.map((prompt) => (
            <Chip key={prompt} onPress={() => {}}>
              {prompt}
            </Chip>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Assistant snapshot</Text>
        <View style={styles.snapshotCard}>
          <View style={styles.snapshotGrid}>
            {snapshot.map((item) => (
              <View key={item.label} style={styles.snapshotItem}>
                <Text style={styles.snapshotLabel}>{item.label}</Text>
                <Text style={styles.snapshotValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>What I found</Text>
        {assistantFindings.map((item) => (
          <View key={item.title} style={styles.findingCard}>
            <Text style={styles.findingTitle}>{item.title}</Text>
            <Text style={styles.findingDetail}>{item.detail}</Text>
            <Button mode="text" compact onPress={() => {}}>
              View details
            </Button>
          </View>
        ))}
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
  },
  content: {
    padding: theme.spacing.page,
    gap: 16,
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  subtitle: {
    color: theme.colors.muted,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  heroCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.card,
    borderRadius: theme.radii.card,
    gap: 8,
    ...theme.shadows.card,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  heroDetail: {
    color: theme.colors.muted,
  },
  promptRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  snapshotCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.card,
    borderRadius: theme.radii.card,
    ...theme.shadows.card,
  },
  snapshotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  snapshotItem: {
    flexGrow: 1,
    minWidth: 140,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  snapshotLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    color: theme.colors.mutedLight,
  },
  snapshotValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  findingCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.card,
    borderRadius: theme.radii.card,
    gap: 6,
    ...theme.shadows.card,
  },
  findingTitle: {
    fontWeight: '700',
    color: theme.colors.ink,
  },
  findingDetail: {
    color: theme.colors.muted,
  },
})

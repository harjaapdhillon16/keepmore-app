import { ScrollView, StatusBar, StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import NetWorthCard from '../../components/cards/NetWorthCard'
import InsightCard from '../../components/cards/InsightCard'
import { theme } from '../../constants/theme'

const insights = [
  {
    title: 'Uncategorized expenses',
    description: 'You have $240 in expenses to categorize.',
    cta: 'Categorize now',
  },
  {
    title: 'Tax savings opportunity',
    description: 'Contribute $5,500 to RRSP to save $1,925 in taxes.',
    cta: 'View details',
  },
  {
    title: 'Spending alert',
    description: 'Dining spend is up 23% compared with last month.',
    cta: 'Review spend',
  },
]

const spendingData = [
  { x: 'Housing', y: 32, color: '#0ea5e9' },
  { x: 'Food', y: 21, color: theme.colors.warning },
  { x: 'Transport', y: 12, color: '#8b5cf6' },
  { x: 'Shopping', y: 18, color: '#ef4444' },
  { x: 'Other', y: 17, color: theme.colors.accent },
]

const netWorthTrend = [
  { x: 'Apr', y: 39250 },
  { x: 'May', y: 40500 },
  { x: 'Jun', y: 41240 },
  { x: 'Jul', y: 43110 },
  { x: 'Aug', y: 45820 },
  { x: 'Sep', y: 47382 },
]

const incomeExpense = [
  { x: 'Apr', y: 6800, group: 'Income' },
  { x: 'Apr', y: 4200, group: 'Expenses' },
  { x: 'May', y: 7000, group: 'Income' },
  { x: 'May', y: 4380, group: 'Expenses' },
  { x: 'Jun', y: 6900, group: 'Income' },
  { x: 'Jun', y: 4520, group: 'Expenses' },
  { x: 'Jul', y: 7350, group: 'Income' },
  { x: 'Jul', y: 4610, group: 'Expenses' },
  { x: 'Aug', y: 7200, group: 'Income' },
  { x: 'Aug', y: 4700, group: 'Expenses' },
  { x: 'Sep', y: 7500, group: 'Income' },
  { x: 'Sep', y: 4890, group: 'Expenses' },
]

const incomeExpenseRows = incomeExpense.reduce(
  (rows, item) => {
    const existing = rows.find((row) => row.month === item.x)
    if (!existing) {
      const next = { month: item.x, income: 0, expenses: 0 }
      if (item.group === 'Income') {
        next.income = item.y
      } else {
        next.expenses = item.y
      }
      rows.push(next)
      return rows
    }
    if (item.group === 'Income') {
      existing.income = item.y
    } else {
      existing.expenses = item.y
    }
    return rows
  },
  [] as { month: string; income: number; expenses: number }[],
)

const formatCurrency = (value: number) => `$${value.toLocaleString('en-US')}`

export default function HomeScreen() {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <NetWorthCard amount="$47,382" changeLabel="+$2,147 this month" />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tax savings this year</Text>
          <Text style={styles.cardValue}>$2,847</Text>
          <Button mode="text" compact onPress={() => { }}>
            View details
          </Button>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Insights</Text>
        </View>
        {insights.map((item) => (
          <InsightCard
            key={item.title}
            title={item.title}
            description={item.description}
            cta={item.cta}
          />
        ))}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
        </View>
        <View style={styles.actions}>
          <Button mode="contained" onPress={() => { }}>
            Categorize expenses
          </Button>
          <Button mode="outlined" onPress={() => { }}>
            View tax report
          </Button>
          <Button mode="outlined" onPress={() => { }}>
            Update goals
          </Button>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Spending by category</Text>
        </View>
        <View style={styles.dataCard}>
          <View style={styles.dataGrid}>
            {spendingData.map((item) => (
              <View key={item.x} style={styles.dataGridItem}>
                <View style={styles.dataLabelRow}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={styles.dataLabel}>{item.x}</Text>
                </View>
                <Text style={styles.dataValue}>{item.y}%</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Net worth trend</Text>
        </View>
        <View style={styles.dataCard}>
          {netWorthTrend.map((point, index) => (
            <View
              key={point.x}
              style={[styles.dataRow, index > 0 && styles.dataRowDivider]}
            >
              <Text style={styles.dataLabel}>{point.x}</Text>
              <Text style={styles.dataValueStrong}>{formatCurrency(point.y)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Income vs expenses</Text>
        </View>
        <View style={styles.dataCard}>
          {incomeExpenseRows.map((row, index) => (
            <View
              key={row.month}
              style={[styles.dataRow, index > 0 && styles.dataRowDivider]}
            >
              <Text style={styles.dataLabel}>{row.month}</Text>
              <View style={styles.metricGroup}>
                <View style={styles.metricBlock}>
                  <Text style={styles.metricLabel}>Income</Text>
                  <Text style={styles.metricValuePositive}>
                    {formatCurrency(row.income)}
                  </Text>
                </View>
                <View style={styles.metricBlock}>
                  <Text style={styles.metricLabel}>Expenses</Text>
                  <Text style={styles.metricValueNegative}>
                    {formatCurrency(row.expenses)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
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
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.card,
    borderRadius: theme.radii.card,
    ...theme.shadows.card,
  },
  cardTitle: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
  cardValue: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 6,
    color: theme.colors.ink,
  },
  sectionHeader: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  actions: {
    gap: 12,
  },
  dataCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.card,
    borderRadius: theme.radii.card,
    gap: 12,
    ...theme.shadows.card,
  },
  dataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  dataGridItem: {
    flexGrow: 1,
    minWidth: 140,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  dataLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dataRowDivider: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 12,
    marginTop: 12,
  },
  dataLabel: {
    color: theme.colors.muted,
    fontWeight: '600',
  },
  dataValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  dataValueStrong: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  metricGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metricBlock: {
    alignItems: 'flex-end',
    minWidth: 90,
  },
  metricLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    color: theme.colors.mutedLight,
  },
  metricValuePositive: {
    marginTop: 4,
    fontWeight: '700',
    color: theme.colors.accentStrong,
  },
  metricValueNegative: {
    marginTop: 4,
    fontWeight: '700',
    color: theme.colors.danger,
  },
})

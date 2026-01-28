import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { ActivityIndicator, Chip, Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '../../constants/theme'
import { useAuth } from '../../contexts/AuthContext'
import { usePlaidData } from '../../hooks/usePlaidData'
import {
  formatCurrency,
  formatShortDate,
  getCategoryLabel,
  humanizeLabel,
  parseDate,
  parseJson,
  toNumber,
} from '../../utils/finance'

const filterOptions = [
  { label: 'All', value: 'all' },
  { label: 'This month', value: 'this-month' },
  { label: 'Last month', value: 'last-month' },
  { label: 'Recurring', value: 'recurring' },
]

type NormalizedTransaction = {
  id: string
  amount: number
  date: Date | null
  merchant: string
  category: string
  paymentChannel?: string | null
  pending?: boolean | null
  currency?: string | null
}

type NormalizedRecurring = {
  id: string
  merchant: string
  amount: number
  nextDate: Date | null
  frequency?: string | null
  status?: string | null
  isActive: boolean
  category: string
}

type RecurringAmount = { amount?: number | string }

const getRelativeLabel = (date: Date | null) => {
  if (!date) return 'Unknown'
  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.floor(
    (startOfToday.getTime() - startOfDate.getTime()) / (1000 * 60 * 60 * 24),
  )

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return formatShortDate(date)
}

export default function ExpensesScreen() {
  const { user, status } = useAuth()
  const { transactions, recurring, loading, error } = usePlaidData(user?.id)
  const [activeFilter, setActiveFilter] = useState('all')

  const normalizedTransactions = useMemo<NormalizedTransaction[]>(() => {
    return transactions.map((transaction) => {
      const rawDate = transaction.date ?? transaction.datetime?.split('T')[0] ?? null
      const date = parseDate(rawDate)
      return {
        id: transaction.id,
        amount: toNumber(transaction.amount),
        date,
        merchant: transaction.merchant_name || transaction.name || 'Unknown',
        category: getCategoryLabel(
          transaction.personal_finance_category,
          transaction.category,
        ),
        paymentChannel: transaction.payment_channel,
        pending: transaction.pending,
        currency: transaction.iso_currency_code,
      }
    })
  }, [transactions])

  const normalizedRecurring = useMemo<NormalizedRecurring[]>(() => {
    return recurring.map((row) => {
      const average = parseJson<RecurringAmount>(row.average_amount)
      return {
        id: row.id,
        merchant: row.merchant_name || row.description || 'Recurring charge',
        amount: toNumber(average?.amount),
        nextDate: parseDate(row.predicted_next_date),
        frequency: row.frequency,
        status: row.status,
        isActive: row.is_active ?? false,
        category: getCategoryLabel(row.personal_finance_category),
      }
    })
  }, [recurring])

  const currency =
    normalizedTransactions.find((transaction) => transaction.currency)?.currency ??
    'USD'

  const {
    groupedTransactions,
    summaryTotal,
    summaryCount,
    topCategory,
    recurringBills,
    recurringTotal,
    nextRecurring,
    recurringCount,
  } = useMemo(() => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    const expenses = normalizedTransactions.filter((tx) => tx.amount > 0)

    let filtered = expenses
    if (activeFilter === 'this-month') {
      filtered = expenses.filter((tx) => tx.date && tx.date >= startOfMonth)
    }

    if (activeFilter === 'last-month') {
      filtered = expenses.filter(
        (tx) => tx.date && tx.date >= startOfLastMonth && tx.date <= endOfLastMonth,
      )
    }

    const summary = filtered.reduce((total, tx) => total + tx.amount, 0)

    const categoryTotals = filtered.reduce((acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount
      return acc
    }, {} as Record<string, number>)

    const top = Object.entries(categoryTotals)
      .map(([label, total]) => ({ label, total }))
      .sort((a, b) => b.total - a.total)[0]

    const sorted = [...filtered]
      .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))

    const groups: { label: string; items: NormalizedTransaction[] }[] = []
    const groupMap = new Map<string, { label: string; items: NormalizedTransaction[] }>()

    sorted.forEach((tx) => {
      const label = getRelativeLabel(tx.date)
      const existing = groupMap.get(label)
      if (existing) {
        existing.items.push(tx)
      } else {
        const group = { label, items: [tx] }
        groupMap.set(label, group)
        groups.push(group)
      }
    })

    const activeRecurring = normalizedRecurring.filter((bill) => bill.isActive)
    const upcomingRecurring = [...activeRecurring]
      .sort((a, b) => (a.nextDate?.getTime() ?? 0) - (b.nextDate?.getTime() ?? 0))
      .slice(0, 6)

    const upcomingTotal = upcomingRecurring.reduce(
      (total, bill) => total + bill.amount,
      0,
    )

    return {
      groupedTransactions: groups,
      summaryTotal: summary,
      summaryCount: filtered.length,
      topCategory: top,
      recurringBills: upcomingRecurring,
      recurringTotal: upcomingTotal,
      nextRecurring: upcomingRecurring[0] ?? null,
      recurringCount: activeRecurring.length,
    }
  }, [activeFilter, normalizedRecurring, normalizedTransactions])

  const summaryTitle =
    activeFilter === 'recurring' ? 'Upcoming bills' : 'Total spending'
  const summaryValue =
    activeFilter === 'recurring' ? recurringTotal : summaryTotal
  const summaryCountLabel =
    activeFilter === 'recurring' ? 'Bills' : 'Transactions'

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Expenses</Text>
          <Text style={styles.subtitle}>Track day-to-day spending and upcoming bills.</Text>
        </View>

        {status === 'loading' || loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={theme.colors.accent} />
            <Text style={styles.loadingText}>Loading expenses...</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {!user ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Sign in to view expenses</Text>
            <Text style={styles.emptySubtitle}>
              Your transactions will appear here after you connect a bank account.
            </Text>
          </View>
        ) : null}

        {user ? (
          <View style={styles.summaryCard}>
            <View>
              <Text style={styles.summaryLabel}>{summaryTitle}</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(summaryValue, currency)}
              </Text>
            </View>
            <View style={styles.summaryMetaRow}>
              <Text style={styles.summaryMeta}>{summaryCountLabel}</Text>
              <Text style={styles.summaryMetaValue}>
                {activeFilter === 'recurring' ? recurringCount : summaryCount}
              </Text>
            </View>
            {activeFilter === 'recurring' ? (
              <Text style={styles.summaryFootnote}>
                {nextRecurring?.nextDate
                  ? `Next bill on ${formatShortDate(nextRecurring.nextDate)}.`
                  : 'No upcoming bills scheduled.'}
              </Text>
            ) : topCategory ? (
              <Text style={styles.summaryFootnote}>
                Top category: {topCategory.label} ({formatCurrency(topCategory.total, currency)})
              </Text>
            ) : (
              <Text style={styles.summaryFootnote}>No categories yet.</Text>
            )}
          </View>
        ) : null}

        {user ? (
          <>
            <View style={styles.filters}>
              {filterOptions.map((filter) => {
                const isSelected = filter.value === activeFilter
                return (
                  <Chip
                    key={filter.value}
                    selected={isSelected}
                    onPress={() => setActiveFilter(filter.value)}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    textStyle={[styles.chipText, isSelected && styles.chipTextSelected]}
                  >
                    {filter.label}
                  </Chip>
                )
              })}
            </View>

            {activeFilter === 'recurring' ? (
              <View style={styles.group}>
                <Text style={styles.groupLabel}>Recurring bills</Text>
                <View style={styles.listCard}>
                  {recurringBills.length === 0 ? (
                    <Text style={styles.emptyListText}>No recurring transactions yet.</Text>
                  ) : (
                    recurringBills.map((bill) => (
                      <View key={bill.id} style={styles.row}>
                        <View>
                          <Text style={styles.merchant}>{bill.merchant}</Text>
                          <Text style={styles.category}>
                            {bill.category} -{' '}
                            {bill.frequency ? humanizeLabel(bill.frequency) : 'One-time'}
                          </Text>
                          {bill.status ? (
                            <Text style={styles.status}>{humanizeLabel(bill.status)}</Text>
                          ) : null}
                        </View>
                        <View style={styles.rowRight}>
                          <Text style={styles.amount}>
                            {formatCurrency(bill.amount, currency)}
                          </Text>
                          <Text style={styles.date}>{formatShortDate(bill.nextDate)}</Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </View>
            ) : groupedTransactions.length === 0 ? (
              <View style={styles.listCard}>
                <Text style={styles.emptyListText}>
                  No expenses found for this time period.
                </Text>
              </View>
            ) : (
              groupedTransactions.map((group) => (
                <View key={group.label} style={styles.group}>
                  <Text style={styles.groupLabel}>{group.label}</Text>
                  {group.items.map((item) => (
                    <View key={`${group.label}-${item.id}`} style={styles.row}>
                      <View>
                        <Text style={styles.merchant}>{item.merchant}</Text>
                        <View style={styles.metaRow}>
                          <Text style={styles.category}>{item.category}</Text>
                          {item.paymentChannel ? (
                            <View style={styles.badge}>
                              <Text style={styles.badgeText}>
                                {humanizeLabel(item.paymentChannel)}
                              </Text>
                            </View>
                          ) : null}
                          {item.pending ? (
                            <View style={styles.badgePending}>
                              <Text style={styles.badgePendingText}>Pending</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                      <View style={styles.rowRight}>
                        <Text style={styles.amount}>
                          {formatCurrency(item.amount, currency)}
                        </Text>
                        <Text style={styles.date}>{formatShortDate(item.date)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))
            )}
          </>
        ) : null}
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
    fontFamily: theme.fonts.display.regular,
    fontSize: 24,
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
    gap: 10,
  },
  loadingText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  errorCard: {
    backgroundColor: theme.colors.dangerSoft,
    borderRadius: theme.radii.card,
    padding: 12,
  },
  errorText: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 13,
    color: theme.colors.danger,
  },
  emptyState: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  emptyTitle: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 15,
    color: theme.colors.ink,
  },
  emptySubtitle: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    padding: theme.spacing.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
    ...theme.shadows.card,
  },
  summaryLabel: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: theme.colors.mutedLight,
  },
  summaryValue: {
    fontFamily: theme.fonts.display.regular,
    fontSize: 24,
    color: theme.colors.ink,
  },
  summaryMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryMeta: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.mutedLight,
  },
  summaryMetaValue: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 12,
    color: theme.colors.ink,
  },
  summaryFootnote: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  chipSelected: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accentSoft,
  },
  chipText: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 12,
    color: theme.colors.muted,
  },
  chipTextSelected: {
    color: theme.colors.accentStrong,
  },
  group: {
    gap: 12,
  },
  groupLabel: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    color: theme.colors.mutedLight,
  },
  listCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    padding: theme.spacing.card,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  row: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.card,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...theme.shadows.card,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  merchant: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 15,
    color: theme.colors.ink,
  },
  category: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.mutedLight,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  badge: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  badgeText: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 10,
    color: theme.colors.muted,
  },
  badgePending: {
    backgroundColor: theme.colors.warning,
    borderRadius: theme.radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgePendingText: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 10,
    color: '#ffffff',
  },
  amount: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 14,
    color: theme.colors.danger,
  },
  date: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 11,
    color: theme.colors.mutedLight,
    marginTop: 4,
  },
  status: {
    marginTop: 4,
    fontFamily: theme.fonts.body.medium,
    fontSize: 11,
    color: theme.colors.accent,
  },
  emptyListText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
})

import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { ActivityIndicator, Button, Chip, Modal, Portal, Text, TextInput } from 'react-native-paper'
import { DatePickerModal } from 'react-native-paper-dates'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '../../constants/theme'
import { useAuth } from '../../contexts/AuthContext'
import { usePlaidData } from '../../hooks/usePlaidData'
import { useBudget } from '../../hooks/useBudget'
import {
  formatCurrency,
  formatLongDate,
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
  { label: 'Custom', value: 'custom' },
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
  const { budget, loading: budgetLoading, saveBudget } = useBudget(user?.id)
  const [activeFilter, setActiveFilter] = useState('all')
  const [budgetModalOpen, setBudgetModalOpen] = useState(false)
  const [budgetValue, setBudgetValue] = useState('')
  const [budgetError, setBudgetError] = useState<string | null>(null)
  const [isSavingBudget, setIsSavingBudget] = useState(false)
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null)
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null)
  const [showStartDatePicker, setShowStartDatePicker] = useState(false)
  const [showEndDatePicker, setShowEndDatePicker] = useState(false)

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
    currentMonthTotal,
    recurringBills,
    recurringTotal,
    nextRecurring,
    recurringCount,
  } = useMemo(() => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    const startOfCustom =
      customStartDate &&
      new Date(
        customStartDate.getFullYear(),
        customStartDate.getMonth(),
        customStartDate.getDate(),
      )
    const endOfCustom =
      customEndDate &&
      new Date(
        customEndDate.getFullYear(),
        customEndDate.getMonth(),
        customEndDate.getDate(),
        23,
        59,
        59,
        999,
      )

    const expenses = normalizedTransactions.filter((tx) => tx.amount > 0)
    const currentMonthExpenses = expenses.filter(
      (tx) => tx.date && tx.date >= startOfMonth,
    )

    let filtered = expenses
    if (activeFilter === 'this-month') {
      filtered = expenses.filter((tx) => tx.date && tx.date >= startOfMonth)
    }

    if (activeFilter === 'last-month') {
      filtered = expenses.filter(
        (tx) => tx.date && tx.date >= startOfLastMonth && tx.date <= endOfLastMonth,
      )
    }

    if (activeFilter === 'custom') {
      filtered = expenses.filter((tx) => {
        if (!tx.date) return false
        const time = tx.date.getTime()
        if (startOfCustom && time < startOfCustom.getTime()) return false
        if (endOfCustom && time > endOfCustom.getTime()) return false
        return true
      })
    }

    const summary = filtered.reduce((total, tx) => total + tx.amount, 0)
    const currentMonthSum = currentMonthExpenses.reduce(
      (total, tx) => total + tx.amount,
      0,
    )

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
      currentMonthTotal: currentMonthSum,
      recurringBills: upcomingRecurring,
      recurringTotal: upcomingTotal,
      nextRecurring: upcomingRecurring[0] ?? null,
      recurringCount: activeRecurring.length,
    }
  }, [
    activeFilter,
    customEndDate,
    customStartDate,
    normalizedRecurring,
    normalizedTransactions,
  ])

  const summaryTitle =
    activeFilter === 'recurring' ? 'Upcoming bills' : 'Total spending'
  const summaryValue =
    activeFilter === 'recurring' ? recurringTotal : summaryTotal
  const summaryCountLabel =
    activeFilter === 'recurring' ? 'Bills' : 'Transactions'

  const budgetAmount = budget?.amount ?? 0
  const spentThisMonth = currentMonthTotal
  const budgetProgress =
    budgetAmount > 0 ? Math.min(spentThisMonth / budgetAmount, 1) : 0
  const budgetRemaining = budgetAmount - spentThisMonth
  const budgetFillColor =
    budgetAmount > 0 && budgetRemaining < 0 ? theme.colors.danger : theme.colors.accent
  const budgetStatus =
    budgetAmount <= 0
      ? 'Set a monthly budget to stay on track.'
      : budgetRemaining >= 0
        ? `${formatCurrency(budgetRemaining, currency)} remaining this month`
        : `${formatCurrency(Math.abs(budgetRemaining), currency)} over budget`

  const openBudgetModal = () => {
    setBudgetValue(budgetAmount ? String(budgetAmount) : '')
    setBudgetError(null)
    setBudgetModalOpen(true)
  }

  const handleSaveBudget = async () => {
    const parsed = Number(budgetValue)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setBudgetError('Enter a valid amount greater than 0.')
      return
    }

    setIsSavingBudget(true)
    setBudgetError(null)

    try {
      await saveBudget(parsed)
      setBudgetModalOpen(false)
    } catch (err) {
      setBudgetError(err instanceof Error ? err.message : 'Unable to save budget.')
    } finally {
      setIsSavingBudget(false)
    }
  }

  const handleStartDateConfirm = ({ date }: { date: Date }) => {
    setShowStartDatePicker(false)
    setCustomStartDate(date)
    if (customEndDate && date.getTime() > customEndDate.getTime()) {
      setCustomEndDate(null)
    }
    if (activeFilter !== 'custom') {
      setActiveFilter('custom')
    }
  }

  const handleEndDateConfirm = ({ date }: { date: Date }) => {
    setShowEndDatePicker(false)
    if (customStartDate && date.getTime() < customStartDate.getTime()) {
      setCustomStartDate(date)
    }
    setCustomEndDate(date)
    if (activeFilter !== 'custom') {
      setActiveFilter('custom')
    }
  }

  const clearCustomRange = () => {
    setCustomStartDate(null)
    setCustomEndDate(null)
  }

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
            <View style={styles.budgetCard}>
              <View style={styles.budgetHeader}>
                <View>
                  <Text style={styles.budgetLabel}>Monthly budget</Text>
                  <Text style={styles.budgetValue}>
                    {budgetLoading
                      ? 'Loading...'
                      : budgetAmount > 0
                        ? formatCurrency(budgetAmount, currency)
                        : 'No budget set'}
                  </Text>
                </View>
                <Button
                  mode="text"
                  onPress={openBudgetModal}
                  disabled={budgetLoading}
                  textColor={theme.colors.accentStrong}
                >
                  {budgetAmount > 0 ? 'Edit' : 'Set budget'}
                </Button>
              </View>
              <View style={styles.budgetTrack}>
                <View
                  style={[
                    styles.budgetFill,
                    { width: `${budgetProgress * 100}%`, backgroundColor: budgetFillColor },
                  ]}
                />
              </View>
              <Text style={styles.budgetStatus}>{budgetStatus}</Text>
            </View>

            <View style={styles.filters}>
              {filterOptions.map((filter) => {
                const isSelected = filter.value === activeFilter
                return (
                  <Chip
                    key={filter.value}
                    selected={isSelected}
                    onPress={() => {
                      setActiveFilter(filter.value)
                      if (filter.value === 'custom' && !customStartDate) {
                        setShowStartDatePicker(true)
                      }
                    }}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    textStyle={[styles.chipText, isSelected && styles.chipTextSelected]}
                  >
                    {filter.label}
                  </Chip>
                )
              })}
            </View>

            {activeFilter === 'custom' ? (
              <View style={styles.customRangeCard}>
                <Text style={styles.customRangeTitle}>Custom range</Text>
                <View style={styles.customRangeRow}>
                  <View style={styles.customRangeField}>
                    <Text style={styles.customRangeLabel}>From</Text>
                    <Button
                      mode="outlined"
                      icon="calendar"
                      onPress={() => setShowStartDatePicker(true)}
                      style={styles.customRangeButton}
                      contentStyle={styles.customRangeButtonContent}
                      textColor={theme.colors.ink}
                    >
                      {customStartDate
                        ? formatLongDate(customStartDate)
                        : 'Select date'}
                    </Button>
                  </View>
                  <View style={styles.customRangeField}>
                    <Text style={styles.customRangeLabel}>To</Text>
                    <Button
                      mode="outlined"
                      icon="calendar"
                      onPress={() => setShowEndDatePicker(true)}
                      style={styles.customRangeButton}
                      contentStyle={styles.customRangeButtonContent}
                      textColor={theme.colors.ink}
                    >
                      {customEndDate ? formatLongDate(customEndDate) : 'Select date'}
                    </Button>
                  </View>
                </View>
                {customStartDate || customEndDate ? (
                  <Button
                    mode="text"
                    onPress={clearCustomRange}
                    textColor={theme.colors.muted}
                    compact
                  >
                    Clear dates
                  </Button>
                ) : (
                  <Text style={styles.customRangeHint}>
                    Select a start and end date to filter expenses.
                  </Text>
                )}
              </View>
            ) : null}

            {activeFilter === 'recurring' ? (
              <View style={styles.group}>
                <Text style={styles.groupLabel}>Recurring bills</Text>
                <View style={styles.listCard}>
                  {recurringBills.length === 0 ? (
                    <Text style={styles.emptyListText}>No recurring transactions yet.</Text>
                  ) : (
                    recurringBills.map((bill, index) => (
                      <View
                        key={bill.id}
                        style={[styles.row, index > 0 && styles.rowDivider]}
                      >
                      <View style={styles.rowLeft}>
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
                          <Text
                            style={styles.amount}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
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
                  {group.items.map((item, index) => (
                    <View
                      key={`${group.label}-${item.id}`}
                      style={[styles.row, index > 0 && styles.rowDivider]}
                    >
                      <View style={styles.rowLeft}>
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
                        <Text
                          style={styles.amount}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
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

      <Portal>
        <Modal
          visible={budgetModalOpen}
          onDismiss={() => setBudgetModalOpen(false)}
          contentContainerStyle={styles.budgetModal}
        >
          <Text style={styles.budgetModalTitle}>Set monthly budget</Text>
          <Text style={styles.budgetModalSubtitle}>
            Track your spending against a monthly limit.
          </Text>
          <TextInput
            label="Monthly budget"
            value={budgetValue}
            onChangeText={setBudgetValue}
            keyboardType="numeric"
            mode="outlined"
            style={styles.budgetInput}
            outlineColor={theme.colors.border}
            activeOutlineColor={theme.colors.accent}
            left={<TextInput.Affix text="$" />}
          />
          {budgetError ? <Text style={styles.budgetError}>{budgetError}</Text> : null}
          <View style={styles.budgetActions}>
            <Button mode="text" onPress={() => setBudgetModalOpen(false)}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSaveBudget}
              loading={isSavingBudget}
              buttonColor={theme.colors.primary}
              textColor="#ffffff"
            >
              Save
            </Button>
          </View>
        </Modal>
      </Portal>

      <DatePickerModal
        locale="en"
        mode="single"
        visible={showStartDatePicker}
        onDismiss={() => setShowStartDatePicker(false)}
        date={customStartDate ?? new Date()}
        onConfirm={handleStartDateConfirm}
        saveLabel="Confirm"
        label="Select start date"
      />

      <DatePickerModal
        locale="en"
        mode="single"
        visible={showEndDatePicker}
        onDismiss={() => setShowEndDatePicker(false)}
        date={customEndDate ?? customStartDate ?? new Date()}
        onConfirm={handleEndDateConfirm}
        saveLabel="Confirm"
        label="Select end date"
      />
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
  customRangeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    padding: theme.spacing.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
    ...theme.shadows.card,
  },
  customRangeTitle: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    color: theme.colors.mutedLight,
  },
  customRangeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  customRangeField: {
    flex: 1,
    gap: 6,
  },
  customRangeLabel: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 12,
    color: theme.colors.muted,
  },
  customRangeButton: {
    borderColor: theme.colors.border,
  },
  customRangeButtonContent: {
    justifyContent: 'flex-start',
  },
  customRangeHint: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.muted,
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
  budgetCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    padding: theme.spacing.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
    ...theme.shadows.card,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetLabel: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    color: theme.colors.mutedLight,
  },
  budgetValue: {
    fontFamily: theme.fonts.display.regular,
    fontSize: 22,
    color: theme.colors.ink,
    marginTop: 4,
  },
  budgetTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceAlt,
    overflow: 'hidden',
  },
  budgetFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: theme.colors.accent,
  },
  budgetStatus: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  budgetModal: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 20,
    borderRadius: theme.radii.cardLarge,
    padding: 20,
    gap: 10,
  },
  budgetModalTitle: {
    fontFamily: theme.fonts.display.regular,
    fontSize: 20,
    color: theme.colors.ink,
  },
  budgetModalSubtitle: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  budgetInput: {
    backgroundColor: theme.colors.surface,
    marginTop: 8,
  },
  budgetError: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 12,
    color: theme.colors.danger,
  },
  budgetActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 12,
    marginTop: 12,
  },
  rowRight: {
    alignItems: 'flex-end',
    width: 110,
    flexShrink: 0,
    overflow: 'hidden',
  },
  rowLeft: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
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
    textAlign: 'right',
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

import { useMemo, useState } from 'react'
import { ScrollView, StatusBar, StyleSheet, View, Modal, Pressable } from 'react-native'
import { ActivityIndicator, Button, Text, IconButton, Chip } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import NetWorthCard from '../../components/cards/NetWorthCard'
import InsightCard from '../../components/cards/InsightCard'
import { theme } from '../../constants/theme'
import { useAuth } from '../../contexts/AuthContext'
import { usePlaidData } from '../../hooks/usePlaidData'
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

const fallbackInsights = [
  {
    title: 'You are on track',
    description: 'New insights will appear as more transactions settle.',
    cta: 'Check back',
  },
]

type NormalizedTransaction = {
  id: string
  amount: number
  date: Date | null
  rawDate?: string | null
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

type ModalType = 'categories' | 'bills' | 'transaction' | null

export default function HomeScreen() {
  const { user, status } = useAuth()
  const { transactions, recurring, loading, error } = usePlaidData(user?.id)
  const [modalType, setModalType] = useState<ModalType>(null)
  const [selectedTransaction, setSelectedTransaction] = useState<NormalizedTransaction | null>(null)

  const normalizedTransactions = useMemo<NormalizedTransaction[]>(() => {
    return transactions.map((transaction) => {
      const rawDate = transaction.date ?? transaction.datetime?.split('T')[0] ?? null
      const date = parseDate(rawDate)
      const merchant = transaction.merchant_name || transaction.name || 'Unknown'
      const category = getCategoryLabel(
        transaction.personal_finance_category,
        transaction.category,
      )
      return {
        id: transaction.id,
        amount: toNumber(transaction.amount),
        date,
        rawDate,
        merchant,
        category,
        paymentChannel: transaction.payment_channel,
        pending: transaction.pending,
        currency: transaction.iso_currency_code,
      }
    })
  }, [transactions])

  const normalizedRecurring = useMemo<NormalizedRecurring[]>(() => {
    return recurring.map((row) => {
      const average = parseJson<RecurringAmount>(row.average_amount)
      const amount = toNumber(average?.amount)
      return {
        id: row.id,
        merchant: row.merchant_name || row.description || 'Upcoming charge',
        amount,
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
    monthExpenses,
    monthIncome,
    netFlow,
    lastMonthNet,
    hasLastMonth,
    topCategories,
    largestExpense,
    upcomingBills,
    upcomingTotal,
    recentTransactions,
    lastActivityDate,
    insights,
    allCategories,
  } = useMemo(() => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    const posted = normalizedTransactions.filter((tx) => !tx.pending)
    const expenses = posted.filter((tx) => tx.amount > 0)
    const income = posted.filter((tx) => tx.amount < 0)

    const monthExpensesList = expenses.filter(
      (tx) => tx.date && tx.date >= startOfMonth,
    )
    const monthIncomeList = income.filter(
      (tx) => tx.date && tx.date >= startOfMonth,
    )

    const lastMonthExpensesList = expenses.filter(
      (tx) => tx.date && tx.date >= startOfLastMonth && tx.date <= endOfLastMonth,
    )
    const lastMonthIncomeList = income.filter(
      (tx) => tx.date && tx.date >= startOfLastMonth && tx.date <= endOfLastMonth,
    )

    const sum = (items: NormalizedTransaction[]) =>
      items.reduce((total, item) => total + item.amount, 0)

    const monthExpensesTotal = sum(monthExpensesList)
    const monthIncomeTotal = Math.abs(sum(monthIncomeList))
    const lastMonthExpensesTotal = sum(lastMonthExpensesList)
    const lastMonthIncomeTotal = Math.abs(sum(lastMonthIncomeList))

    const netFlowTotal = monthIncomeTotal - monthExpensesTotal
    const lastMonthNetTotal = lastMonthIncomeTotal - lastMonthExpensesTotal
    const hasLastMonthData =
      lastMonthExpensesTotal > 0 || lastMonthIncomeTotal > 0

    const change =
      lastMonthExpensesTotal > 0
        ? (monthExpensesTotal - lastMonthExpensesTotal) / lastMonthExpensesTotal
        : null

    const categoryTotals = monthExpensesList.reduce((acc, tx) => {
      if (!acc[tx.category]) {
        acc[tx.category] = {
          category: tx.category,
          total: 0,
          count: 0,
          transactions: [],
        }
      }
      acc[tx.category].total += tx.amount
      acc[tx.category].count += 1
      acc[tx.category].transactions.push(tx)
      return acc
    }, {} as Record<string, { category: string; total: number; count: number; transactions: NormalizedTransaction[] }>)

    const allCats = Object.values(categoryTotals).sort((a, b) => b.total - a.total)
    const topCategoryRows = allCats.slice(0, 4).map(c => ({ label: c.category, total: c.total }))

    const largest = monthExpensesList.reduce<NormalizedTransaction | null>(
      (current, tx) => (!current || tx.amount > current.amount ? tx : current),
      null,
    )

    const upcomingRangeEnd = new Date(now)
    upcomingRangeEnd.setDate(now.getDate() + 30)

    const upcoming = normalizedRecurring
      .filter((bill) =>
        bill.isActive &&
        bill.nextDate &&
        bill.nextDate >= now &&
        bill.nextDate <= upcomingRangeEnd,
      )
      .sort((a, b) => {
        if (!a.nextDate || !b.nextDate) return 0
        return a.nextDate.getTime() - b.nextDate.getTime()
      })
      .slice(0, 4)

    const upcomingTotalValue = upcoming.reduce(
      (total, bill) => total + bill.amount,
      0,
    )

    const recent = [...posted]
      .filter((tx) => tx.date)
      .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))
      .slice(0, 5)

    const lastActivity = recent[0]?.date ?? null

    const insightItems: { title: string; description: string; cta: string }[] = []

    if (change !== null) {
      const trend = change >= 0 ? 'up' : 'down'
      const percentage = Math.abs(change * 100).toFixed(0)
      insightItems.push({
        title: `Spending is ${trend} ${percentage}%`,
        description: 'Compared with last month based on posted transactions.',
        cta: 'Review spend',
      })
    }

    if (topCategoryRows[0]) {
      insightItems.push({
        title: `${topCategoryRows[0].label} leads this month`,
        description: `${formatCurrency(topCategoryRows[0].total, currency)} spent so far.`,
        cta: 'View categories',
      })
    }

    if (largest) {
      insightItems.push({
        title: 'Largest purchase',
        description: `${largest.merchant} for ${formatCurrency(largest.amount, currency)}.`,
        cta: 'View transaction',
      })
    }

    if (upcoming.length > 0) {
      const lastBillDate = upcoming[upcoming.length - 1]?.nextDate
      insightItems.push({
        title: 'Upcoming bills',
        description: `${upcoming.length} due by ${formatShortDate(lastBillDate)} totaling ${formatCurrency(upcomingTotalValue, currency)}.`,
        cta: 'Manage bills',
      })
    }

    return {
      monthExpenses: monthExpensesTotal,
      monthIncome: monthIncomeTotal,
      netFlow: netFlowTotal,
      lastMonthNet: lastMonthNetTotal,
      hasLastMonth: hasLastMonthData,
      topCategories: topCategoryRows,
      largestExpense: largest,
      upcomingBills: upcoming,
      upcomingTotal: upcomingTotalValue,
      recentTransactions: recent,
      lastActivityDate: lastActivity,
      insights: insightItems,
      allCategories: allCats,
    }
  }, [currency, normalizedRecurring, normalizedTransactions])

  const netChange = netFlow - lastMonthNet
  const netChangeLabel = hasLastMonth
    ? `${netChange >= 0 ? '+' : ''}${formatCurrency(netChange, currency)} vs last month`
    : 'No previous month data'

  const formattedNetFlow = formatCurrency(netFlow, currency)
  const formattedMonthExpenses = formatCurrency(monthExpenses, currency)
  const formattedMonthIncome = formatCurrency(monthIncome, currency)
  const formattedUpcomingTotal = formatCurrency(upcomingTotal, currency)

  const hasData = normalizedTransactions.length > 0 || normalizedRecurring.length > 0

  const handleInsightPress = (cta: string) => {
    if (cta === 'Review spend' || cta === 'View categories') {
      setModalType('categories')
    } else if (cta === 'View transaction') {
      if (largestExpense) {
        setSelectedTransaction(largestExpense)
        setModalType('transaction')
      }
    } else if (cta === 'Manage bills') {
      setModalType('bills')
    }
  }

  const handleTransactionPress = (tx: NormalizedTransaction) => {
    setSelectedTransaction(tx)
    setModalType('transaction')
  }

  const closeModal = () => {
    setModalType(null)
    setSelectedTransaction(null)
  }

  const totalSpending = allCategories.reduce((sum, cat) => sum + cat.total, 0)

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your finances</Text>
          <Text style={styles.headerSubtitle}>
            {user
              ? `Latest activity ${lastActivityDate ? formatLongDate(lastActivityDate) : 'this month'}`
              : 'Sign in to see your latest activity.'}
          </Text>
        </View>

        {status === 'loading' || loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={theme.colors.accent} />
            <Text style={styles.loadingText}>Pulling your latest transactions...</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {!user ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Connect a bank account</Text>
            <Text style={styles.emptySubtitle}>
              Sign in to see spending insights, cash flow trends, and upcoming bills.
            </Text>
          </View>
        ) : null}

        {user && !hasData && !loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No transactions yet</Text>
            <Text style={styles.emptySubtitle}>
              Once your bank finishes syncing, your spending insights will appear here.
            </Text>
          </View>
        ) : null}

        {user && hasData ? (
          <>
            <NetWorthCard
              label="Monthly cash flow"
              amount={formattedNetFlow}
              changeLabel={netChangeLabel}
            />

            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Spent this month</Text>
                <Text style={styles.summaryValue}>{formattedMonthExpenses}</Text>
                <Text style={styles.summaryMeta}>Posted expenses</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Income this month</Text>
                <Text style={styles.summaryValue}>{formattedMonthIncome}</Text>
                <Text style={styles.summaryMeta}>Credits received</Text>
              </View>
              <View style={styles.summaryCardWide}>
                <Text style={styles.summaryLabel}>Upcoming bills (30 days)</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryValue}>{formattedUpcomingTotal}</Text>
                  <Text style={styles.summaryMeta}>from {upcomingBills.length} bills</Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Insights</Text>
            </View>
            {(insights.length ? insights : fallbackInsights).map((item) => (
              <InsightCard
                key={item.title}
                title={item.title}
                description={item.description}
                cta={item.cta}
                onPress={item.cta !== 'Check back' ? () => handleInsightPress(item.cta) : undefined}
              />
            ))}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming bills</Text>
            </View>
            <View style={styles.listCard}>
              {upcomingBills.length === 0 ? (
                <Text style={styles.emptyListText}>
                  No recurring bills due in the next 30 days.
                </Text>
              ) : (
                upcomingBills.map((bill) => (
                  <Pressable
                    key={bill.id}
                    style={styles.listRow}
                    onPress={() => setModalType('bills')}
                  >
                    <View>
                      <Text style={styles.listTitle}>{bill.merchant}</Text>
                      <Text style={styles.listMeta}>
                        {bill.category} - {bill.frequency ? humanizeLabel(bill.frequency) : 'One-time'}
                      </Text>
                    </View>
                    <View style={styles.listRight}>
                      <Text style={styles.listAmount}>
                        {formatCurrency(bill.amount, currency)}
                      </Text>
                      <Text style={styles.listMeta}>{formatShortDate(bill.nextDate)}</Text>
                    </View>
                  </Pressable>
                ))
              )}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top categories</Text>
            </View>
            <View style={styles.listCard}>
              {topCategories.length === 0 ? (
                <Text style={styles.emptyListText}>
                  Add transactions to see category trends.
                </Text>
              ) : (
                topCategories.map((category) => {
                  const max = topCategories[0]?.total ?? 0
                  const ratio = max ? Math.max(category.total / max, 0.1) : 0.1
                  return (
                    <Pressable
                      key={category.label}
                      style={styles.categoryRow}
                      onPress={() => setModalType('categories')}
                    >
                      <View style={styles.categoryHeader}>
                        <Text style={styles.listTitle}>{category.label}</Text>
                        <Text style={styles.listAmount}>
                          {formatCurrency(category.total, currency)}
                        </Text>
                      </View>
                      <View style={styles.categoryTrack}>
                        <View
                          style={[styles.categoryFill, { width: `${ratio * 100}%` }]}
                        />
                      </View>
                    </Pressable>
                  )
                })
              )}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent transactions</Text>
            </View>
            <View style={styles.listCard}>
              {recentTransactions.length === 0 ? (
                <Text style={styles.emptyListText}>
                  No recent transactions available yet.
                </Text>
              ) : (
                recentTransactions.map((tx) => (
                  <Pressable
                    key={tx.id}
                    style={styles.listRow}
                    onPress={() => handleTransactionPress(tx)}
                  >
                    <View>
                      <Text style={styles.listTitle}>{tx.merchant}</Text>
                      <Text style={styles.listMeta}>
                        {tx.category} - {formatShortDate(tx.date)}
                      </Text>
                    </View>
                    <View style={styles.listRight}>
                      <Text
                        style={[
                          styles.listAmount,
                          tx.amount < 0 && styles.listAmountPositive,
                        ]}
                      >
                        {formatCurrency(tx.amount, currency)}
                      </Text>
                      <Text style={styles.listMeta}>
                        {tx.paymentChannel
                          ? `Paid ${humanizeLabel(tx.paymentChannel)}`
                          : 'Payment'}
                      </Text>
                    </View>
                  </Pressable>
                ))
              )}
            </View>

            {largestExpense ? (
              <View style={styles.sectionHeader}>
                <Button mode="text" onPress={() => setModalType('categories')}>
                  Review {largestExpense.category} activity
                </Button>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {/* Categories Modal */}
      <Modal
        visible={modalType === 'categories'}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Categories</Text>
            <IconButton
              icon="close"
              size={24}
              onPress={closeModal}
              style={styles.modalCloseButton}
            />
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.modalSummaryCard}>
              <Text style={styles.modalSummaryLabel}>Total Spending</Text>
              <Text style={styles.modalSummaryValue}>
                {formatCurrency(totalSpending, currency)}
              </Text>
              <Text style={styles.modalSummaryMeta}>
                Across {allCategories.length} categories this month
              </Text>
            </View>

            {allCategories.map((category) => {
              const percentage = totalSpending > 0 ? (category.total / totalSpending) * 100 : 0
              const barWidth = Math.max(percentage, 5)

              return (
                <View key={category.category} style={styles.modalCategoryCard}>
                  <View style={styles.modalCategoryHeader}>
                    <View style={styles.modalCategoryLeft}>
                      <Text style={styles.modalCategoryName}>{category.category}</Text>
                      <Text style={styles.modalCategoryMeta}>
                        {category.count} {category.count === 1 ? 'transaction' : 'transactions'}
                      </Text>
                    </View>
                    <View style={styles.modalCategoryRight}>
                      <Text style={styles.modalCategoryAmount}>
                        {formatCurrency(category.total, currency)}
                      </Text>
                      <Text style={styles.modalCategoryPercentage}>
                        {percentage.toFixed(1)}%
                      </Text>
                    </View>
                  </View>

                  <View style={styles.modalCategoryBarTrack}>
                    <View
                      style={[styles.modalCategoryBarFill, { width: `${barWidth}%` }]}
                    />
                  </View>

                  <View style={styles.modalTransactionsList}>
                    {category.transactions.slice(0, 3).map((tx) => (
                      <Pressable
                        key={tx.id}
                        style={styles.modalMiniTransaction}
                        onPress={() => {
                          setSelectedTransaction(tx)
                          setModalType('transaction')
                        }}
                      >
                        <View style={styles.modalMiniTransactionLeft}>
                          <Text style={styles.modalMiniTransactionMerchant} numberOfLines={1}>
                            {tx.merchant}
                          </Text>
                          <Text style={styles.modalMiniTransactionDate}>
                            {formatShortDate(tx.date)}
                          </Text>
                        </View>
                        <Text style={styles.modalMiniTransactionAmount}>
                          {formatCurrency(tx.amount, currency)}
                        </Text>
                      </Pressable>
                    ))}
                    {category.transactions.length > 3 && (
                      <Text style={styles.modalMoreTransactions}>
                        +{category.transactions.length - 3} more
                      </Text>
                    )}
                  </View>
                </View>
              )
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Bills Modal */}
      <Modal
        visible={modalType === 'bills'}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Upcoming Bills</Text>
            <IconButton
              icon="close"
              size={24}
              onPress={closeModal}
              style={styles.modalCloseButton}
            />
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.modalSummaryCard}>
              <Text style={styles.modalSummaryLabel}>Total Due (30 days)</Text>
              <Text style={styles.modalSummaryValue}>
                {formatCurrency(upcomingTotal, currency)}
              </Text>
              <Text style={styles.modalSummaryMeta}>
                {upcomingBills.length} {upcomingBills.length === 1 ? 'bill' : 'bills'} coming up
              </Text>
            </View>

            {upcomingBills.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No upcoming bills</Text>
                <Text style={styles.emptySubtitle}>
                  No recurring bills due in the next 30 days.
                </Text>
              </View>
            ) : (
              upcomingBills.map((bill) => (
                <View key={bill.id} style={styles.modalBillCard}>
                  <View style={styles.modalBillHeader}>
                    <View style={styles.modalBillLeft}>
                      <Text style={styles.modalBillMerchant}>{bill.merchant}</Text>
                      <Text style={styles.modalBillMeta}>
                        {bill.category} • {bill.frequency ? humanizeLabel(bill.frequency) : 'One-time'}
                      </Text>
                    </View>
                    <View style={styles.modalBillRight}>
                      <Text style={styles.modalBillAmount}>
                        {formatCurrency(bill.amount, currency)}
                      </Text>
                      <Text style={styles.modalBillDate}>
                        Due {formatShortDate(bill.nextDate)}
                      </Text>
                    </View>
                  </View>
                  {bill.status && (
                    <Chip
                      mode="outlined"
                      style={styles.statusChip}
                      textStyle={styles.statusChipText}
                    >
                      {humanizeLabel(bill.status)}
                    </Chip>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Transaction Detail Modal */}
      <Modal
        visible={modalType === 'transaction' && selectedTransaction !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Transaction Details</Text>
            <IconButton
              icon="close"
              size={24}
              onPress={closeModal}
              style={styles.modalCloseButton}
            />
          </View>
          <ScrollView style={styles.modalContent}>
            {selectedTransaction && (
              <>
                <View style={styles.modalAmountCard}>
                  <Text style={styles.modalAmountLabel}>Amount</Text>
                  <Text
                    style={[
                      styles.modalAmountValue,
                      selectedTransaction.amount < 0
                        ? styles.modalAmountIncome
                        : styles.modalAmountExpense,
                    ]}
                  >
                    {formatCurrency(Math.abs(selectedTransaction.amount), currency)}
                  </Text>
                  {selectedTransaction.pending ? (
                    <Chip
                      mode="outlined"
                      style={styles.pendingChip}
                      textStyle={styles.pendingChipText}
                    >
                      Pending
                    </Chip>
                  ) : (
                    <Text style={styles.modalAmountMeta}>
                      {selectedTransaction.amount < 0 ? 'Income' : 'Expense'} • Posted
                    </Text>
                  )}
                </View>

                <View style={styles.modalDetailsCard}>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Merchant</Text>
                    <Text style={styles.modalDetailValue}>
                      {selectedTransaction.merchant}
                    </Text>
                  </View>

                  <View style={styles.modalDetailDivider} />

                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Category</Text>
                    <Text style={styles.modalDetailValue}>
                      {selectedTransaction.category}
                    </Text>
                  </View>

                  <View style={styles.modalDetailDivider} />

                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Date</Text>
                    <Text style={styles.modalDetailValue}>
                      {selectedTransaction.date
                        ? formatLongDate(selectedTransaction.date)
                        : 'Unknown'}
                    </Text>
                  </View>

                  {selectedTransaction.paymentChannel ? (
                    <>
                      <View style={styles.modalDetailDivider} />
                      <View style={styles.modalDetailRow}>
                        <Text style={styles.modalDetailLabel}>Payment Method</Text>
                        <Text style={styles.modalDetailValue}>
                          {humanizeLabel(selectedTransaction.paymentChannel)}
                        </Text>
                      </View>
                    </>
                  ) : null}

                  <View style={styles.modalDetailDivider} />

                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Transaction ID</Text>
                    <Text style={styles.modalDetailValueSmall} numberOfLines={1}>
                      {selectedTransaction.id}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalInfoCard}>
                  <Text style={styles.modalInfoText}>
                    {selectedTransaction.amount < 0
                      ? 'This transaction increased your account balance.'
                      : 'This transaction decreased your account balance.'}
                  </Text>
                  {selectedTransaction.pending ? (
                    <Text style={styles.modalInfoText}>
                      Pending transactions may take 1-3 business days to post and the
                      final amount may differ.
                    </Text>
                  ) : null}
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    gap: 20,
  },
  header: {
    gap: 4,
  },
  headerTitle: {
    fontFamily: theme.fonts.display.regular,
    fontSize: 26,
    color: theme.colors.ink,
  },
  headerSubtitle: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 14,
    color: theme.colors.muted,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontFamily: theme.fonts.body.regular,
    color: theme.colors.muted,
    fontSize: 13,
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
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: '48%',
    minWidth: 150,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
    ...theme.shadows.card,
  },
  summaryCardWide: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
    ...theme.shadows.card,
  },
  summaryLabel: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    color: theme.colors.mutedLight,
  },
  summaryValue: {
    fontFamily: theme.fonts.display.regular,
    fontSize: 22,
    color: theme.colors.ink,
  },
  summaryMeta: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionHeader: {
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: theme.fonts.display.regular,
    fontSize: 20,
    color: theme.colors.ink,
  },
  listCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    padding: theme.spacing.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 14,
    ...theme.shadows.card,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listTitle: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 14,
    color: theme.colors.ink,
  },
  listMeta: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.mutedLight,
    marginTop: 4,
  },
  listAmount: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 14,
    color: theme.colors.danger,
  },
  listAmountPositive: {
    color: theme.colors.accent,
  },
  listRight: {
    alignItems: 'flex-end',
  },
  emptyListText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  categoryRow: {
    gap: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceAlt,
    overflow: 'hidden',
  },
  categoryFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: theme.colors.accent,
  },
  // Modal styles
  modalSafeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.page,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontFamily: theme.fonts.display.regular,
    fontSize: 20,
    color: theme.colors.ink,
  },
  modalCloseButton: {
    margin: 0,
  },
  modalContent: {
    flex: 1,
    padding: theme.spacing.page,
  },
  modalSummaryCard: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    borderRadius: theme.radii.cardLarge,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
    marginBottom: 20,
  },
  modalSummaryLabel: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: theme.colors.mutedLight,
  },
  modalSummaryValue: {
    color: theme.colors.ink,
    fontSize: 28,
    fontFamily: theme.fonts.display.regular,
  },
  modalSummaryMeta: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 13,
    color: theme.colors.muted,
  },
  modalCategoryCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.card,
    borderRadius: theme.radii.card,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
    marginBottom: 12,
  },
  modalCategoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalCategoryLeft: {
    flex: 1,
    gap: 2,
  },
  modalCategoryName: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 15,
    color: theme.colors.ink,
  },
  modalCategoryMeta: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.mutedLight,
  },
  modalCategoryRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  modalCategoryAmount: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 15,
    color: theme.colors.danger,
  },
  modalCategoryPercentage: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  modalCategoryBarTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceAlt,
    overflow: 'hidden',
  },
  modalCategoryBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: theme.colors.accent,
  },
  modalTransactionsList: {
    gap: 8,
    paddingTop: 4,
  },
  modalMiniTransaction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  modalMiniTransactionLeft: {
    flex: 1,
    gap: 2,
  },
  modalMiniTransactionMerchant: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 13,
    color: theme.colors.ink,
  },
  modalMiniTransactionDate: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 11,
    color: theme.colors.mutedLight,
  },
  modalMiniTransactionAmount: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 13,
    color: theme.colors.ink,
  },
  modalMoreTransactions: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 11,
    color: theme.colors.mutedLight,
    fontStyle: 'italic',
    marginTop: 4,
  },
  modalBillCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.card,
    borderRadius: theme.radii.card,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
    marginBottom: 12,
  },
  modalBillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalBillLeft: {
    flex: 1,
    gap: 4,
  },
  modalBillMerchant: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 14,
    color: theme.colors.ink,
  },
  modalBillMeta: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.mutedLight,
  },
  modalBillRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  modalBillAmount: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 14,
    color: theme.colors.danger,
  },
  modalBillDate: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  statusChip: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surfaceAlt,
  },
  statusChipText: {
    fontSize: 10,
    fontFamily: theme.fonts.body.medium,
  },
  modalAmountCard: {
    backgroundColor: theme.colors.surface,
    padding: 24,
    borderRadius: theme.radii.cardLarge,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
    marginBottom: 16,
  },
  modalAmountLabel: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: theme.colors.mutedLight,
  },
  modalAmountValue: {
    fontSize: 40,
    fontWeight: '700',
    fontFamily: theme.fonts.display.regular,
  },
  modalAmountExpense: {
    color: theme.colors.danger,
  },
  modalAmountIncome: {
    color: theme.colors.accent,
  },
  modalAmountMeta: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  pendingChip: {
    marginTop: 4,
    backgroundColor: theme.colors.surfaceAlt,
  },
  pendingChipText: {
    fontSize: 11,
    fontFamily: theme.fonts.body.medium,
  },
  modalDetailsCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.card,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
    marginBottom: 16,
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  modalDetailLabel: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  modalDetailValue: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 13,
    color: theme.colors.ink,
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
  modalDetailValueSmall: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 11,
    color: theme.colors.mutedLight,
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
  modalDetailDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 4,
  },
  modalInfoCard: {
    backgroundColor: theme.colors.surfaceAlt,
    padding: 14,
    borderRadius: theme.radii.card,
    gap: 8,
  },
  modalInfoText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.muted,
    lineHeight: 18,
  },
})
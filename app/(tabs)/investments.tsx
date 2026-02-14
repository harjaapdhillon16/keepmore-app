import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, View, Modal, TouchableOpacity, Pressable } from 'react-native'
import { ActivityIndicator, Button, Text, IconButton } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiUrl } from '../../constants/api'
import { theme } from '../../constants/theme'
import { useAuth } from '../../contexts/AuthContext'
import { useCurrency } from '../../contexts/CurrencyContext'
import { useInvestmentItems } from '../../hooks/useInvestmentItems'
import { useInvestments } from '../../hooks/useInvestments'
import { useInvestmentsLink } from '../../hooks/useInvestmentsLink'
import { formatCurrency, humanizeLabel, toNumber } from '../../utils/finance'

type NormalizedHolding = {
  id: string
  accountName: string
  accountType: string
  symbol: string
  name: string
  quantity: number
  price: number
  value: number
  costBasis: number
  currency: string
}

type AccountDetail = {
  name: string
  type: string
  value: number
  costBasis: number
  gainLoss: number
  gainLossPct: number
  count: number
  holdings: NormalizedHolding[]
}

export default function InvestmentsScreen() {
  const { user, status } = useAuth()
  const { currency: userCurrency, source: currencySource } = useCurrency()
  const { holdings, loading, error, refresh } = useInvestments(user?.id)
  const {
    hasLinkedItem,
    loading: itemsLoading,
    error: itemsError,
    refresh: refreshItems,
  } = useInvestmentItems(user?.id)
  const { openLinkFlow, isLoading: linkLoading, error: linkError } = useInvestmentsLink()

  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<AccountDetail | null>(null)

  const syncHoldings = async () => {
    if (!user?.id) return
    setIsSyncing(true)
    setSyncError(null)
    try {
      const response = await fetch(apiUrl('/api/plaid/investments/sync-data'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Unable to sync investments')
      }
      await Promise.all([refresh(), refreshItems()])
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : 'Unable to sync investments.',
      )
    } finally {
      setIsSyncing(false)
    }
  }

  const handleConnect = () => {
    if (!user?.id) return
    setSyncError(null)
    openLinkFlow({
      userId: user.id,
      onSuccess: syncHoldings,
    })
  }

  const normalizedHoldings = useMemo(() => {
    return holdings.map((holding) => {
      const quantity = toNumber(holding.quantity)
      const price = toNumber(holding.price)
      const value = toNumber(holding.value)
      const costBasis = toNumber(holding.cost_basis)
      const accountName = holding.account_name || holding.account_id || 'Investment account'
      const accountType = holding.account_subtype || holding.account_type || 'Investment'
      const symbol = holding.symbol || holding.security_name || 'Holding'
      const name = holding.security_name || holding.symbol || 'Investment'

      return {
        id: holding.id,
        accountName,
        accountType: humanizeLabel(accountType),
        symbol,
        name,
        quantity,
        price,
        value,
        costBasis,
        currency: holding.iso_currency_code || 'USD',
      }
    })
  }, [holdings])

  const inferredCurrency =
    normalizedHoldings.find((holding) => holding.currency)?.currency ?? null
  const currency =
    currencySource === 'default' || currencySource === 'unknown'
      ? inferredCurrency ?? userCurrency
      : userCurrency

  const {
    totalValue,
    totalCost,
    totalChange,
    totalChangePct,
    accountBreakdown,
    accountDetails,
  } = useMemo(() => {
    const total = normalizedHoldings.reduce((sum, holding) => sum + holding.value, 0)
    const cost = normalizedHoldings.reduce((sum, holding) => sum + holding.costBasis, 0)
    const change = total - cost
    const changePct = cost > 0 ? change / cost : null

    const breakdownMap = normalizedHoldings.reduce((acc, holding) => {
      const key = holding.accountName
      if (!acc[key]) {
        acc[key] = {
          name: holding.accountName,
          type: holding.accountType,
          value: 0,
          costBasis: 0,
          gainLoss: 0,
          gainLossPct: 0,
          count: 0,
          holdings: [],
        }
      }
      acc[key].value += holding.value
      acc[key].costBasis += holding.costBasis
      acc[key].count += 1
      acc[key].holdings.push(holding)
      return acc
    }, {} as Record<string, AccountDetail>)

    // Calculate gain/loss for each account
    Object.values(breakdownMap).forEach((account) => {
      account.gainLoss = account.value - account.costBasis
      account.gainLossPct =
        account.costBasis > 0 ? (account.gainLoss / account.costBasis) * 100 : 0
      // Sort holdings by value descending
      account.holdings.sort((a, b) => b.value - a.value)
    })

    const breakdown = Object.values(breakdownMap).map(acc => ({
      name: acc.name,
      value: acc.value,
      count: acc.count
    })).sort((a, b) => b.value - a.value)

    const details = Object.values(breakdownMap).sort((a, b) => b.value - a.value)

    return {
      totalValue: total,
      totalCost: cost,
      totalChange: change,
      totalChangePct: changePct,
      accountBreakdown: breakdown,
      accountDetails: details,
    }
  }, [normalizedHoldings])

  const totalChangeLabel =
    totalCost > 0
      ? `${totalChange >= 0 ? '+' : ''}${formatCurrency(totalChange, currency)} (${((totalChangePct ?? 0) * 100).toFixed(1)}%)`
      : 'Performance data unavailable'

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Investments</Text>
          <Text style={styles.subtitle}>Track holdings, accounts, and performance.</Text>
        </View>

        {status === 'loading' || loading || itemsLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={theme.colors.accent} />
            <Text style={styles.loadingText}>Loading investments...</Text>
          </View>
        ) : null}

        {error || itemsError || linkError || syncError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>
              {error || itemsError || linkError || syncError}
            </Text>
          </View>
        ) : null}

        {!user ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Sign in to view investments</Text>
            <Text style={styles.emptySubtitle}>
              Connect an investment account to see holdings here.
            </Text>
          </View>
        ) : null}

        {user && !hasLinkedItem ? (
          <View style={styles.connectCard}>
            <Text style={styles.connectTitle}>Connect your investments</Text>
            <Text style={styles.connectSubtitle}>
              Link your brokerage to view holdings and performance.
            </Text>
            <Button
              mode="contained"
              onPress={handleConnect}
              loading={linkLoading}
              disabled={linkLoading}
              style={styles.connectButton}
              contentStyle={styles.connectButtonContent}
              labelStyle={styles.connectButtonLabel}
            >
              Connect investments
            </Button>
          </View>
        ) : null}

        {user && hasLinkedItem && normalizedHoldings.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No investment holdings yet</Text>
            <Text style={styles.emptySubtitle}>
              Your brokerage is connected. Holdings will appear after sync.
            </Text>
            <Button
              mode="outlined"
              onPress={syncHoldings}
              loading={isSyncing}
              disabled={isSyncing}
              style={styles.refreshButton}
              labelStyle={styles.refreshButtonLabel}
            >
              Sync holdings
            </Button>
          </View>
        ) : null}

        {user && normalizedHoldings.length > 0 ? (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>TOTAL INVESTMENTS</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(totalValue, currency)}
              </Text>
              <Text style={styles.summaryChange}>{totalChangeLabel}</Text>
            </View>

            <Text style={styles.sectionTitle}>Account breakdown</Text>

            <View style={styles.grid}>
              {accountBreakdown.map((account, index) => {
                const accountDetail = accountDetails.find(a => a.name === account.name)
                return (
                  <Pressable
                    key={account.name}
                    style={styles.accountCard}
                    onPress={() => setSelectedAccount(accountDetail || null)}
                  >
                    <Text style={styles.accountName}>{account.name}</Text>
                    <Text style={styles.accountValue}>
                      {formatCurrency(account.value, currency)}
                    </Text>
                    <Text style={styles.accountChange}>
                      {account.count} holdings
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            <Text style={styles.sectionTitle}>Holdings</Text>

            {normalizedHoldings.map((holding) => (
              <View key={holding.id} style={styles.holdingCard}>
                <View style={styles.holdingHeader}>
                  <Text style={styles.holdingSymbol}>{holding.symbol}</Text>
                  <Text style={styles.holdingValue}>
                    {formatCurrency(holding.value, currency)}
                  </Text>
                </View>
                <Text style={styles.holdingName}>{holding.name}</Text>
                <Text style={styles.holdingMeta}>
                  {holding.quantity > 0
                    ? `${holding.quantity.toFixed(2)} shares`
                    : 'Position'}{' '}
                  {holding.price > 0
                    ? `at ${formatCurrency(holding.price, currency)}`
                    : ''}
                </Text>
                {holding.costBasis > 0 ? (
                  <Text style={styles.holdingChange}>
                    {holding.value - holding.costBasis >= 0 ? '+' : ''}
                    {formatCurrency(holding.value - holding.costBasis, currency)} vs
                    cost basis
                  </Text>
                ) : (
                  <Text style={styles.holdingChange}>{holding.accountType}</Text>
                )}
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>

      {/* Account Detail Modal */}
      <Modal
        visible={selectedAccount !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedAccount(null)}
      >
        <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <Text style={styles.modalTitle}>{selectedAccount?.name}</Text>
              <Text style={styles.modalSubtitle}>{selectedAccount?.type}</Text>
            </View>
            <IconButton
              icon="close"
              size={24}
              onPress={() => setSelectedAccount(null)}
              style={styles.modalCloseButton}
            />
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedAccount && (
              <>
                {/* Account Summary */}
                <View style={styles.modalSummaryCard}>
                  <View style={styles.modalSummaryRow}>
                    <View style={styles.modalSummaryItem}>
                      <Text style={styles.modalSummaryLabel}>Total Value</Text>
                      <Text style={styles.modalSummaryValue}>
                        {formatCurrency(selectedAccount.value, currency)}
                      </Text>
                    </View>
                    <View style={styles.modalSummaryItem}>
                      <Text style={styles.modalSummaryLabel}>Cost Basis</Text>
                      <Text style={styles.modalSummaryValue}>
                        {formatCurrency(selectedAccount.costBasis, currency)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.modalSummaryDivider} />
                  <View style={styles.modalSummaryRow}>
                    <View style={styles.modalSummaryItem}>
                      <Text style={styles.modalSummaryLabel}>Gain/Loss</Text>
                      <Text
                        style={[
                          styles.modalSummaryValue,
                          selectedAccount.gainLoss >= 0
                            ? styles.positiveText
                            : styles.negativeText,
                        ]}
                      >
                        {selectedAccount.gainLoss >= 0 ? '+' : ''}
                        {formatCurrency(selectedAccount.gainLoss, currency)}
                      </Text>
                    </View>
                    <View style={styles.modalSummaryItem}>
                      <Text style={styles.modalSummaryLabel}>Return</Text>
                      <Text
                        style={[
                          styles.modalSummaryValue,
                          selectedAccount.gainLossPct >= 0
                            ? styles.positiveText
                            : styles.negativeText,
                        ]}
                      >
                        {selectedAccount.gainLossPct >= 0 ? '+' : ''}
                        {selectedAccount.gainLossPct.toFixed(2)}%
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Holdings List */}
                <Text style={styles.modalHoldingsTitle}>
                  Holdings ({selectedAccount.count})
                </Text>

                {selectedAccount.holdings.map((holding) => (
                  <View key={holding.id} style={styles.modalHoldingCard}>
                    <View style={styles.holdingHeader}>
                      <Text style={styles.holdingSymbol}>{holding.symbol}</Text>
                      <Text style={styles.holdingValue}>
                        {formatCurrency(holding.value, currency)}
                      </Text>
                    </View>
                    <Text style={styles.holdingName}>{holding.name}</Text>

                    <View style={styles.modalHoldingDetails}>
                      <View style={styles.modalHoldingDetailRow}>
                        <Text style={styles.modalHoldingDetailLabel}>Quantity</Text>
                        <Text style={styles.modalHoldingDetailValue}>
                          {holding.quantity.toFixed(2)} shares
                        </Text>
                      </View>
                      <View style={styles.modalHoldingDetailRow}>
                        <Text style={styles.modalHoldingDetailLabel}>Price</Text>
                        <Text style={styles.modalHoldingDetailValue}>
                          {formatCurrency(holding.price, currency)}
                        </Text>
                      </View>
                      <View style={styles.modalHoldingDetailRow}>
                        <Text style={styles.modalHoldingDetailLabel}>Cost Basis</Text>
                        <Text style={styles.modalHoldingDetailValue}>
                          {formatCurrency(holding.costBasis, currency)}
                        </Text>
                      </View>
                      <View style={styles.modalHoldingDetailRow}>
                        <Text style={styles.modalHoldingDetailLabel}>Gain/Loss</Text>
                        <Text
                          style={[
                            styles.modalHoldingDetailValue,
                            holding.value - holding.costBasis >= 0
                              ? styles.positiveText
                              : styles.negativeText,
                          ]}
                        >
                          {holding.value - holding.costBasis >= 0 ? '+' : ''}
                          {formatCurrency(holding.value - holding.costBasis, currency)}
                        </Text>
                      </View>
                      {holding.costBasis > 0 && (
                        <View style={styles.modalHoldingDetailRow}>
                          <Text style={styles.modalHoldingDetailLabel}>Return</Text>
                          <Text
                            style={[
                              styles.modalHoldingDetailValue,
                              holding.value - holding.costBasis >= 0
                                ? styles.positiveText
                                : styles.negativeText,
                            ]}
                          >
                            {(
                              ((holding.value - holding.costBasis) /
                                holding.costBasis) *
                              100
                            ).toFixed(2)}
                            %
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
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
    padding: 16,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
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
  connectCard: {
    backgroundColor: theme.colors.surface,
    padding: 18,
    borderRadius: theme.radii.card,
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  connectTitle: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 16,
    color: theme.colors.ink,
  },
  connectSubtitle: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  connectButton: {
    borderRadius: theme.radii.button,
  },
  connectButtonContent: {
    paddingVertical: 8,
  },
  connectButtonLabel: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 14,
  },
  refreshButton: {
    borderRadius: theme.radii.button,
    borderColor: theme.colors.border,
  },
  refreshButtonLabel: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 14,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    borderRadius: theme.radii.cardLarge,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    color: theme.colors.ink,
    fontSize: 28,
    fontFamily: theme.fonts.display.regular,
  },
  summaryChange: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 13,
    color: theme.colors.accent,
  },
  sectionTitle: {
    fontFamily: theme.fonts.display.regular,
    fontSize: 20,
    color: theme.colors.ink,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  accountCard: {
    flexGrow: 1,
    minWidth: 140,
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: theme.radii.card,
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  accountName: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 12,
    color: theme.colors.mutedLight,
  },
  accountValue: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 15,
    color: theme.colors.ink,
  },
  accountChange: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 12,
    color: theme.colors.accent,
  },
  holdingCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.card,
    borderRadius: theme.radii.card,
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  holdingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  holdingSymbol: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 14,
    width:200,
    color: theme.colors.ink,
  },
  holdingValue: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 14,
    color: theme.colors.ink,
  },
  holdingName: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  holdingMeta: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.mutedLight,
  },
  holdingChange: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 12,
    color: theme.colors.accent,
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
  modalHeaderLeft: {
    flex: 1,
    gap: 2,
  },
  modalTitle: {
    fontFamily: theme.fonts.display.regular,
    fontSize: 20,
    color: theme.colors.ink,
  },
  modalSubtitle: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 13,
    color: theme.colors.muted,
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
    padding: 18,
    borderRadius: theme.radii.cardLarge,
    gap: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
    marginBottom: 20,
  },
  modalSummaryRow: {
    flexDirection: 'row',
    gap: 16,
  },
  modalSummaryItem: {
    flex: 1,
    gap: 4,
  },
  modalSummaryLabel: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: theme.colors.mutedLight,
  },
  modalSummaryValue: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 18,
    color: theme.colors.ink,
  },
  modalSummaryDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  modalHoldingsTitle: {
    fontFamily: theme.fonts.display.regular,
    fontSize: 18,
    color: theme.colors.ink,
    marginBottom: 12,
  },
  modalHoldingCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.card,
    borderRadius: theme.radii.card,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
    marginBottom: 12,
  },
  modalHoldingDetails: {
    backgroundColor: theme.colors.background,
    padding: 10,
    borderRadius: theme.radii.card,
    gap: 8,
    marginTop: 4,
  },
  modalHoldingDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalHoldingDetailLabel: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  modalHoldingDetailValue: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 12,
    color: theme.colors.ink,
  },
  positiveText: {
    color: theme.colors.accent,
  },
  negativeText: {
    color: theme.colors.danger,
  },
})

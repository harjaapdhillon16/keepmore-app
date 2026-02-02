import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { chatApiUrl } from '../../constants/api'
import { theme } from '../../constants/theme'
import { useAuth } from '../../contexts/AuthContext'
import { logError } from '../../lib/telemetry'
import { formatCurrency, humanizeLabel } from '../../utils/finance'

type SummaryCategory = {
  category?: string
  amount?: number
  percentage?: number
}

type SummaryData = {
  total_balance?: number
  monthly_spending?: number
  top_categories?: SummaryCategory[]
}

type InsightsData = {
  ai_summary?: string
  ai_recommendations?: string[]
}

const getParam = (value: string | string[] | undefined) => {
  if (!value) return undefined
  return Array.isArray(value) ? value[0] : value
}

const parseJsonParam = <T,>(value?: string): T | null => {
  if (!value) return null
  try {
    return JSON.parse(decodeURIComponent(value)) as T
  } catch {
    return null
  }
}

export default function WowMomentScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const params = useLocalSearchParams()

  const initialSummary = useMemo(
    () => parseJsonParam<SummaryData>(getParam(params.summary)),
    [params.summary],
  )
  const initialInsights = useMemo(
    () => parseJsonParam<InsightsData>(getParam(params.insights)),
    [params.insights],
  )
  const initialAccounts = useMemo(() => {
    const raw = getParam(params.accounts)
    if (!raw) return null
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : null
  }, [params.accounts])

  const [summary, setSummary] = useState<SummaryData | null>(initialSummary)
  const [insights, setInsights] = useState<InsightsData | null>(initialInsights)
  const [accountsCount] = useState<number | null>(initialAccounts)
  const [isLoading, setIsLoading] = useState(!initialSummary && !initialInsights)

  const loadSummary = useCallback(async () => {
    if (!user?.id) return
    try {
      const response = await fetch(chatApiUrl(`/api/sync-financial-summary/${user.id}`))
      const data = await response.json().catch(() => null)
      if (data?.success && data?.summary) {
        setSummary(data.summary as SummaryData)
      }
    } catch (err) {
      logError(err, 'Wow screen: load summary failed')
    }
  }, [user?.id])

  const loadInsights = useCallback(async () => {
    if (!user?.id) return
    try {
      const response = await fetch(chatApiUrl(`/api/insights/${user.id}`))
      const data = await response.json().catch(() => null)
      if (data?.success && data?.insights) {
        setInsights(data.insights as InsightsData)
      }
    } catch (err) {
      logError(err, 'Wow screen: load insights failed')
    }
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    if (summary && insights) return
    setIsLoading(true)
    void Promise.all([loadSummary(), loadInsights()]).finally(() => {
      setIsLoading(false)
    })
  }, [insights, loadInsights, loadSummary, summary, user?.id])

  const totalBalance = summary?.total_balance ?? 0
  const monthlySpending = summary?.monthly_spending ?? 0
  const hasSummary = Boolean(summary)

  const categoryRows = useMemo(() => {
    const categories = summary?.top_categories ?? []
    return categories.slice(0, 3).map((category) => ({
      label: humanizeLabel(category.category),
      value: formatCurrency(category.amount ?? 0),
      change:
        typeof category.percentage === 'number'
          ? `${category.percentage.toFixed(1)}%`
          : undefined,
    }))
  }, [summary?.top_categories])

  const insightText =
    insights?.ai_summary ??
    insights?.ai_recommendations?.[0] ??
    'We are preparing your personalized insights.'

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
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.colors.accent} />
          ) : (
            <Text style={styles.cardValue}>
              {hasSummary ? formatCurrency(totalBalance) : '--'}
            </Text>
          )}
          <Text style={styles.cardMeta}>
            {accountsCount && accountsCount > 0
              ? `Across ${accountsCount} accounts`
              : 'Across linked accounts'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Last Month's Spending</Text>
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.colors.accent} />
          ) : (
            <Text style={styles.sectionValue}>
              {hasSummary ? formatCurrency(monthlySpending) : '--'}
            </Text>
          )}
        </View>

        <View style={styles.card}>
          {categoryRows.length > 0 ? (
            categoryRows.map((row) => (
              <View key={row.label} style={styles.row}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <View style={styles.rowRight}>
                  <Text style={styles.rowValue}>{row.value}</Text>
                  {row.change ? (
                    <Text style={styles.rowChange}>{row.change}</Text>
                  ) : null}
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No spending categories yet.</Text>
          )}
        </View>

        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Ionicons name="sparkles" size={18} color={theme.colors.accent} />
            <Text style={styles.insightTitle}>AI Insight</Text>
          </View>
          <Text style={styles.insightText}>{insightText}</Text>
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
  emptyText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 13,
    color: theme.colors.muted,
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

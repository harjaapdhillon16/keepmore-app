import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { apiUrl, chatApiUrl } from '../../constants/api'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '../../constants/theme'
import { useAuth } from '../../contexts/AuthContext'
import { useCurrency } from '../../contexts/CurrencyContext'
import { logError } from '../../lib/telemetry'

const steps = [
  { key: 'plaid', label: 'Syncing your accounts', doneAt: 25 },
  { key: 'summary', label: 'Calculating balances', doneAt: 55 },
  { key: 'insights', label: 'Generating insights', doneAt: 80 },
  { key: 'embeddings', label: 'Preparing AI memory', doneAt: 100 },
]

type SummaryPayload = {
  success?: boolean
  summary?: Record<string, any>
  error?: string
}

type InsightsPayload = {
  success?: boolean
  insights?: Record<string, any>
  error?: string
}

type PlaidSyncPayload = {
  success?: boolean
  itemResults?: Array<{
    results?: { accounts?: { count?: number } }
  }>
  error?: string
}

export default function SyncingScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { refresh: refreshCurrency } = useCurrency()
  const [progress, setProgress] = useState(12)
  const [error, setError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const hasStarted = useRef(false)

  const getErrorMessage = (err: unknown, fallback: string) => {
    if (err instanceof Error) return err.message
    return fallback
  }

  const runSyncPipeline = useCallback(async () => {
    if (!user?.id) {
      setError('Please sign in again to finish syncing.')
      return
    }

    setError(null)
    setIsRunning(true)
    setProgress(12)

    try {
      const plaidResponse = await fetch(apiUrl('/api/plaid/sync-data'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
      const plaidPayload = (await plaidResponse.json().catch(() => null)) as PlaidSyncPayload | null
      if (!plaidResponse.ok || !plaidPayload?.success) {
        throw new Error(plaidPayload?.error ?? 'Plaid sync failed.')
      }

      setProgress(steps[0].doneAt)
      await refreshCurrency()

      const accountsCount =
        plaidPayload?.itemResults?.reduce(
          (sum, item) => sum + (item?.results?.accounts?.count ?? 0),
          0,
        ) ?? 0

      const summaryResponse = await fetch(
        chatApiUrl('/api/sync-financial-summary/calculate'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        },
      )
      const summaryPayload = (await summaryResponse.json().catch(() => null)) as
        | SummaryPayload
        | null
      if (!summaryResponse.ok || !summaryPayload?.success) {
        throw new Error(summaryPayload?.error ?? 'Unable to calculate summary.')
      }

      setProgress(steps[1].doneAt)

      const insightsResponse = await fetch(chatApiUrl('/api/insights/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
      const insightsPayload = (await insightsResponse.json().catch(() => null)) as
        | InsightsPayload
        | null
      if (!insightsResponse.ok || !insightsPayload?.success) {
        throw new Error(insightsPayload?.error ?? 'Unable to generate insights.')
      }

      setProgress(steps[2].doneAt)

      const embeddingsResponse = await fetch(chatApiUrl('/api/embeddings/batch'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize: 50 }),
      })
      const embeddingsPayload = await embeddingsResponse.json().catch(() => null)
      if (!embeddingsResponse.ok || !embeddingsPayload?.success) {
        throw new Error(embeddingsPayload?.error ?? 'Embedding batch failed.')
      }

      setProgress(steps[3].doneAt)

      const summaryParam = encodeURIComponent(
        JSON.stringify(summaryPayload?.summary ?? {}),
      )
      const insightsParam = encodeURIComponent(
        JSON.stringify(insightsPayload?.insights ?? {}),
      )

      setTimeout(() => {
        router.replace({
          pathname: '/(auth)/wow',
          params: {
            summary: summaryParam,
            insights: insightsParam,
            accounts: accountsCount ? String(accountsCount) : '0',
          },
        })
      }, 400)
    } catch (err) {
      logError(err, 'Syncing: pipeline failed')
      setError(getErrorMessage(err, 'Unable to finish syncing.'))
    } finally {
      setIsRunning(false)
    }
  }, [refreshCurrency, router, user?.id])

  useEffect(() => {
    if (!user?.id || hasStarted.current) return
    hasStarted.current = true
    void runSyncPipeline()
  }, [runSyncPipeline, user?.id])

  const progressLabel = useMemo(() => `${progress}%`, [progress])

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.loaderRing}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
        <Text style={styles.title}>Analyzing your finances...</Text>
        <Text style={styles.subtitle}>Just a few more seconds.</Text>

        <View style={styles.card}>
          {steps.map((step, index) => {
            const prevThreshold = index === 0 ? 0 : steps[index - 1].doneAt
            const isDone = progress >= step.doneAt
            const isActive = !isDone && progress >= prevThreshold
            return (
              <View key={step.label} style={styles.stepRow}>
                {isDone ? (
                  <Ionicons name="checkmark-circle" size={18} color={theme.colors.accent} />
                ) : (
                  <Ionicons
                    name={isActive ? 'time' : 'ellipse-outline'}
                    size={18}
                    color={isActive ? theme.colors.accent : theme.colors.mutedLight}
                  />
                )}
                <Text style={styles.stepText}>{step.label}</Text>
              </View>
            )
          })}

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{progressLabel}</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {error ? (
          <Button
            mode="contained"
            buttonColor={theme.colors.primary}
            textColor="#ffffff"
            style={styles.retryButton}
            contentStyle={styles.retryContent}
            labelStyle={styles.retryLabel}
            onPress={runSyncPipeline}
            loading={isRunning}
            disabled={isRunning}
          >
            Try Again
          </Button>
        ) : null}
      </View>
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
    padding: theme.spacing.page,
    justifyContent: 'center',
    gap: 16,
    backgroundColor: theme.colors.background,
  },
  loaderRing: {
    alignSelf: 'center',
    height: 72,
    width: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  title: {
    fontFamily: theme.fonts.display.regular,
    fontSize: 26,
    textAlign: 'center',
    color: theme.colors.ink,
  },
  subtitle: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 14,
    textAlign: 'center',
    color: theme.colors.muted,
  },
  card: {
    marginTop: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceAlt,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
  },
  progressLabel: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 12,
    color: theme.colors.mutedLight,
    textAlign: 'right',
  },
  error: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 13,
    color: theme.colors.danger,
    textAlign: 'center',
  },
  retryButton: {
    borderRadius: theme.radii.button,
    alignSelf: 'center',
  },
  retryContent: {
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  retryLabel: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 14,
  },
})

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View, Animated, Platform, Dimensions } from 'react-native'
import {
  ActivityIndicator,
  Button,
  Chip,
  IconButton,
  Modal,
  Portal,
  ProgressBar,
  Text,
  TextInput,
  FAB,
  Divider,
} from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { DatePickerModal } from 'react-native-paper-dates'
import { chatApiUrl } from '../../constants/api'
import { theme } from '../../constants/theme'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { logEvent, logError } from '../../lib/telemetry'

type Conversation = {
  id: string
  title: string
  message_count: number
  last_message_at: string
  created_at: string
}

type ProjectionData = {
  balance: number
  savings: number
  spending: number
}

type Optimization = {
  category: string
  potential_savings: number
  priority: 'high' | 'medium' | 'low'
  recommendation: string
}

type FinancialInsights = {
  id?: string
  user_id?: string
  projections?: {
    '1_month'?: ProjectionData
    '3_months'?: ProjectionData
    '6_months'?: ProjectionData
    '1_year'?: ProjectionData
  }
  wealth_analysis?: {
    current_net_worth: number
    projected_1_year: number
    projected_5_years: number
    financial_health_score: number
    comparison: string
  }
  optimizations?: Optimization[]
  spending_insights?: {
    spend_more_on: string[]
    cut_spending_on: string[]
    optimize: string[]
  }
  key_metrics?: {
    runway_months: number
    debt_to_income_ratio: number
    savings_rate: number
    emergency_fund_months: number
  }
  ai_summary?: string
  ai_recommendations?: string[]
  generated_at?: string
  expires_at?: string
}

type FinancialSummary = {
  total_balance: number | null
  monthly_income: number | null
  monthly_spending: number | null
  savings_rate: number | null
  spending_trend: string | null
}

type GoalAdvice = {
  feasibility: 'easy' | 'moderate' | 'challenging' | 'difficult'
  recommended_monthly: number
  timeline_estimate: string
  steps: string[]
  optimizations: string[]
  motivation: string
  warnings: string[]
  alternatives: string[]
}

type GoalCategory =
  | 'savings'
  | 'debt'
  | 'investment'
  | 'purchase'
  | 'emergency_fund'
  | 'retirement'
  | 'other'

type FinancialGoal = {
  id: string
  user_id: string
  title: string
  description?: string | null
  target_amount: number
  current_amount: number
  target_date?: string | null
  category: GoalCategory
  priority: 'low' | 'medium' | 'high'
  status: 'active' | 'completed' | 'paused' | 'cancelled'
  ai_advice?: GoalAdvice | null
  ai_advice_generated_at?: string | null
  monthly_contribution?: number | null
  projected_completion_date?: string | null
  created_at: string
  updated_at: string
  completed_at?: string | null
}

type GoalFormState = {
  id?: string
  title: string
  description: string
  target_amount: string
  current_amount: string
  target_date: string
  category: GoalCategory
  priority: 'low' | 'medium' | 'high'
  monthly_contribution: string
}

const quickPrompts = [
  'How can I save more?',
  'Analyze my spending',
  'Set a budget goal',
  'Money-saving tips',
]

const categoryOptions: { label: string; value: GoalCategory }[] = [
  { label: 'Savings', value: 'savings' },
  { label: 'Pay Off Debt', value: 'debt' },
  { label: 'Investment', value: 'investment' },
  { label: 'Major Purchase', value: 'purchase' },
  { label: 'Emergency Fund', value: 'emergency_fund' },
  { label: 'Retirement', value: 'retirement' },
  { label: 'Other', value: 'other' },
]

const priorityOptions: Array<GoalFormState['priority']> = ['low', 'medium', 'high']

const emptyGoalForm: GoalFormState = {
  title: '',
  description: '',
  target_amount: '',
  current_amount: '',
  target_date: '',
  category: 'savings',
  priority: 'medium',
  monthly_contribution: '',
}

// Old Money Color Palette
const oldMoneyTheme = {
  primary: '#1B4332', // Deep forest green
  secondary: '#8B4513', // Rich brown
  accent: '#D4AF37', // Antique gold
  background: '#FAF7F2', // Warm cream
  surface: '#FFFFFF',
  surfaceAlt: '#F5F1E8', // Warm off-white
  ink: '#2C3E50', // Deep slate
  mutedLight: '#7F8C8D',
  border: '#E8DCC4', // Soft gold border
  danger: '#8B3A3A', // Muted red
  warning: '#C19A6B', // Tan/camel
  success: '#2F5233', // Dark sage
}

const parseNullableNumber = (value: unknown) => {
  if (value === null || value === undefined) return null
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) ? num : null
}

const parseNumber = (value: unknown, fallback = 0) => {
  if (value === null || value === undefined) return fallback
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) ? num : fallback
}

const isExpired = (expiresAt?: string) => {
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() < Date.now()
}

const formatCurrency = (value: number | null) => {
  if (value === null) return 'N/A'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const formatCurrencyLoose = (value: number | null) => {
  if (value === null) return 'N/A'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

const formatDate = (dateString?: string | null) => {
  if (!dateString) return 'No deadline'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return 'No deadline'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatRelativeDate = (dateString?: string | null) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const getHealthGradient = (score: number) => {
  if (score >= 71) return ['#2F5233', '#1B4332']
  if (score >= 41) return ['#C19A6B', '#8B7355']
  return ['#8B3A3A', '#5C2626']
}

const getMetricColor = (value: number, ranges: { good: number; ok: number }, inverse = false) => {
  const successColor = oldMoneyTheme.success
  if (inverse) {
    if (value <= ranges.good) return successColor
    if (value <= ranges.ok) return oldMoneyTheme.warning
    return oldMoneyTheme.danger
  }

  if (value >= ranges.good) return successColor
  if (value >= ranges.ok) return oldMoneyTheme.warning
  return oldMoneyTheme.danger
}

export default function TaxesScreen() {
  const router = useRouter()
  const { user, status } = useAuth()

  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [insights, setInsights] = useState<FinancialInsights | null>(null)
  const [goals, setGoals] = useState<FinancialGoal[]>([])

  const [isLoadingSummary, setIsLoadingSummary] = useState(false)
  const [isLoadingInsights, setIsLoadingInsights] = useState(false)
  const [isLoadingGoals, setIsLoadingGoals] = useState(false)
  const [isRegeneratingInsights, setIsRegeneratingInsights] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [chatMenuOpen, setChatMenuOpen] = useState(false)

  const [goalFormOpen, setGoalFormOpen] = useState(false)
  const [goalFormMode, setGoalFormMode] = useState<'create' | 'edit'>('create')
  const [goalFormState, setGoalFormState] = useState<GoalFormState>(emptyGoalForm)
  const [goalFormErrors, setGoalFormErrors] = useState<Record<string, string>>({})
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [goalDetail, setGoalDetail] = useState<FinancialGoal | null>(null)
  const [progressAmount, setProgressAmount] = useState('')
  const [isSavingGoal, setIsSavingGoal] = useState(false)
  const [isDeletingGoal, setIsDeletingGoal] = useState(false)
  const [isGeneratingAdvice, setIsGeneratingAdvice] = useState<Record<string, boolean>>({})

  // Chat preview state
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)

  const lastInsightsRefresh = useRef<number>(0)
  const fabScale = useRef(new Animated.Value(1)).current

  const canChat = status === 'authenticated' && Boolean(user?.id)

  const loadSummary = useCallback(async () => {
    if (!user?.id) return

    setIsLoadingSummary(true)
    try {
      const { data, error: summaryError } = await supabase
        .from('user_financial_summaries')
        .select(
          'total_balance, monthly_income, monthly_spending, savings_rate, spending_trend, last_updated',
        )
        .eq('user_id', user.id)
        .order('last_updated', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (summaryError) throw summaryError

      if (data) {
        setSummary({
          total_balance: parseNullableNumber(data.total_balance),
          monthly_income: parseNullableNumber(data.monthly_income),
          monthly_spending: parseNullableNumber(data.monthly_spending),
          savings_rate: parseNullableNumber(data.savings_rate),
          spending_trend: typeof data.spending_trend === 'string' ? data.spending_trend : null,
        })
      } else {
        setSummary(null)
      }
    } catch (err) {
      logError(err, 'Assistant: load summary failed')
    } finally {
      setIsLoadingSummary(false)
    }
  }, [user?.id])

  const loadInsights = useCallback(
    async (forceGenerate = false) => {
      if (!user?.id) return

      setIsLoadingInsights(true)
      try {
        const response = await fetch(chatApiUrl(`/api/insights/${user.id}`))
        const data = await response.json()
        if (!data?.success) throw new Error(data?.error || 'Unable to fetch insights.')

        const nextInsights = data?.insights ?? null
        const expired = data?.expired === true || isExpired(nextInsights?.expires_at)

        if (nextInsights && !expired) {
          setInsights(nextInsights)
        } else {
          if (nextInsights) setInsights(nextInsights)
          if (forceGenerate || expired || !nextInsights) {
            await regenerateInsights(true)
          }
        }
      } catch (err) {
        logError(err, 'Assistant: load insights failed')
        setError('Unable to load insights.')
      } finally {
        setIsLoadingInsights(false)
      }
    },
    [user?.id],
  )

  const regenerateInsights = useCallback(
    async (silent = false) => {
      if (!user?.id || isRegeneratingInsights) return

      const now = Date.now()
      if (now - lastInsightsRefresh.current < 5 * 60 * 1000 && !silent) {
        setError('Please wait a few minutes before refreshing insights again.')
        return
      }

      setIsRegeneratingInsights(true)
      if (!silent) setError(null)

      try {
        const response = await fetch(chatApiUrl('/api/insights/generate'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        })
        const data = await response.json()
        if (!data?.success) throw new Error(data?.error || 'Unable to generate insights.')

        setInsights(data.insights ?? null)
        lastInsightsRefresh.current = now
        void logEvent('insights_regenerated', { duration_ms: data?.timing ?? 0, success: true })
      } catch (err) {
        logError(err, 'Assistant: regenerate insights failed')
        if (!silent) setError('Unable to regenerate insights. Please try again.')
        void logEvent('insights_regenerated', { success: false })
      } finally {
        setIsRegeneratingInsights(false)
      }
    },
    [user?.id, isRegeneratingInsights],
  )

  const loadGoals = useCallback(async () => {
    if (!user?.id) return

    setIsLoadingGoals(true)
    try {
      const response = await fetch(chatApiUrl(`/api/goals?userId=${user.id}`))
      const data = await response.json()
      if (!data?.success) throw new Error(data?.error || 'Unable to load goals.')
      setGoals(data?.goals ?? [])
    } catch (err) {
      logError(err, 'Assistant: load goals failed')
      setError('Unable to load goals.')
    } finally {
      setIsLoadingGoals(false)
    }
  }, [user?.id])

  const loadConversations = useCallback(async () => {
    if (!user?.id) return

    setIsLoadingConversations(true)
    try {
      const response = await fetch(chatApiUrl(`/api/chat/conversations?userId=${user.id}`))
      const data = await response.json()
      if (data?.success && data.conversations) {
        setConversations(data.conversations)
      }
    } catch (err) {
      logError(err, 'Assistant: load conversations failed')
    } finally {
      setIsLoadingConversations(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return

    void Promise.all([loadSummary(), loadInsights(), loadGoals(), loadConversations()])
  }, [loadSummary, loadInsights, loadGoals, loadConversations, user?.id])

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await Promise.all([regenerateInsights(), loadGoals(), loadSummary()])
    setIsRefreshing(false)
  }, [regenerateInsights, loadGoals, loadSummary])

  const openChat = useCallback(
    (params?: { prompt?: string; conversationId?: string; mode?: 'list' }) => {
      if (!canChat) {
        setError('Sign in to ask the assistant.')
        return
      }
      router.push({ pathname: '/assistant', params })
    },
    [canChat, router],
  )

  const openChatFromPrompt = (prompt: string) => {
    openChat({ prompt })
    setChatMenuOpen(false)
  }

  const openChatHistory = () => {
    openChat({ mode: 'list' })
  }

  const openConversation = (conversationId: string) => {
    openChat({ conversationId })
    setChatMenuOpen(false)
  }

  const handleFABPress = () => {
    Animated.sequence([
      Animated.timing(fabScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(fabScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start()

    if (canChat) {
      setChatMenuOpen(!chatMenuOpen)
    } else {
      setError('Sign in to use the AI assistant.')
    }
  }

  const handleGoalFormChange = (field: keyof GoalFormState, value: string) => {
    setGoalFormState((prev) => ({ ...prev, [field]: value }))
    // Clear error for this field when user starts typing
    if (goalFormErrors[field]) {
      setGoalFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }

  const handleDateConfirm = ({ date }: { date: Date }) => {
    setShowDatePicker(false)
    if (date) {
      const formattedDate = date.toISOString().split('T')[0]
      setGoalFormState((prev) => ({ ...prev, target_date: formattedDate }))
    }
  }

  const handleDateDismiss = () => {
    setShowDatePicker(false)
  }

  const getSelectedDate = () => {
    if (goalFormState.target_date) {
      const date = new Date(goalFormState.target_date)
      return isNaN(date.getTime()) ? new Date() : date
    }
    return new Date()
  }

  const validateGoalForm = () => {
    const errors: Record<string, string> = {}

    if (!goalFormState.title.trim()) {
      errors.title = 'Title is required'
    }

    const targetAmount = Number(goalFormState.target_amount)
    if (!goalFormState.target_amount || !Number.isFinite(targetAmount) || targetAmount <= 0) {
      errors.target_amount = 'Target amount must be greater than 0'
    }

    if (!goalFormState.category) {
      errors.category = 'Category is required'
    }

    if (goalFormState.target_date) {
      const targetDate = new Date(goalFormState.target_date)
      if (Number.isNaN(targetDate.getTime())) {
        errors.target_date = 'Target date must be valid'
      } else if (targetDate.getTime() < Date.now()) {
        errors.target_date = 'Target date must be in the future'
      }
    }

    setGoalFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const submitGoalForm = async () => {
    if (!user?.id || isSavingGoal) return
    if (!validateGoalForm()) return

    setIsSavingGoal(true)
    setError(null)

    try {
      const payload = {
        userId: user.id,
        title: goalFormState.title.trim(),
        description: goalFormState.description.trim() || null,
        target_amount: Number(goalFormState.target_amount),
        target_date: goalFormState.target_date || null,
        category: goalFormState.category,
        priority: goalFormState.priority,
        monthly_contribution: goalFormState.monthly_contribution
          ? Number(goalFormState.monthly_contribution)
          : null,
        current_amount: goalFormState.current_amount
          ? Number(goalFormState.current_amount)
          : 0,
      }

      let goalResponse: FinancialGoal | null = null
      if (goalFormMode === 'create') {
        const response = await fetch(chatApiUrl('/api/goals'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await response.json()
        if (!data?.success) throw new Error(data?.error || 'Unable to create goal.')
        goalResponse = data.goal
        setGoals((prev) => [goalResponse!, ...prev])
        void logEvent('goal_created', {
          category: payload.category,
          target_amount: payload.target_amount,
        })
      } else if (goalFormState.id) {
        const response = await fetch(chatApiUrl(`/api/goals/${goalFormState.id}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, userId: user.id }),
        })
        const data = await response.json()
        if (!data?.success) throw new Error(data?.error || 'Unable to update goal.')
        goalResponse = data.goal
        setGoals((prev) => prev.map((goal) => (goal.id === goalResponse!.id ? goalResponse! : goal)))
      }

      setGoalFormOpen(false)
      setGoalFormState(emptyGoalForm)
      setGoalFormErrors({})
    } catch (err) {
      logError(err, 'Assistant: goal save failed')
      setError(err instanceof Error ? err.message : 'Unable to save goal.')
    } finally {
      setIsSavingGoal(false)
    }
  }

  const openCreateGoal = () => {
    setGoalFormMode('create')
    setGoalFormState(emptyGoalForm)
    setGoalFormErrors({})
    setGoalFormOpen(true)
  }

  const openEditGoal = (goal: FinancialGoal) => {
    setGoalFormMode('edit')
    setGoalFormState({
      id: goal.id,
      title: goal.title,
      description: goal.description ?? '',
      target_amount: String(goal.target_amount ?? ''),
      current_amount: String(goal.current_amount ?? ''),
      target_date: goal.target_date ? goal.target_date.split('T')[0] : '',
      category: goal.category,
      priority: goal.priority,
      monthly_contribution: goal.monthly_contribution ? String(goal.monthly_contribution) : '',
    })
    setGoalFormErrors({})
    setGoalFormOpen(true)
  }

  const updateGoalOptimistic = (goalId: string, updater: (goal: FinancialGoal) => FinancialGoal) => {
    setGoals((prev) => prev.map((goal) => (goal.id === goalId ? updater(goal) : goal)))
  }

  const updateGoal = async (goalId: string, updates: Partial<FinancialGoal>) => {
    if (!user?.id) return

    const previous = goals.find((goal) => goal.id === goalId)
    if (!previous) return

    updateGoalOptimistic(goalId, (goal) => ({ ...goal, ...updates }))

    try {
      const response = await fetch(chatApiUrl(`/api/goals/${goalId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, ...updates }),
      })
      const data = await response.json()
      if (!data?.success) throw new Error(data?.error || 'Unable to update goal.')
      setGoals((prev) => prev.map((goal) => (goal.id === goalId ? data.goal : goal)))
    } catch (err) {
      logError(err, 'Assistant: goal update failed')
      if (previous) {
        updateGoalOptimistic(goalId, () => previous)
      }
      setError('Unable to update goal.')
    }
  }

  const deleteGoal = async (goalId: string) => {
    if (!user?.id || isDeletingGoal) return

    setIsDeletingGoal(true)
    const previous = goals
    setGoals((prev) => prev.filter((goal) => goal.id !== goalId))

    try {
      const response = await fetch(chatApiUrl(`/api/goals/${goalId}?userId=${user.id}`), {
        method: 'DELETE',
      })
      const data = await response.json()
      if (!data?.success) throw new Error(data?.error || 'Unable to delete goal.')
      void logEvent('goal_deleted', { goal_id: goalId })
    } catch (err) {
      logError(err, 'Assistant: goal delete failed')
      setGoals(previous)
      setError('Unable to delete goal.')
    } finally {
      setIsDeletingGoal(false)
    }
  }

  const generateAdvice = async (goal: FinancialGoal) => {
    if (!user?.id || isGeneratingAdvice[goal.id]) return

    setIsGeneratingAdvice((prev) => ({ ...prev, [goal.id]: true }))
    setError(null)

    try {
      const response = await fetch(chatApiUrl(`/api/goals/${goal.id}/advice`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
      const data = await response.json()
      if (!data?.success) throw new Error(data?.error || 'Unable to generate advice.')

      updateGoalOptimistic(goal.id, (prevGoal) => ({
        ...prevGoal,
        ai_advice: data.advice,
        ai_advice_generated_at: new Date().toISOString(),
      }))

      if (goalDetail?.id === goal.id) {
        setGoalDetail({
          ...goalDetail,
          ai_advice: data.advice,
          ai_advice_generated_at: new Date().toISOString(),
        })
      }

      void logEvent('goal_advice_viewed', { goal_id: goal.id })
    } catch (err) {
      logError(err, 'Assistant: goal advice failed')
      setError('Unable to generate advice.')
    } finally {
      setIsGeneratingAdvice((prev) => ({ ...prev, [goal.id]: false }))
    }
  }

  const handleAddProgress = async () => {
    if (!goalDetail || !progressAmount.trim()) return

    const amount = Number(progressAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid amount to add.')
      return
    }

    const newAmount = parseNumber(goalDetail.current_amount) + amount
    await updateGoal(goalDetail.id, { current_amount: newAmount })
    setProgressAmount('')
  }

  const projections = insights?.projections
  const optimizationsSorted = useMemo(() => {
    const list = insights?.optimizations ?? []
    const priorityRank: Record<Optimization['priority'], number> = {
      high: 0,
      medium: 1,
      low: 2,
    }
    return [...list]
      .sort((a, b) => {
        const priorityDiff = priorityRank[a.priority] - priorityRank[b.priority]
        if (priorityDiff !== 0) return priorityDiff
        return b.potential_savings - a.potential_savings
      })
      .slice(0, 5)
  }, [insights?.optimizations])

  const keyMetrics = insights?.key_metrics

  const hasFinancialData =
    (summary?.monthly_spending ?? 0) > 0 || (summary?.total_balance ?? 0) > 0

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      {/* Elegant Header */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <View>
            <Text style={styles.headerTitle}>Wealth Management</Text>
            <Text style={styles.headerSubtitle}>Private Financial Intelligence</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <IconButton
            icon="history"
            size={20}
            onPress={openChatHistory}
            iconColor={oldMoneyTheme.accent}
            accessibilityLabel="Open conversation history"
          />
          <IconButton
            icon={isRegeneratingInsights ? 'loading' : 'refresh'}
            size={20}
            onPress={() => regenerateInsights()}
            iconColor={oldMoneyTheme.accent}
            accessibilityLabel="Refresh insights"
            disabled={isRegeneratingInsights}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={onRefresh}
            tintColor={oldMoneyTheme.primary}
          />
        }
      >
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {!hasFinancialData && !isLoadingSummary ? (
          <View style={styles.emptyStateCard}>
            <Text style={styles.emptyStateTitle}>Begin Your Financial Journey</Text>
            <Text style={styles.emptyStateText}>
              Connect your accounts to unlock bespoke insights and personalized wealth strategies.
            </Text>
          </View>
        ) : null}

        {/* Financial Health Score - Premium Design */}
        <View style={styles.sectionCard}>
          <View style={styles.decorativeLine} />
          <Text style={styles.sectionTitle}>Financial Health Assessment</Text>
          {isLoadingInsights ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color={oldMoneyTheme.primary} />
              <Text style={styles.loadingText}>Analyzing portfolio...</Text>
            </View>
          ) : insights?.wealth_analysis ? (
            <LinearGradient
              colors={getHealthGradient(insights.wealth_analysis.financial_health_score)}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.healthScoreCard}
            >
              <Text style={styles.healthScoreLabel}>WEALTH INDEX</Text>
              <Text style={styles.healthScoreValue}>
                {Math.round(insights.wealth_analysis.financial_health_score)}
              </Text>
              <Text style={styles.healthScoreComparison}>
                {insights.wealth_analysis.comparison}
              </Text>
              {insights.ai_summary ? (
                <Text style={styles.healthScoreSummary} >
                  {insights.ai_summary}
                </Text>
              ) : null}
            </LinearGradient>
          ) : (
            <Text style={styles.emptySectionText}>Assessment pending...</Text>
          )}
        </View>

        {/* Future Projections */}
        <View style={styles.sectionCard}>
          <View style={styles.decorativeLine} />
          <Text style={styles.sectionTitle}>Portfolio Projections</Text>
          {projections ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(
                [
                  { key: '1_month', label: 'One Month' },
                  { key: '3_months', label: 'Quarter' },
                  { key: '6_months', label: 'Semi-Annual' },
                  { key: '1_year', label: 'Annual' },
                ] as const
              ).map((item) => {
                const projection = projections[item.key]
                if (!projection) return null
                return (
                  <View key={item.key} style={styles.projectionCard}>
                    <Text style={styles.projectionLabel}>{item.label}</Text>
                    <Text style={styles.projectionValue}>
                      {formatCurrencyLoose(projection.balance)}
                    </Text>
                    <View style={styles.projectionDivider} />
                    <View style={styles.projectionMetaRow}>
                      <Text style={styles.projectionMeta}>Savings</Text>
                      <Text style={styles.projectionMetaValue}>
                        {formatCurrencyLoose(projection.savings)}
                      </Text>
                    </View>
                    <View style={styles.projectionMetaRow}>
                      <Text style={styles.projectionMeta}>Spending</Text>
                      <Text style={styles.projectionMetaValue}>
                        {formatCurrencyLoose(projection.spending)}
                      </Text>
                    </View>
                  </View>
                )
              })}
            </ScrollView>
          ) : (
            <Text style={styles.emptySectionText}>Projections unavailable</Text>
          )}
        </View>

        {/* Key Metrics */}
        <View style={styles.sectionCard}>
          <View style={styles.decorativeLine} />
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Financial Indicators</Text>
            <Text style={styles.sectionSubtitle}>Essential metrics for wealth preservation</Text>
          </View>
          {keyMetrics ? (
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <Text style={styles.metricIcon}>⏱</Text>
                  <Text style={styles.metricLabel}>Liquidity Runway</Text>
                </View>
                <Text
                  style={[
                    styles.metricValue,
                    {
                      color: getMetricColor(keyMetrics.runway_months, {
                        good: 6,
                        ok: 3,
                      }),
                    },
                  ]}
                >
                  {keyMetrics.runway_months.toFixed(1)}
                </Text>
                <Text style={styles.metricUnit}>months</Text>
              </View>
              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <Text style={styles.metricIcon}>🛡</Text>
                  <Text style={styles.metricLabel}>Reserve Fund</Text>
                </View>
                <Text
                  style={[
                    styles.metricValue,
                    {
                      color: getMetricColor(keyMetrics.emergency_fund_months, {
                        good: 6,
                        ok: 3,
                      }),
                    },
                  ]}
                >
                  {keyMetrics.emergency_fund_months.toFixed(1)}
                </Text>
                <Text style={styles.metricUnit}>months</Text>
              </View>
              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <Text style={styles.metricIcon}>📊</Text>
                  <Text style={styles.metricLabel}>Savings Rate</Text>
                </View>
                <Text
                  style={[
                    styles.metricValue,
                    {
                      color: getMetricColor(keyMetrics.savings_rate, {
                        good: 20,
                        ok: 10,
                      }),
                    },
                  ]}
                >
                  {keyMetrics.savings_rate.toFixed(0)}
                </Text>
                <Text style={styles.metricUnit}>percent</Text>
              </View>
              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <Text style={styles.metricIcon}>⚖</Text>
                  <Text style={styles.metricLabel}>Leverage Ratio</Text>
                </View>
                <Text
                  style={[
                    styles.metricValue,
                    {
                      color: getMetricColor(keyMetrics.debt_to_income_ratio * 100, {
                        good: 30,
                        ok: 50,
                      }, true),
                    },
                  ]}
                >
                  {(keyMetrics.debt_to_income_ratio * 100).toFixed(0)}
                </Text>
                <Text style={styles.metricUnit}>percent</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.emptySectionText}>Metrics pending analysis</Text>
          )}
        </View>

        {/* Optimizations */}
        <View style={styles.sectionCard}>
          <View style={styles.decorativeLine} />
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Wealth Optimization Strategies</Text>
            <Text style={styles.sectionSubtitle}>Curated opportunities for enhanced returns</Text>
          </View>
          {optimizationsSorted.length > 0 ? (
            optimizationsSorted.map((optimization, index) => (
              <View key={`${optimization.category}-${index}`} style={styles.optimizationCard}>
                <View style={styles.optimizationHeader}>
                  <View
                    style={[
                      styles.optimizationBadge,
                      optimization.priority === 'high'
                        ? styles.priorityHigh
                        : optimization.priority === 'medium'
                          ? styles.priorityMedium
                          : styles.priorityLow,
                    ]}
                  >
                    <Text style={styles.optimizationBadgeText}>
                      {optimization.priority.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.optimizationSavings}>
                    {formatCurrency(optimization.potential_savings)}/mo
                  </Text>
                </View>
                <Text style={styles.optimizationCategory}>{optimization.category}</Text>
                <Text style={styles.optimizationText}>{optimization.recommendation}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptySectionText}>Portfolio optimized</Text>
          )}
        </View>

        {/* Spending Insights */}
        <View style={styles.sectionCard}>
          <View style={styles.decorativeLine} />
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Expenditure Analysis</Text>
            <Text style={styles.sectionSubtitle}>Strategic allocation recommendations</Text>
          </View>
          {insights?.spending_insights ? (
            <View style={styles.insightsGrid}>
              <View style={styles.insightCard}>
                <View style={styles.insightHeaderRow}>
                  <Text style={styles.insightIcon}>✓</Text>
                  <Text style={styles.insightTitle}>Invest More</Text>
                </View>
                <View style={styles.tagWrap}>
                  {insights.spending_insights.spend_more_on?.length ? (
                    insights.spending_insights.spend_more_on.map((item) => (
                      <View key={item} style={styles.tag}>
                        <Text style={styles.tagText}>{item}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.insightsEmpty}>Balanced</Text>
                  )}
                </View>
              </View>
              <View style={styles.insightCard}>
                <View style={styles.insightHeaderRow}>
                  <Text style={styles.insightIcon}>−</Text>
                  <Text style={styles.insightTitle}>Reduce</Text>
                </View>
                <View style={styles.tagWrap}>
                  {insights.spending_insights.cut_spending_on?.length ? (
                    insights.spending_insights.cut_spending_on.map((item) => (
                      <View key={item} style={styles.tag}>
                        <Text style={styles.tagText}>{item}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.insightsEmpty}>Optimal</Text>
                  )}
                </View>
              </View>
              <View style={styles.insightCard}>
                <View style={styles.insightHeaderRow}>
                  <Text style={styles.insightIcon}>⚡</Text>
                  <Text style={styles.insightTitle}>Optimize</Text>
                </View>
                <View style={styles.tagWrap}>
                  {insights.spending_insights.optimize?.length ? (
                    insights.spending_insights.optimize.map((item) => (
                      <View key={item} style={styles.tag}>
                        <Text style={styles.tagText}>{item}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.insightsEmpty}>Efficient</Text>
                  )}
                </View>
              </View>
            </View>
          ) : (
            <Text style={styles.emptySectionText}>Analysis pending</Text>
          )}
        </View>

        {/* Financial Goals */}
        <View style={styles.sectionCard}>
          <View style={styles.decorativeLine} />
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Financial Objectives</Text>
            <Button 
              mode="contained" 
              onPress={openCreateGoal} 
              compact
              buttonColor={oldMoneyTheme.primary}
              textColor={oldMoneyTheme.accent}
            >
              + New Goal
            </Button>
          </View>
          {isLoadingGoals ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color={oldMoneyTheme.primary} />
              <Text style={styles.loadingText}>Loading objectives...</Text>
            </View>
          ) : goals.length === 0 ? (
            <View style={styles.emptyStateCard}>
              <Text style={styles.emptyStateTitle}>No objectives established</Text>
              <Text style={styles.emptyStateText}>Define your financial aspirations to begin tracking progress.</Text>
              <Button 
                mode="outlined" 
                onPress={openCreateGoal} 
                style={styles.emptyStateButton}
                textColor={oldMoneyTheme.primary}
                >
                Establish First Objective
              </Button>
            </View>
          ) : (
            goals.map((goal) => {
              const targetAmount = parseNumber(goal.target_amount)
              const currentAmount = parseNumber(goal.current_amount)
              const progress = targetAmount > 0 ? Math.min(1, currentAmount / targetAmount) : 0
              const percent = Math.round(progress * 100)
              const isOverdue =
                goal.target_date &&
                new Date(goal.target_date).getTime() < Date.now() &&
                goal.status === 'active'

              return (
                <TouchableOpacity
                  key={goal.id}
                  style={styles.goalCard}
                  onPress={() => setGoalDetail(goal)}
                  activeOpacity={0.8}
                >
                  <View style={styles.goalHeader}>
                    <Text style={styles.goalTitle}>{goal.title}</Text>
                    <Text style={styles.goalPercent}>{percent}%</Text>
                  </View>
                  <Text style={styles.goalAmount}>
                    {formatCurrencyLoose(currentAmount)} / {formatCurrencyLoose(targetAmount)}
                  </Text>
                  <ProgressBar 
                    progress={progress} 
                    color={oldMoneyTheme.accent} 
                    style={styles.goalProgress} 
                  />
                  <View style={styles.goalMetaRow}>
                    <Text style={styles.goalMeta}>{goal.category.replace('_', ' ')}</Text>
                    {goal.target_date ? (
                      <Text style={[styles.goalMeta, isOverdue && styles.goalOverdue]}>
                        {isOverdue ? 'Overdue' : `Target ${formatDate(goal.target_date)}`}
                      </Text>
                    ) : (
                      <Text style={styles.goalMeta}>No deadline</Text>
                    )}
                  </View>
                  {goal.ai_advice ? (
                    <View style={styles.goalAdviceBadge}>
                      <Text style={styles.goalAdviceText}>Strategy Available</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              )
            })
          )}
        </View>
      </ScrollView>

      {/* Floating AI Assistant Button */}
      <Animated.View 
        style={[
          styles.fabContainer,
          { transform: [{ scale: fabScale }] }
        ]}
      >
        <TouchableOpacity 
          style={styles.fab}
          onPress={handleFABPress}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[oldMoneyTheme.primary, '#2F5233']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <Text style={styles.fabIcon}>✦</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Chat Menu */}
      <Portal>
        <Modal
          visible={chatMenuOpen}
          onDismiss={() => setChatMenuOpen(false)}
          contentContainerStyle={styles.chatMenuContainer}
        >
          <View style={styles.chatMenuHeader}>
            <Text style={styles.chatMenuTitle}>AI Concierge</Text>
            <IconButton
              icon="close"
              size={20}
              onPress={() => setChatMenuOpen(false)}
              iconColor={oldMoneyTheme.accent}
            />
          </View>

          <Text style={styles.chatMenuSubtitle}>Quick Consultations</Text>
          <View style={styles.chatMenuChips}>
            {quickPrompts.map((prompt) => (
              <Chip 
                key={prompt} 
                style={styles.chatMenuChip} 
                onPress={() => openChatFromPrompt(prompt)}
                textStyle={styles.chatMenuChipText}
              >
                {prompt}
              </Chip>
            ))}
          </View>

          <Text style={styles.chatMenuSubtitle}>Recent Discussions</Text>
          {isLoadingConversations ? (
            <Text style={styles.chatMenuEmpty}>Loading...</Text>
          ) : conversations.length === 0 ? (
            <Text style={styles.chatMenuEmpty}>No previous consultations</Text>
          ) : (
            conversations.slice(0, 3).map((conv) => (
              <TouchableOpacity
                key={conv.id}
                style={styles.conversationRow}
                onPress={() => openConversation(conv.id)}
              >
                <View>
                  <Text style={styles.conversationTitle}>{conv.title || 'Conversation'}</Text>
                  <Text style={styles.conversationMeta}>
                    {conv.message_count} messages • {formatRelativeDate(conv.last_message_at)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}

          <View style={styles.chatMenuActions}>
            <Button 
              mode="outlined" 
              onPress={() => { setChatMenuOpen(false); openChat(); }}
              textColor={oldMoneyTheme.primary}
              style={styles.chatMenuButton}
            >
              View All
            </Button>
            <Button 
              mode="contained" 
              onPress={() => { setChatMenuOpen(false); openChat(); }}
              buttonColor={oldMoneyTheme.primary}
              textColor={oldMoneyTheme.accent}
              style={styles.chatMenuButton}
            >
              New Consultation
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Goal Form Modal - Fixed Structure */}
      <Portal>
        <Modal
          visible={goalFormOpen}
          onDismiss={() => setGoalFormOpen(false)}
          contentContainerStyle={styles.modalContainer}
        >
          {/* Fixed Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>
                {goalFormMode === 'create' ? 'Establish New Objective' : 'Revise Objective'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {goalFormMode === 'create' 
                  ? 'Define your financial aspiration' 
                  : 'Update your financial objective'}
              </Text>
            </View>
            <IconButton
              icon="close"
              size={24}
              onPress={() => setGoalFormOpen(false)}
              iconColor={oldMoneyTheme.accent}
            />
          </View>

          {/* Scrollable Content Area */}
          <View style={styles.modalContent}>
            <ScrollView 
              showsVerticalScrollIndicator={true}
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
            >
              <Divider style={styles.modalDivider} />

              {/* Basic Information Section */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Basic Information</Text>
                
                <TextInput
                  label="Objective Title *"
                  value={goalFormState.title}
                  onChangeText={(value) => handleGoalFormChange('title', value)}
                  style={styles.modalInput}
                  error={Boolean(goalFormErrors.title)}
                  mode="outlined"
                  outlineColor={oldMoneyTheme.border}
                  activeOutlineColor={oldMoneyTheme.primary}
                  placeholder="e.g., European Vacation Fund"
                />
                {goalFormErrors.title ? <Text style={styles.formError}>{goalFormErrors.title}</Text> : null}

                <TextInput
                  label="Description"
                  value={goalFormState.description}
                  onChangeText={(value) => handleGoalFormChange('description', value)}
                  style={styles.modalInput}
                  multiline
                  numberOfLines={3}
                  mode="outlined"
                  outlineColor={oldMoneyTheme.border}
                  activeOutlineColor={oldMoneyTheme.primary}
                  placeholder="Add details about this objective..."
                />
              </View>

              <Divider style={styles.modalDivider} />

              {/* Financial Details Section */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Financial Details</Text>
                
                <View style={styles.inputRow}>
                  <View style={styles.inputHalf}>
                    <TextInput
                      label="Target Amount *"
                      value={goalFormState.target_amount}
                      onChangeText={(value) => handleGoalFormChange('target_amount', value)}
                      keyboardType="numeric"
                      style={styles.modalInput}
                      error={Boolean(goalFormErrors.target_amount)}
                      mode="outlined"
                      outlineColor={oldMoneyTheme.border}
                      activeOutlineColor={oldMoneyTheme.primary}
                      placeholder="10000"
                      left={<TextInput.Affix text="$" />}
                    />
                    {goalFormErrors.target_amount ? (
                      <Text style={styles.formError}>{goalFormErrors.target_amount}</Text>
                    ) : null}
                  </View>

                  <View style={styles.inputHalf}>
                    <TextInput
                      label="Current Amount"
                      value={goalFormState.current_amount}
                      onChangeText={(value) => handleGoalFormChange('current_amount', value)}
                      keyboardType="numeric"
                      style={styles.modalInput}
                      mode="outlined"
                      outlineColor={oldMoneyTheme.border}
                      activeOutlineColor={oldMoneyTheme.primary}
                      placeholder="0"
                      left={<TextInput.Affix text="$" />}
                    />
                  </View>
                </View>

                <TextInput
                  label="Monthly Contribution"
                  value={goalFormState.monthly_contribution}
                  onChangeText={(value) => handleGoalFormChange('monthly_contribution', value)}
                  keyboardType="numeric"
                  style={styles.modalInput}
                  mode="outlined"
                  outlineColor={oldMoneyTheme.border}
                  activeOutlineColor={oldMoneyTheme.primary}
                  placeholder="500"
                  left={<TextInput.Affix text="$" />}
                  right={<TextInput.Affix text="/month" />}
                />
              </View>

              <Divider style={styles.modalDivider} />

              {/* Target Date Section with Calendar Picker */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Timeline</Text>
                
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <View style={styles.datePickerContent}>
                    <View style={styles.datePickerLeft}>
                      <Text style={styles.datePickerLabel}>Target Date</Text>
                      <Text style={styles.datePickerValue}>
                        {goalFormState.target_date 
                          ? formatDate(goalFormState.target_date)
                          : 'Select completion date'}
                      </Text>
                    </View>
                    <IconButton
                      icon="calendar"
                      size={24}
                      iconColor={oldMoneyTheme.accent}
                    />
                  </View>
                </TouchableOpacity>
                
                {goalFormErrors.target_date ? (
                  <Text style={styles.formError}>{goalFormErrors.target_date}</Text>
                ) : null}

                {goalFormState.target_date ? (
                  <Button
                    mode="text"
                    onPress={() => handleGoalFormChange('target_date', '')}
                    textColor={oldMoneyTheme.mutedLight}
                    compact
                    style={styles.clearDateButton}
                  >
                    Clear Date
                  </Button>
                ) : null}
              </View>

              <Divider style={styles.modalDivider} />

              {/* Category Section */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Category *</Text>
                <View style={styles.optionGrid}>
                  {categoryOptions.map((option) => (
                    <Chip
                      key={option.value}
                      selected={goalFormState.category === option.value}
                      onPress={() => handleGoalFormChange('category', option.value)}
                      style={[
                        styles.categoryChip,
                        goalFormState.category === option.value && styles.categoryChipSelected
                      ]}
                      textStyle={[
                        styles.categoryChipText,
                        goalFormState.category === option.value && styles.categoryChipTextSelected
                      ]}
                      selectedColor={oldMoneyTheme.primary}
                    >
                      {option.label}
                    </Chip>
                  ))}
                </View>
                {goalFormErrors.category ? (
                  <Text style={styles.formError}>{goalFormErrors.category}</Text>
                ) : null}
              </View>

              <Divider style={styles.modalDivider} />

              {/* Priority Section */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Priority Level</Text>
                <View style={styles.priorityRow}>
                  {priorityOptions.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.priorityButton,
                        goalFormState.priority === option && styles.priorityButtonSelected,
                        option === 'high' && goalFormState.priority === option && styles.priorityHighButton,
                        option === 'medium' && goalFormState.priority === option && styles.priorityMediumButton,
                        option === 'low' && goalFormState.priority === option && styles.priorityLowButton,
                      ]}
                      onPress={() => handleGoalFormChange('priority', option)}
                    >
                      <Text
                        style={[
                          styles.priorityButtonText,
                          goalFormState.priority === option && styles.priorityButtonTextSelected
                        ]}
                      >
                        {option === 'high' ? '⚡ High' : option === 'medium' ? '◆ Medium' : '○ Low'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>

          {/* Fixed Action Buttons */}
          <View style={styles.modalActions}>
            <Button 
              mode="outlined"
              onPress={() => setGoalFormOpen(false)} 
              disabled={isSavingGoal}
              style={styles.modalButton}
              textColor={oldMoneyTheme.ink}
            >
              Cancel
            </Button>
            <Button 
              mode="contained" 
              onPress={submitGoalForm} 
              loading={isSavingGoal}
              buttonColor={oldMoneyTheme.primary}
              textColor={oldMoneyTheme.accent}
              style={styles.modalButton}
              icon={goalFormMode === 'create' ? 'plus' : 'check'}
            >
              {goalFormMode === 'create' ? 'Establish' : 'Save Changes'}
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Calendar Date Picker Modal */}
      <DatePickerModal
        locale="en"
        mode="single"
        visible={showDatePicker}
        onDismiss={handleDateDismiss}
        date={getSelectedDate()}
        onConfirm={handleDateConfirm}
        validRange={{
          startDate: new Date(),
        }}
        saveLabel="Confirm"
        label="Select target date"
      />

      {/* Goal Detail Modal */}
      <Portal>
        <Modal
          visible={Boolean(goalDetail)}
          onDismiss={() => setGoalDetail(null)}
          contentContainerStyle={styles.detailModalContainer}
        >
          {goalDetail ? (
            <>
              <View style={styles.detailModalHeader}>
                <Text style={styles.detailModalTitle}>{goalDetail.title}</Text>
                <IconButton
                  icon="close"
                  size={24}
                  onPress={() => setGoalDetail(null)}
                  iconColor={oldMoneyTheme.accent}
                />
              </View>
              
              <ScrollView 
                style={styles.detailModalContent}
                contentContainerStyle={styles.detailModalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.detailInfoGrid}>
                  <View style={styles.detailInfoItem}>
                    <Text style={styles.detailInfoLabel}>Category</Text>
                    <Text style={styles.detailInfoValue}>{goalDetail.category.replace('_', ' ')}</Text>
                  </View>
                  <View style={styles.detailInfoItem}>
                    <Text style={styles.detailInfoLabel}>Priority</Text>
                    <Text style={styles.detailInfoValue}>{goalDetail.priority}</Text>
                  </View>
                  <View style={styles.detailInfoItem}>
                    <Text style={styles.detailInfoLabel}>Target Amount</Text>
                    <Text style={styles.detailInfoValue}>
                      {formatCurrencyLoose(parseNumber(goalDetail.target_amount))}
                    </Text>
                  </View>
                  <View style={styles.detailInfoItem}>
                    <Text style={styles.detailInfoLabel}>Current Amount</Text>
                    <Text style={styles.detailInfoValue}>
                      {formatCurrencyLoose(parseNumber(goalDetail.current_amount))}
                    </Text>
                  </View>
                </View>

                {goalDetail.target_date && (
                  <View style={styles.detailInfoItem}>
                    <Text style={styles.detailInfoLabel}>Target Date</Text>
                    <Text style={styles.detailInfoValue}>
                      {formatDate(goalDetail.target_date)}
                    </Text>
                  </View>
                )}

                {goalDetail.description && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Description</Text>
                    <Text style={styles.detailDescription}>{goalDetail.description}</Text>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Progress</Text>
                  <Text style={styles.detailProgressText}>
                    {formatCurrencyLoose(parseNumber(goalDetail.current_amount))} /{' '}
                    {formatCurrencyLoose(parseNumber(goalDetail.target_amount))}
                  </Text>
                  <ProgressBar
                    progress={(() => {
                      const target = parseNumber(goalDetail.target_amount)
                      const current = parseNumber(goalDetail.current_amount)
                      if (target <= 0) return 0
                      return Math.min(1, current / target)
                    })()}
                    color={oldMoneyTheme.accent}
                    style={styles.goalProgress}
                  />
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Strategic Advice</Text>
                  {goalDetail.ai_advice ? (
                    <View>
                      <View style={styles.adviceFeasibility}>
                        <Text style={styles.adviceFeasibilityLabel}>Feasibility:</Text>
                        <Text style={[
                          styles.adviceFeasibilityValue,
                          goalDetail.ai_advice.feasibility === 'easy' && styles.feasibilityEasy,
                          goalDetail.ai_advice.feasibility === 'moderate' && styles.feasibilityModerate,
                          goalDetail.ai_advice.feasibility === 'challenging' && styles.feasibilityChallenging,
                          goalDetail.ai_advice.feasibility === 'difficult' && styles.feasibilityDifficult,
                        ]}>
                          {goalDetail.ai_advice.feasibility}
                        </Text>
                      </View>
                      
                      <View style={styles.adviceDetail}>
                        <Text style={styles.adviceDetailLabel}>Recommended Monthly:</Text>
                        <Text style={styles.adviceDetailValue}>
                          {formatCurrencyLoose(goalDetail.ai_advice.recommended_monthly)}
                        </Text>
                      </View>
                      
                      <View style={styles.adviceDetail}>
                        <Text style={styles.adviceDetailLabel}>Timeline Estimate:</Text>
                        <Text style={styles.adviceDetailValue}>
                          {goalDetail.ai_advice.timeline_estimate}
                        </Text>
                      </View>
                      
                      <Text style={styles.detailSubTitle}>Action Steps</Text>
                      {goalDetail.ai_advice.steps.map((step, index) => (
                        <View key={index} style={styles.adviceStep}>
                          <Text style={styles.adviceStepNumber}>{index + 1}.</Text>
                          <Text style={styles.adviceStepText}>{step}</Text>
                        </View>
                      ))}
                      
                      <Text style={styles.detailSubTitle}>Optimizations</Text>
                      {goalDetail.ai_advice.optimizations.map((opt, index) => (
                        <Text key={index} style={styles.detailBullet}>
                          • {opt}
                        </Text>
                      ))}
                      
                      <Text style={styles.detailSubTitle}>Motivation</Text>
                      <Text style={styles.detailMeta}>{goalDetail.ai_advice.motivation}</Text>
                      
                      {goalDetail.ai_advice.warnings?.length ? (
                        <>
                          <Text style={styles.detailSubTitle}>Considerations</Text>
                          {goalDetail.ai_advice.warnings.map((warn, index) => (
                            <Text key={index} style={styles.detailBullet}>
                              • {warn}
                            </Text>
                          ))}
                        </>
                      ) : null}
                    </View>
                  ) : (
                    <Button
                      mode="outlined"
                      onPress={() => generateAdvice(goalDetail)}
                      loading={Boolean(isGeneratingAdvice[goalDetail.id])}
                      textColor={oldMoneyTheme.primary}
                      style={styles.generateAdviceButton}
                    >
                      Request Strategy
                    </Button>
                  )}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Update Progress</Text>
                  <TextInput
                    label="Add amount"
                    value={progressAmount}
                    onChangeText={setProgressAmount}
                    keyboardType="numeric"
                    style={styles.modalInput}
                    mode="outlined"
                    outlineColor={oldMoneyTheme.border}
                    activeOutlineColor={oldMoneyTheme.primary}
                    left={<TextInput.Affix text="$" />}
                  />
                  <Button 
                    mode="contained" 
                    onPress={handleAddProgress}
                    buttonColor={oldMoneyTheme.primary}
                    textColor={oldMoneyTheme.accent}
                    style={styles.updateProgressButton}
                  >
                    Update
                  </Button>
                </View>
              </ScrollView>

              <View style={styles.detailModalActions}>
                <Button 
                  mode="outlined" 
                  onPress={() => { setGoalDetail(null); openEditGoal(goalDetail); }}
                  textColor={oldMoneyTheme.primary}
                  style={styles.detailActionButton}
                >
                  Revise
                </Button>
                <Button
                  mode="contained"
                  onPress={() => { 
                    setGoalDetail(null); 
                    deleteGoal(goalDetail.id); 
                  }}
                  loading={isDeletingGoal}
                  buttonColor={oldMoneyTheme.danger}
                  style={styles.detailActionButton}
                >
                  Remove
                </Button>
              </View>
            </>
          ) : null}
        </Modal>
      </Portal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: oldMoneyTheme.background,
  },
  headerBar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: oldMoneyTheme.border,
    backgroundColor: oldMoneyTheme.surface,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: oldMoneyTheme.primary,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    color: oldMoneyTheme.mutedLight,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  errorBanner: {
    backgroundColor: '#f8e8e8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: oldMoneyTheme.danger,
  },
  errorText: {
    color: oldMoneyTheme.danger,
    fontSize: 13,
  },
  sectionCard: {
    backgroundColor: oldMoneyTheme.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderWidth: 1,
    borderColor: oldMoneyTheme.border,
  },
  decorativeLine: {
    height: 2,
    width: 60,
    backgroundColor: oldMoneyTheme.accent,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: oldMoneyTheme.primary,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  sectionHeader: {
    marginBottom: 16,
    gap: 6,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: oldMoneyTheme.mutedLight,
    fontStyle: 'italic',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  loadingCard: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  loadingText: {
    color: oldMoneyTheme.mutedLight,
    fontSize: 13,
    fontStyle: 'italic',
  },
  emptySectionText: {
    color: oldMoneyTheme.mutedLight,
    fontStyle: 'italic',
    fontSize: 13,
  },
  healthScoreCard: {
    borderRadius: 12,
    padding: 24,
    marginTop: 8,
  },
  healthScoreLabel: {
    color: '#fff',
    fontSize: 11,
    opacity: 0.9,
    letterSpacing: 2,
    fontWeight: '600',
  },
  healthScoreValue: {
    fontSize: 48,
    fontWeight: '300',
    color: '#fff',
    marginVertical: 12,
    letterSpacing: -1,
  },
  healthScoreComparison: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 12,
    opacity: 0.95,
  },
  healthScoreSummary: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 20,
    opacity: 0.9,
  },
  projectionCard: {
    width: 180,
    padding: 16,
    marginRight: 16,
    borderRadius: 12,
    backgroundColor: oldMoneyTheme.surfaceAlt,
    borderWidth: 1,
    borderColor: oldMoneyTheme.border,
  },
  projectionLabel: {
    fontSize: 12,
    color: oldMoneyTheme.mutedLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  projectionValue: {
    fontSize: 20,
    fontWeight: '600',
    color: oldMoneyTheme.primary,
    marginVertical: 8,
  },
  projectionDivider: {
    height: 1,
    backgroundColor: oldMoneyTheme.border,
    marginVertical: 8,
  },
  projectionMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  projectionMeta: {
    fontSize: 11,
    color: oldMoneyTheme.mutedLight,
  },
  projectionMetaValue: {
    fontSize: 11,
    color: oldMoneyTheme.ink,
    fontWeight: '500',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  metricCard: {
    width: '47%',
    backgroundColor: oldMoneyTheme.surfaceAlt,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: oldMoneyTheme.border,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  metricIcon: {
    fontSize: 16,
  },
  metricLabel: {
    fontSize: 11,
    color: oldMoneyTheme.mutedLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: -0.5,
  },
  metricUnit: {
    fontSize: 11,
    color: oldMoneyTheme.mutedLight,
    marginTop: 4,
    textTransform: 'lowercase',
  },
  optimizationCard: {
    backgroundColor: oldMoneyTheme.surfaceAlt,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: oldMoneyTheme.accent,
  },
  optimizationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  optimizationBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  optimizationBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: oldMoneyTheme.ink,
    letterSpacing: 0.5,
  },
  priorityHigh: {
    backgroundColor: '#f4d4d4',
  },
  priorityMedium: {
    backgroundColor: '#f4edd4',
  },
  priorityLow: {
    backgroundColor: '#d4f4e8',
  },
  optimizationSavings: {
    fontSize: 11,
    color: oldMoneyTheme.success,
    fontWeight: '600',
  },
  optimizationCategory: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    color: oldMoneyTheme.primary,
  },
  optimizationText: {
    fontSize: 13,
    color: oldMoneyTheme.mutedLight,
    marginTop: 6,
    lineHeight: 20,
  },
  insightsGrid: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 8,
  },
  insightCard: {
    backgroundColor: oldMoneyTheme.surfaceAlt,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: oldMoneyTheme.border,
  },
  insightHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  insightIcon: {
    fontSize: 16,
    color: oldMoneyTheme.accent,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: oldMoneyTheme.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: oldMoneyTheme.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: oldMoneyTheme.border,
  },
  tagText: {
    fontSize: 11,
    color: oldMoneyTheme.ink,
  },
  insightsEmpty: {
    fontSize: 12,
    color: oldMoneyTheme.mutedLight,
    fontStyle: 'italic',
  },
  emptyStateCard: {
    backgroundColor: oldMoneyTheme.surfaceAlt,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: oldMoneyTheme.border,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: oldMoneyTheme.primary,
  },
  emptyStateText: {
    fontSize: 13,
    color: oldMoneyTheme.mutedLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyStateButton: {
    marginTop: 16,
    borderColor: oldMoneyTheme.primary,
  },
  goalCard: {
    backgroundColor: oldMoneyTheme.surfaceAlt,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: oldMoneyTheme.border,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  goalTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: oldMoneyTheme.primary,
  },
  goalPercent: {
    fontSize: 13,
    color: oldMoneyTheme.accent,
    fontWeight: '600',
  },
  goalAmount: {
    marginTop: 4,
    marginBottom: 8,
    color: oldMoneyTheme.mutedLight,
    fontSize: 12,
  },
  goalProgress: {
    marginVertical: 10,
    height: 8,
    borderRadius: 4,
    backgroundColor: oldMoneyTheme.border,
  },
  goalMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalMeta: {
    fontSize: 11,
    color: oldMoneyTheme.mutedLight,
    textTransform: 'capitalize',
  },
  goalOverdue: {
    color: oldMoneyTheme.danger,
    fontWeight: '600',
  },
  goalAdviceBadge: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: oldMoneyTheme.primary,
  },
  goalAdviceText: {
    fontSize: 10,
    color: oldMoneyTheme.accent,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  // Floating AI Button Styles
  fabContainer: {
    position: 'absolute',
    bottom: 30,
    right: 24,
    zIndex: 1000,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: oldMoneyTheme.accent,
  },
  fabIcon: {
    fontSize: 28,
    color: oldMoneyTheme.accent,
  },
  // Chat Menu Styles - Premium Design
  chatMenuContainer: {
    backgroundColor: oldMoneyTheme.background,
    marginHorizontal: 16,
    borderRadius: 20,
    maxHeight: '80%',
    borderWidth: 2,
    borderColor: oldMoneyTheme.accent,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  chatMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: oldMoneyTheme.primary,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  chatMenuTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: oldMoneyTheme.accent,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  chatMenuSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12,
    marginHorizontal: 20,
    color: oldMoneyTheme.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    borderLeftWidth: 3,
    borderLeftColor: oldMoneyTheme.accent,
    paddingLeft: 12,
  },
  chatMenuChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  chatMenuChip: {
    backgroundColor: oldMoneyTheme.surface,
    borderWidth: 1.5,
    borderColor: oldMoneyTheme.accent,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chatMenuChipText: {
    color: oldMoneyTheme.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  chatMenuEmpty: {
    color: oldMoneyTheme.mutedLight,
    marginHorizontal: 20,
    fontStyle: 'italic',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
  chatMenuActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    padding: 20,
    backgroundColor: oldMoneyTheme.surfaceAlt,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  chatMenuButton: {
    flex: 1,
    borderRadius: 10,
  },
  conversationRow: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: oldMoneyTheme.border,
    backgroundColor: oldMoneyTheme.surface,
  },
  conversationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: oldMoneyTheme.primary,
    marginBottom: 4,
  },
  conversationMeta: {
    fontSize: 11,
    color: oldMoneyTheme.mutedLight,
    marginTop: 2,
  },
  // Goal Form Modal Styles
  modalContainer: {
    backgroundColor: oldMoneyTheme.background,
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: oldMoneyTheme.accent,
    maxHeight: Dimensions.get('window').height * 0.85,
    height: 600,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 16,
    backgroundColor: oldMoneyTheme.primary,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: oldMoneyTheme.accent,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  modalSubtitle: {
    fontSize: 12,
    color: oldMoneyTheme.accent,
    fontStyle: 'italic',
    marginTop: 6,
    opacity: 0.85,
  },
  modalContent: {
    flex: 1,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  modalDivider: {
    backgroundColor: oldMoneyTheme.accent,
    opacity: 0.3,
    marginVertical: 16,
    marginHorizontal: 24,
  },
  formSection: {
    marginBottom: 20,
    paddingHorizontal: 24,
  },
  formSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: oldMoneyTheme.primary,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    borderLeftWidth: 3,
    borderLeftColor: oldMoneyTheme.accent,
    paddingLeft: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputHalf: {
    flex: 1,
  },
  modalInput: {
    marginBottom: 12,
    backgroundColor: oldMoneyTheme.surface,
  },
  datePickerButton: {
    borderWidth: 2,
    borderColor: oldMoneyTheme.accent,
    borderRadius: 12,
    backgroundColor: oldMoneyTheme.surface,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  datePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  datePickerLeft: {
    flex: 1,
  },
  datePickerLabel: {
    fontSize: 10,
    color: oldMoneyTheme.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    fontWeight: '700',
  },
  datePickerValue: {
    fontSize: 16,
    color: oldMoneyTheme.ink,
    fontWeight: '600',
  },
  clearDateButton: {
    alignSelf: 'flex-start',
    marginTop: -4,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    backgroundColor: oldMoneyTheme.surface,
    borderWidth: 1.5,
    borderColor: oldMoneyTheme.border,
    paddingVertical: 4,
  },
  categoryChipSelected: {
    backgroundColor: oldMoneyTheme.primary,
    borderColor: oldMoneyTheme.accent,
    borderWidth: 2,
    shadowColor: oldMoneyTheme.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  categoryChipText: {
    color: oldMoneyTheme.ink,
    fontSize: 12,
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: oldMoneyTheme.accent,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: oldMoneyTheme.border,
    backgroundColor: oldMoneyTheme.surface,
    alignItems: 'center',
  },
  priorityButtonSelected: {
    borderWidth: 2.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  priorityHighButton: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
  },
  priorityMediumButton: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  priorityLowButton: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
  },
  priorityButtonText: {
    fontSize: 14,
    color: oldMoneyTheme.ink,
    fontWeight: '600',
  },
  priorityButtonTextSelected: {
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: oldMoneyTheme.surfaceAlt,
    borderTopWidth: 1,
    borderTopColor: oldMoneyTheme.border,
  },
  modalButton: {
    flex: 1,
    borderRadius: 10,
  },
  formError: {
    color: oldMoneyTheme.danger,
    marginBottom: 12,
    fontSize: 11,
    marginTop: -8,
    fontWeight: '600',
  },
  // Goal Detail Modal Styles - FIXED
  detailModalContainer: {
    backgroundColor: oldMoneyTheme.background,
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: oldMoneyTheme.accent,
    maxHeight: Dimensions.get('window').height * 0.85,
    height: Dimensions.get('window').height * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  detailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 16,
    backgroundColor: oldMoneyTheme.primary,
  },
  detailModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: oldMoneyTheme.accent,
    letterSpacing: 0.5,
    flex: 1,
    marginRight: 8,
  },
  detailModalContent: {
    flex: 1,
  },
  detailModalScrollContent: {
    padding: 24,
    paddingBottom: 20,
    flexGrow: 1,
  },
  detailInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  detailInfoItem: {
    flex: 1,
    minWidth: '45%',
  },
  detailInfoLabel: {
    fontSize: 10,
    color: oldMoneyTheme.mutedLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    fontWeight: '600',
  },
  detailInfoValue: {
    fontSize: 15,
    color: oldMoneyTheme.ink,
    fontWeight: '600',
  },
  detailSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: oldMoneyTheme.border,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: oldMoneyTheme.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailSubTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: oldMoneyTheme.ink,
  },
  detailMeta: {
    fontSize: 12,
    color: oldMoneyTheme.mutedLight,
    marginBottom: 6,
    lineHeight: 18,
  },
  detailDescription: {
    fontSize: 13,
    color: oldMoneyTheme.ink,
    lineHeight: 20,
    marginTop: 4,
  },
  detailProgressText: {
    fontSize: 16,
    color: oldMoneyTheme.primary,
    fontWeight: '600',
    marginBottom: 8,
  },
  detailBullet: {
    fontSize: 12,
    color: oldMoneyTheme.mutedLight,
    marginBottom: 4,
    lineHeight: 18,
    paddingLeft: 4,
  },
  adviceFeasibility: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  adviceFeasibilityLabel: {
    fontSize: 13,
    color: oldMoneyTheme.ink,
    fontWeight: '600',
    marginRight: 8,
  },
  adviceFeasibilityValue: {
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: 'uppercase',
  },
  feasibilityEasy: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
  },
  feasibilityModerate: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
  },
  feasibilityChallenging: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
  },
  feasibilityDifficult: {
    backgroundColor: '#E5E7EB',
    color: '#1F2937',
  },
  adviceDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  adviceDetailLabel: {
    fontSize: 12,
    color: oldMoneyTheme.mutedLight,
  },
  adviceDetailValue: {
    fontSize: 13,
    color: oldMoneyTheme.ink,
    fontWeight: '600',
  },
  adviceStep: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  adviceStepNumber: {
    fontSize: 12,
    color: oldMoneyTheme.accent,
    fontWeight: '600',
    marginRight: 8,
    minWidth: 20,
  },
  adviceStepText: {
    fontSize: 12,
    color: oldMoneyTheme.mutedLight,
    flex: 1,
    lineHeight: 18,
  },
  generateAdviceButton: {
    marginTop: 8,
    borderColor: oldMoneyTheme.primary,
  },
  updateProgressButton: {
    marginTop: 12,
  },
  detailModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: oldMoneyTheme.surfaceAlt,
    borderTopWidth: 1,
    borderTopColor: oldMoneyTheme.border,
  },
  detailActionButton: {
    flex: 1,
    borderRadius: 10,
  },
})
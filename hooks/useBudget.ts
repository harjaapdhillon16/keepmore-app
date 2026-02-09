import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type BudgetRow = {
  id: string
  user_id: string
  month_start: string
  amount: number
}

type BudgetState = {
  budget: BudgetRow | null
  loading: boolean
  error?: string
}

const getMonthStart = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}-01`
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message
  return fallback
}

export function useBudget(userId?: string | null) {
  const [state, setState] = useState<BudgetState>({
    budget: null,
    loading: false,
  })

  const refresh = useCallback(async () => {
    if (!userId) {
      setState({ budget: null, loading: false })
      return
    }

    setState((prev) => ({ ...prev, loading: true, error: undefined }))

    try {
      const monthStart = getMonthStart()
      const { data, error } = await supabase
        .from('user_budgets')
        .select('id, user_id, month_start, amount')
        .eq('user_id', userId)
        .eq('month_start', monthStart)
        .maybeSingle()

      if (error) throw error

      const normalized = data
        ? { ...(data as BudgetRow), amount: Number((data as any).amount ?? 0) }
        : null
      setState({ budget: normalized, loading: false })
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(error, 'Unable to load budget.'),
      }))
    }
  }, [userId])

  const saveBudget = useCallback(
    async (amount: number) => {
      if (!userId) {
        throw new Error('Missing user.')
      }

      const monthStart = getMonthStart()
      const payload = {
        user_id: userId,
        month_start: monthStart,
        amount,
        updated_at: new Date().toISOString(),
      }
      await supabase.from('user_budgets').delete().eq('user_id', userId).eq('month_start', monthStart)
      const { data, error } = await supabase
        .from('user_budgets')
        .insert(payload)
        .select('id, user_id, month_start, amount')
        .single()

      if (error) {
        throw error
      }

      const normalized = {
        ...(data as BudgetRow),
        amount: Number((data as any).amount ?? 0),
      }
      setState((prev) => ({ ...prev, budget: normalized }))
      return normalized
    },
    [userId],
  )

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { ...state, refresh, saveBudget }
}

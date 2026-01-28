import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type PlaidTransactionRow = {
  id: string
  amount: number | string | null
  date: string | null
  datetime?: string | null
  merchant_name?: string | null
  name?: string | null
  iso_currency_code?: string | null
  personal_finance_category?: unknown
  personal_finance_category_icon_url?: string | null
  payment_channel?: string | null
  pending?: boolean | null
  category?: string[] | null
  transaction_type?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type PlaidRecurringTransactionRow = {
  id: string
  merchant_name?: string | null
  description?: string | null
  average_amount?: unknown
  predicted_next_date?: string | null
  frequency?: string | null
  is_active?: boolean | null
  status?: string | null
  personal_finance_category?: unknown
  last_amount?: unknown
  last_date?: string | null
  created_at?: string | null
  updated_at?: string | null
}

type PlaidDataState = {
  transactions: PlaidTransactionRow[]
  recurring: PlaidRecurringTransactionRow[]
  loading: boolean
  error?: string
}

const transactionsSelect =
  'id, amount, date, datetime, merchant_name, name, iso_currency_code, personal_finance_category, personal_finance_category_icon_url, payment_channel, pending, category, transaction_type, created_at, updated_at'

const recurringSelect =
  'id, merchant_name, description, average_amount, predicted_next_date, frequency, is_active, status, personal_finance_category, last_amount, last_date, created_at, updated_at'

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message
  return fallback
}

export function usePlaidData(userId?: string | null) {
  const [state, setState] = useState<PlaidDataState>({
    transactions: [],
    recurring: [],
    loading: false,
  })

  const refresh = useCallback(async () => {
    if (!userId) {
      setState({ transactions: [], recurring: [], loading: false })
      return
    }

    setState((prev) => ({ ...prev, loading: true, error: undefined }))

    try {
      const [transactionsResult, recurringResult] = await Promise.all([
        supabase
          .from('plaid_transactions')
          .select(transactionsSelect)
          .eq('user_id', userId)
          .order('date', { ascending: false }),
        supabase
          .from('plaid_recurring_transactions')
          .select(recurringSelect)
          .eq('user_id', userId)
          .order('predicted_next_date', { ascending: true }),
      ])

      if (transactionsResult.error) {
        throw transactionsResult.error
      }

      if (recurringResult.error) {
        throw recurringResult.error
      }

      setState({
        transactions: transactionsResult.data ?? [],
        recurring: recurringResult.data ?? [],
        loading: false,
      })
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(error, 'Unable to load transactions.'),
      }))
    }
  }, [userId])

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      if (!userId) {
        if (isMounted) {
          setState({ transactions: [], recurring: [], loading: false })
        }
        return
      }

      setState((prev) => ({ ...prev, loading: true, error: undefined }))

      try {
        const [transactionsResult, recurringResult] = await Promise.all([
          supabase
            .from('plaid_transactions')
            .select(transactionsSelect)
            .eq('user_id', userId)
            .order('date', { ascending: false }),
          supabase
            .from('plaid_recurring_transactions')
            .select(recurringSelect)
            .eq('user_id', userId)
            .order('predicted_next_date', { ascending: true }),
        ])

        if (transactionsResult.error) {
          throw transactionsResult.error
        }

        if (recurringResult.error) {
          throw recurringResult.error
        }

        if (isMounted) {
          setState({
            transactions: transactionsResult.data ?? [],
            recurring: recurringResult.data ?? [],
            loading: false,
          })
        }
      } catch (error) {
        if (isMounted) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: getErrorMessage(error, 'Unable to load transactions.'),
          }))
        }
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [userId])

  return { ...state, refresh }
}

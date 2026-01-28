import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type InvestmentHoldingRow = {
  id: string
  account_id?: string | null
  account_name?: string | null
  account_type?: string | null
  account_subtype?: string | null
  institution_name?: string | null
  security_id?: string | null
  security_name?: string | null
  symbol?: string | null
  quantity?: number | string | null
  price?: number | string | null
  value?: number | string | null
  cost_basis?: number | string | null
  iso_currency_code?: string | null
  unofficial_currency_code?: string | null
  last_updated_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

type InvestmentsState = {
  holdings: InvestmentHoldingRow[]
  loading: boolean
  error?: string
}

const holdingsSelect =
  'id, account_id, account_name, account_type, account_subtype, institution_name, security_id, security_name, symbol, quantity, price, value, cost_basis, iso_currency_code, unofficial_currency_code, last_updated_at, created_at, updated_at'

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message
  return fallback
}

export function useInvestments(userId?: string | null) {
  const [state, setState] = useState<InvestmentsState>({
    holdings: [],
    loading: false,
  })

  const refresh = useCallback(async () => {
    if (!userId) {
      setState({ holdings: [], loading: false })
      return
    }

    setState((prev) => ({ ...prev, loading: true, error: undefined }))

    try {
      const { data, error } = await supabase
        .from('plaid_investments')
        .select(holdingsSelect)
        .eq('user_id', userId)
        .order('value', { ascending: false })

      if (error) {
        throw error
      }

      setState({ holdings: data ?? [], loading: false })
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(error, 'Unable to load investments.'),
      }))
    }
  }, [userId])

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      if (!userId) {
        if (isMounted) {
          setState({ holdings: [], loading: false })
        }
        return
      }

      setState((prev) => ({ ...prev, loading: true, error: undefined }))

      try {
        const { data, error } = await supabase
          .from('plaid_investments')
          .select(holdingsSelect)
          .eq('user_id', userId)
          .order('value', { ascending: false })

        if (error) {
          throw error
        }

        if (isMounted) {
          setState({ holdings: data ?? [], loading: false })
        }
      } catch (error) {
        if (isMounted) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: getErrorMessage(error, 'Unable to load investments.'),
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

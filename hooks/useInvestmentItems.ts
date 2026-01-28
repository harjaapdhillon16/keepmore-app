import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type InvestmentItemsState = {
  hasLinkedItem: boolean
  loading: boolean
  error?: string
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message
  return fallback
}

export function useInvestmentItems(userId?: string | null) {
  const [state, setState] = useState<InvestmentItemsState>({
    hasLinkedItem: false,
    loading: false,
  })

  const refresh = useCallback(async () => {
    if (!userId) {
      setState({ hasLinkedItem: false, loading: false })
      return
    }

    setState((prev) => ({ ...prev, loading: true, error: undefined }))

    try {
      const { data, error } = await supabase
        .from('plaid_investment_items')
        .select('id')
        .eq('user_id', userId)
        .limit(1)

      if (error) {
        console.log({ error })
        throw error
      }

      setState({ hasLinkedItem: (data ?? []).length > 0, loading: false })
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(error, 'Unable to load investment accounts.'),
      }))
    }
  }, [userId])

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      if (!userId) {
        if (isMounted) {
          setState({ hasLinkedItem: false, loading: false })
        }
        return
      }

      setState((prev) => ({ ...prev, loading: true, error: undefined }))

      try {
        const { data, error } = await supabase
          .from('plaid_investment_items')
          .select('id')
          .eq('user_id', userId)
          .limit(1)

        if (error) {
          console.log({ error })
          throw error
        }

        if (isMounted) {
          setState({ hasLinkedItem: (data ?? []).length > 0, loading: false })
        }
      } catch (error) {
        if (isMounted) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: getErrorMessage(error, 'Unable to load investment accounts.'),
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

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

type CurrencySource =
  | 'unknown'
  | 'default'
  | 'user_currency'
  | 'plaid'
  | 'statement'
  | 'manual'

type CurrencyContextValue = {
  currency: string
  source: CurrencySource
  loading: boolean
  setCurrency: (
    currency: string,
    options?: { persist?: boolean; source?: CurrencySource },
  ) => Promise<void>
  refresh: () => Promise<void>
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined)

const DEFAULT_CURRENCY = 'USD'

const normalizeCurrency = (value: string | null | undefined) => {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed ? trimmed.toUpperCase() : null
}

const updateOrInsertByUser = async (
  table: string,
  payload: Record<string, unknown>,
) => {
  const { data: updated, error: updateError } = await supabase
    .from(table)
    .update(payload)
    .eq('user_id', payload.user_id as string)
    .select('user_id')

  if (updateError) {
    return updateError
  }

  if (updated && updated.length > 0) {
    return null
  }

  const { error: insertError } = await supabase.from(table).insert(payload)
  return insertError ?? null
}

const getCurrencySymbol = (currency: string) => {
  try {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(0)
    const symbol = formatted.replace(/[\d\s.,-]/g, '')
    return symbol || null
  } catch {
    return null
  }
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [currency, setCurrencyState] = useState(DEFAULT_CURRENCY)
  const [source, setSource] = useState<CurrencySource>('unknown')
  const [loading, setLoading] = useState(false)

  const persistCurrency = useCallback(async (userId: string, next: string) => {
    const currencySymbol = getCurrencySymbol(next)
    const currencyError = await updateOrInsertByUser('user_currency', {
      user_id: userId,
      currency: next,
      currency_symbol: currencySymbol,
    })

    if (currencyError && typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[currency] Failed to update user_currency', currencyError)
    }
  }, [])

  const setCurrency = useCallback(
    async (next: string, options?: { persist?: boolean; source?: CurrencySource }) => {
      const normalized = normalizeCurrency(next) ?? DEFAULT_CURRENCY
      setCurrencyState(normalized)
      setSource(options?.source ?? 'manual')

      if (!user?.id || options?.persist === false) {
        return
      }

      await persistCurrency(user.id, normalized)
    },
    [persistCurrency, user?.id],
  )

  const fetchFromUserCurrency = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('user_currency')
      .select('currency')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[currency] Unable to read user_currency', error)
      }
      return null
    }

    return normalizeCurrency(data?.currency)
  }, [])

  const inferFromPlaid = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('plaid_transactions')
      .select('iso_currency_code, date')
      .eq('user_id', userId)
      .not('iso_currency_code', 'is', null)
      .order('date', { ascending: false })
      .limit(1)

    if (!error) {
      const inferred = normalizeCurrency(data?.[0]?.iso_currency_code)
      if (inferred) return inferred
    } else if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[currency] Unable to infer from plaid_transactions', error)
    }

    const { data: investmentData, error: investmentError } = await supabase
      .from('plaid_investments')
      .select('iso_currency_code, last_updated_at')
      .eq('user_id', userId)
      .not('iso_currency_code', 'is', null)
      .order('last_updated_at', { ascending: false })
      .limit(1)

    if (investmentError) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[currency] Unable to infer from plaid_investments', investmentError)
      }
      return null
    }

    return normalizeCurrency(investmentData?.[0]?.iso_currency_code)
  }, [])

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setCurrencyState(DEFAULT_CURRENCY)
      setSource('default')
      return
    }

    setLoading(true)
    try {
      const fromUserCurrency = await fetchFromUserCurrency(user.id)
      if (fromUserCurrency) {
        setCurrencyState(fromUserCurrency)
        setSource('user_currency')
        return
      }

      const inferred = await inferFromPlaid(user.id)
      if (inferred) {
        await setCurrency(inferred, { source: 'plaid' })
        return
      }

      setCurrencyState(DEFAULT_CURRENCY)
      setSource('default')
    } finally {
      setLoading(false)
    }
  }, [fetchFromUserCurrency, inferFromPlaid, setCurrency, user?.id])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo(
    () => ({
      currency,
      source,
      loading,
      setCurrency,
      refresh,
    }),
    [currency, source, loading, setCurrency, refresh],
  )

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider')
  }
  return context
}

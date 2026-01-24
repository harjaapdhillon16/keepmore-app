import { useCallback, useEffect, useState } from 'react'

type Transaction = {
  id: string
  name: string
  amount: number
  date: string
  category?: string
  isBusiness?: boolean
}

type Filters = {
  startDate?: string
  endDate?: string
  category?: string
}

export function useTransactions(filters: Filters = {}) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      // TODO: call /api/transactions/list with filters.
      setTransactions([
        {
          id: 'demo-1',
          name: 'Starbucks',
          amount: -6.75,
          date: '2024-09-01',
          category: 'Dining',
        },
      ])
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { transactions, loading, refresh }
}

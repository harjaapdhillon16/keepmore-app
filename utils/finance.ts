export type PlaidPersonalFinanceCategory = {
  primary?: string
  detailed?: string
  confidence_level?: string
}

export const parseJson = <T>(value: T | string | null | undefined): T | null => {
  if (!value) return null
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T
    } catch {
      return null
    }
  }
  return value as T
}

export const toNumber = (value: number | string | null | undefined) => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export const parseDate = (value?: string | null) => {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const dateOnly = new Date(`${value}T00:00:00`)
    return Number.isNaN(dateOnly.getTime()) ? null : dateOnly
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const capitalize = (word: string) =>
  word ? `${word[0].toUpperCase()}${word.slice(1)}` : ''

export const humanizeLabel = (value?: string | null) => {
  if (!value) return 'Other'
  return value
    .toLowerCase()
    .split('_')
    .map((word) => (word === 'and' ? '&' : capitalize(word)))
    .join(' ')
}

export const getCategoryLabel = (
  personalFinanceCategory: unknown,
  fallback?: string[] | string | null,
) => {
  const parsed = parseJson<PlaidPersonalFinanceCategory>(personalFinanceCategory)
  const raw =
    parsed?.primary ||
    parsed?.detailed ||
    (Array.isArray(fallback) ? fallback[0] : fallback)
  return raw ? humanizeLabel(raw) : 'Other'
}

export const formatCurrency = (value: number, currency = 'USD') => {
  if (!Number.isFinite(value)) return '$0.00'
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    const sign = value < 0 ? '-' : ''
    return `${sign}$${Math.abs(value).toFixed(2)}`
  }
}

export const formatShortDate = (date: Date | null | undefined) => {
  if (!date) return ''
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const formatLongDate = (date: Date | null | undefined) => {
  if (!date) return ''
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

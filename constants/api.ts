const DEFAULT_API_BASE_URL = 'https://keepmore.finance'
const env = (globalThis as { process?: { env?: Record<string, string> } }).process
  ?.env

export const API_BASE_URL = env?.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL

export function apiUrl(path: string) {
  if (path.startsWith('http')) {
    return path
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}


export const API_BASE_URL = 'https://www.keepmore.finance'
export function apiUrl(path: string) {
  if (path.startsWith('http')) {
    return path
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

const CHAT_API_BASE_URL = 'https://keepmore-api-production.up.railway.app'

export function chatApiUrl(path: string) {
  if (path.startsWith('http')) {
    return path
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${CHAT_API_BASE_URL}${normalizedPath}`
}

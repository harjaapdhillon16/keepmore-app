const CHAT_API_BASE_URL = 'https://a2d1b8c9b4c0.ngrok-free.app'
const DEFAULT_API_BASE_URL = CHAT_API_BASE_URL

export const API_BASE_URL = 'https://www.keepmore.finance/'

export function apiUrl(path: string) {
  if (path.startsWith('http')) {
    return path
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}


export function chatApiUrl(path: string) {
  if (path.startsWith('http')) {
    return path
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${DEFAULT_API_BASE_URL}${normalizedPath}`
}

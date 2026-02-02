import { Platform } from 'react-native'
import Constants from 'expo-constants'
import * as Crypto from 'expo-crypto'
import { supabase } from './supabase'

const isDev = typeof __DEV__ !== 'undefined' && __DEV__

const warn = (message: string, payload?: unknown) => {
  if (!isDev) return

  if (payload !== undefined) {
    console.warn(message, payload)
  } else {
    console.warn(message)
  }
}

type EventParams = Record<string, string | number | boolean | null>

type PendingEvent = {
  user_id: string
  session_id: string | null
  event_type: string
  event_name?: string | null
  screen_name?: string | null
  metadata?: EventParams | null
  platform?: string | null
  app_version?: string | null
  app_build?: string | null
}

const maxQueueSize = 100
const flushDelayMs = 750

let initialized = false
let currentUserId: string | null = null
let sessionId: string | null = null
let pendingEvents: PendingEvent[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
let isFlushing = false

const toStringOrNull = (value: unknown) => {
  if (value === null || value === undefined) return null
  return String(value)
}

const getAppVersion = () =>
  Constants.expoConfig?.version ??
  Constants.manifest?.version ??
  Constants.nativeAppVersion ??
  null

const getAppBuild = () =>
  toStringOrNull(
    Constants.expoConfig?.ios?.buildNumber ??
      Constants.expoConfig?.android?.versionCode ??
      Constants.nativeBuildVersion ??
      null,
  )

const baseContext = {
  platform: Platform.OS,
  app_version: getAppVersion(),
  app_build: getAppBuild(),
}

const formatUuid = (bytes: Uint8Array) => {
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'))
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex
    .slice(6, 8)
    .join('')}-${hex.slice(8, 10).join('')}-${hex
    .slice(10, 16)
    .join('')}`
}

const createSessionId = async () => {
  const globalCrypto = globalThis.crypto as { randomUUID?: () => string } | undefined
  if (globalCrypto?.randomUUID) {
    return globalCrypto.randomUUID()
  }

  const bytes = await Crypto.getRandomBytesAsync(16)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  return formatUuid(bytes)
}

const ensureSessionId = async () => {
  if (sessionId) return sessionId
  sessionId = await createSessionId()
  return sessionId
}

const scheduleFlush = () => {
  if (flushTimer || isFlushing) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flushPendingEvents()
  }, flushDelayMs)
}

const enqueueEvent = (event: PendingEvent) => {
  pendingEvents.push(event)
  if (pendingEvents.length > maxQueueSize) {
    pendingEvents.splice(0, pendingEvents.length - maxQueueSize)
  }
  scheduleFlush()
}

const flushPendingEvents = async () => {
  if (isFlushing || pendingEvents.length === 0) return
  isFlushing = true

  const batch = pendingEvents.splice(0, pendingEvents.length)

  try {
    const { error } = await supabase.from('user_activity').insert(batch)
    if (error) {
      warn('[telemetry] failed to write activity', error)
      pendingEvents = batch.concat(pendingEvents)
      if (pendingEvents.length > maxQueueSize) {
        pendingEvents.splice(0, pendingEvents.length - maxQueueSize)
      }
    }
  } catch (err) {
    warn('[telemetry] unexpected telemetry failure', err)
    pendingEvents = batch.concat(pendingEvents)
  } finally {
    isFlushing = false
    if (pendingEvents.length > 0) {
      scheduleFlush()
    }
  }
}

const trackActivity = async (
  payload: {
    event_type: string
    event_name?: string | null
    screen_name?: string | null
    metadata?: EventParams | null
  },
  userId?: string | null,
) => {
  const resolvedUserId = userId ?? currentUserId
  if (!resolvedUserId) return

  const resolvedSessionId = await ensureSessionId()

  enqueueEvent({
    user_id: resolvedUserId,
    session_id: resolvedSessionId,
    event_type: payload.event_type,
    event_name: payload.event_name ?? null,
    screen_name: payload.screen_name ?? null,
    metadata: payload.metadata ?? null,
    platform: baseContext.platform,
    app_version: baseContext.app_version,
    app_build: baseContext.app_build,
  })
}

const serializeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack ?? null,
    }
  }

  let message = 'Unknown error'
  if (typeof error === 'string') {
    message = error
  } else {
    try {
      message = JSON.stringify(error)
    } catch {
      message = String(error)
    }
  }

  return {
    message,
  }
}

export const initTelemetry = async () => {
  if (initialized) return
  initialized = true
  await ensureSessionId()
}

export const logScreenView = async (screenName: string) => {
  await trackActivity({
    event_type: 'screen_view',
    event_name: 'screen_view',
    screen_name: screenName,
  })
}

export const logEvent = async (name: string, params?: EventParams) => {
  await trackActivity({
    event_type: 'event',
    event_name: name,
    metadata: params ?? null,
  })
}

export const logLogin = async (method: string, userId?: string | null) => {
  await trackActivity(
    {
      event_type: 'login',
      event_name: method,
      metadata: { method },
    },
    userId,
  )
}

export const setUserContext = async (userId?: string | null) => {
  if (!userId) {
    currentUserId = null
    sessionId = null
    return
  }

  if (currentUserId && currentUserId !== userId) {
    sessionId = null
  }

  currentUserId = userId
  await ensureSessionId()
}

export const logError = (error: unknown, context?: string) => {
  if (context) {
    warn(`[telemetry] ${context}`, error)
  } else {
    warn('[telemetry] error', error)
  }

  void trackActivity({
    event_type: 'error',
    event_name: context ?? 'error',
    metadata: serializeError(error),
  })
}

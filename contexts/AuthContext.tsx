import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import { Platform } from 'react-native'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Crypto from 'expo-crypto'
import Purchases, { LOG_LEVEL } from 'react-native-purchases'
import type { Session, User } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'
import {
  logError,
  logEvent,
  logLogin,
  setUserContext,
} from '../lib/telemetry'

type AuthState = {
  status: 'idle' | 'loading' | 'authenticated'
  user: User | null
  session: Session | null
  error?: string
  isWorking: boolean
  isSigningOut: boolean
}

type AuthContextValue = AuthState & {
  signInWithApple: () => Promise<{ success: boolean; userId?: string }>
  sendEmailOtp: (email: string) => Promise<{ success: boolean }>
  verifyEmailOtp: (
    email: string,
    token: string,
  ) => Promise<{ success: boolean; userId?: string }>
  signOut: (fn: () => void) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const env = (globalThis as { process?: { env?: Record<string, string> } }).process
  ?.env

const fallbackRevenueCatIosKey = 'appl_vsFnufLhgtzGnfpxTuLYFKJmCtT'
const fallbackRevenueCatAndroidKey = 'test_gzYNdApzdBtQNVUTEcWnHiBhVMz'

const cachedUserKey = 'keepmore:cached-user'

const revenueCatIosKey =
  env?.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || fallbackRevenueCatIosKey
const revenueCatAndroidKey =
  env?.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || fallbackRevenueCatAndroidKey

const getRevenueCatKey = () => {
  if (Platform.OS === 'ios') return revenueCatIosKey
  if (Platform.OS === 'android') return revenueCatAndroidKey
  return ''
}

const getErrorMessage = (error: unknown, fallback = 'Something went wrong') => {
  if (error instanceof Error) {
    return error.message
  }
  return fallback
}

const generateNonce = async () => {
  const bytes = await Crypto.getRandomBytesAsync(16)
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthState['status']>('loading')
  const [error, setError] = useState<string | undefined>(undefined)
  const [isWorking, setIsWorking] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [purchasesReady, setPurchasesReady] = useState(false)

  // -----------------------------
  // CACHED USER SYNC
  // -----------------------------
  useEffect(() => {
    let isMounted = true

    const loadCachedUser = async () => {
      try {
        const cached = await AsyncStorage.getItem(cachedUserKey)
        if (!isMounted) return
        if (cached) {
          const parsed = JSON.parse(cached) as User
          setUser(parsed)
          setStatus('authenticated')
        } else {
          setUser(null)
          setStatus('idle')
        }
      } catch (err) {
        if (!isMounted) return
        setUser(null)
        setStatus('idle')
      }
    }

    loadCachedUser()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    void setUserContext(user?.id ?? null)
  }, [user?.id])

  // -----------------------------
  // REVENUECAT SETUP
  // -----------------------------
  useEffect(() => {
    const apiKey = getRevenueCatKey()

    if (!apiKey) {
      console.warn(
        'Missing RevenueCat API key. Set EXPO_PUBLIC_REVENUECAT_IOS_API_KEY or EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY.',
      )
      return
    }

    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.VERBOSE)
    }

    Purchases.configure({ apiKey })
    setPurchasesReady(true)
  }, [])

  // -----------------------------
  // SYNC USER TO REVENUECAT
  // -----------------------------
  useEffect(() => {
    if (!purchasesReady) return

    const syncPurchases = async () => {
      try {
        if (user?.id) {
          await Purchases.logIn(user.id)

          if (user.email) {
            await Purchases.setAttributes({ email: user.email })
          }
        } else {
          await Purchases.logOut()
        }
      } catch (err) {
        console.warn('Failed to sync RevenueCat user:', err)
      }
    }

    syncPurchases()
  }, [user?.id, user?.email, purchasesReady])

  // -----------------------------
  // APPLE SIGN IN
  // -----------------------------
  const signInWithApple = async () => {
    setIsWorking(true)
    setError(undefined)

    try {
      const available = await AppleAuthentication.isAvailableAsync()

      if (!available) {
        setError('Apple Sign In is not available on this device.')
        return false
      }

      const nonce = await generateNonce()
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        nonce,
      )

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      })

      if (!credential.identityToken) {
        throw new Error('Unable to sign in with Apple.')
      }

      const { data, error: signInError } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce,
      })

      if (signInError) {
        throw signInError
      }

      const nextUser = data.user ?? data.session?.user ?? null
      if (!nextUser) {
        throw new Error('Missing user after sign in.')
      }

      setUser(nextUser)
      setStatus('authenticated')
      await AsyncStorage.setItem(cachedUserKey, JSON.stringify(nextUser))
      setSession(null)
      void logLogin('apple', nextUser.id)

      return { success: true, userId: nextUser.id }
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to sign in with Apple.'))
      logError(err, 'Auth: Apple sign-in failed')
      return { success: false }
    } finally {
      setIsWorking(false)
    }
  }

  // -----------------------------
  // EMAIL OTP — SEND
  // -----------------------------
  const sendEmailOtp = async (email: string) => {
    setIsWorking(true)
    setError(undefined)

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
      })

      if (otpError) {
        throw otpError
      }

      void logEvent('email_otp_requested')
      return { success: true }
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to send verification code.'))
      logError(err, 'Auth: Email OTP request failed')
      return { success: false }
    } finally {
      setIsWorking(false)
    }
  }

  // -----------------------------
  // EMAIL OTP — VERIFY
  // -----------------------------
  const verifyEmailOtp = async (email: string, token: string) => {
    setIsWorking(true)
    setError(undefined)

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      })

      if (verifyError || !data.session) {
        throw verifyError || new Error('Invalid verification code.')
      }

      const nextUser = data.user ?? data.session?.user ?? null
      if (!nextUser) {
        throw new Error('Missing user after verification.')
      }

      setUser(nextUser)
      setStatus('authenticated')
      await AsyncStorage.setItem(cachedUserKey, JSON.stringify(nextUser))
      setSession(null)
      void logLogin('email_otp', nextUser.id)

      return { success: true, userId: nextUser.id }
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to verify code.'))
      logError(err, 'Auth: Email OTP verify failed')
      return { success: false }
    } finally {
      setIsWorking(false)
    }
  }

  // -----------------------------
  // SIGN OUT
  // -----------------------------
  const signOut = async (fn: () => {}) => {
    setIsSigningOut(true)
    setIsWorking(true)
    setError(undefined)

    setUser(null)
    setSession(null)
    setStatus('idle')
    try {
      await AsyncStorage.removeItem(cachedUserKey)
      await supabase.auth.signOut()
      fn()
      void logEvent('logout')
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to sign out.'))
      logError(err, 'Auth: Sign out failed')
    } finally {
      setIsSigningOut(false)
      setIsWorking(false)
    }

  }

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        session,
        error,
        isWorking,
        isSigningOut,
        signInWithApple,
        sendEmailOtp,
        verifyEmailOtp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}

import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import { Platform } from 'react-native'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Crypto from 'expo-crypto'
import Purchases, { LOG_LEVEL } from 'react-native-purchases'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type AuthState = {
  status: 'idle' | 'loading' | 'authenticated'
  user: User | null
  session: Session | null
  error?: string
  isWorking: boolean
}

type AuthContextValue = AuthState & {
  signInWithApple: () => Promise<boolean>
  signUpWithEmail: (email: string, password: string) => Promise<{
    success: boolean
    needsEmailConfirmation?: boolean
  }>
  signInWithEmail: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const env = (globalThis as { process?: { env?: Record<string, string> } }).process
  ?.env

const fallbackRevenueCatIosKey = 'test_gzYNdApzdBtQNVUTEcWnHiBhVMz'
const fallbackRevenueCatAndroidKey = 'test_gzYNdApzdBtQNVUTEcWnHiBhVMz'

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
  const [purchasesReady, setPurchasesReady] = useState(false)

  useEffect(() => {
    let isMounted = true
    const syncSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (!isMounted) return
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setStatus(data.session ? 'authenticated' : 'idle')
    }

    syncSession()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession)
        setUser(nextSession?.user ?? null)
        setStatus(nextSession ? 'authenticated' : 'idle')
      },
    )

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

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

      const { error: signInError } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce,
      })

      if (signInError) {
        throw signInError
      }

      return true
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to sign in with Apple.'))
      return false
    } finally {
      setIsWorking(false)
    }
  }

  const signUpWithEmail = async (email: string, password: string) => {
    setIsWorking(true)
    setError(undefined)
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })
      if (signUpError) {
        throw signUpError
      }
      return {
        success: true,
        needsEmailConfirmation: !data.session,
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to sign up with email.'))
      return { success: false }
    } finally {
      setIsWorking(false)
    }
  }

  const signInWithEmail = async (email: string, password: string) => {
    setIsWorking(true)
    setError(undefined)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signInError) {
        throw signInError
      }
      return true
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to sign in with email.'))
      return false
    } finally {
      setIsWorking(false)
    }
  }

  const signOut = async () => {
    setIsWorking(true)
    setError(undefined)
    try {
      await supabase.auth.signOut()
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to sign out.'))
    } finally {
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
        signInWithApple,
        signUpWithEmail,
        signInWithEmail,
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

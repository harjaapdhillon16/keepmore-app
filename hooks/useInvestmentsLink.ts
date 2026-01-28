import { useCallback, useState } from 'react'
import { Platform } from 'react-native'
import {
  create,
  destroy,
  LinkIOSPresentationStyle,
  LinkLogLevel,
  open,
  type LinkExit,
  type LinkSuccess,
} from 'react-native-plaid-link-sdk'
import { apiUrl } from '../constants/api'
import { useAuth } from '@/contexts/AuthContext'

type PlaidLinkState = {
  linkToken: string | null
  isLoading: boolean
  error?: string
}

type OpenLinkOptions = {
  userId: string
  onSuccess?: (payload: { publicToken: string; metadata: LinkSuccess['metadata'] }) => void
  onExit?: (payload: LinkExit) => void
}

const getPlatform = () => {
  if (Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web') {
    return Platform.OS
  }
  return 'web'
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) {
    return error.message
  }
  return fallback
}

export function useInvestmentsLink() {
  const [state, setState] = useState<PlaidLinkState>({
    linkToken: null,
    isLoading: false,
  })
  const { user } = useAuth()

  const createLinkToken = useCallback(async (userId: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: undefined }))
    try {
      const response = await fetch(apiUrl('/api/plaid/investments/create-link-token'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          platform: getPlatform(),
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to create Plaid link token')
      }
      const linkToken = payload?.linkToken ?? payload?.link_token
      if (!linkToken) {
        throw new Error('Missing link token in response')
      }
      setState({ linkToken, isLoading: false })
      return linkToken
    } catch (error) {
      setState({
        linkToken: null,
        isLoading: false,
        error: getErrorMessage(error, 'Unable to create Plaid link token'),
      })
      return null
    }
  }, [])

  const exchangePublicToken = useCallback(
    async (publicToken: string, metadata: LinkSuccess['metadata']) => {
      const response = await fetch(apiUrl('/api/plaid/investments/exchange-token'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicToken,
          user: user?.id,
          institutionId: metadata.institution?.institution_id,
          institutionName: metadata.institution?.name,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to exchange Plaid token')
      }
      return payload
    },
    [user],
  )

  const openLinkFlow = useCallback(
    async ({ userId, onSuccess, onExit }: OpenLinkOptions) => {
      const linkToken = await createLinkToken(userId)
      if (!linkToken) return

      try {
        await destroy()
      } catch {
        // Ignore cleanup errors.
      }

      try {
        create({
          token: linkToken,
          logLevel: LinkLogLevel.ERROR,
        })

        open({
          onSuccess: async (success) => {
            try {
              setState((prev) => ({ ...prev, isLoading: true }))
              await exchangePublicToken(success.publicToken, success.metadata)
              onSuccess?.({ publicToken: success.publicToken, metadata: success.metadata })
            } catch (error) {
              setState((prev) => ({
                ...prev,
                error: getErrorMessage(error, 'Failed to exchange Plaid token'),
              }))
            } finally {
              setState((prev) => ({ ...prev, isLoading: false }))
            }
          },
          onExit: (exit) => {
            const errorMessage =
              exit.error?.displayMessage ??
              exit.error?.errorMessage ??
              undefined
            if (errorMessage) {
              setState((prev) => ({
                ...prev,
                error: errorMessage,
              }))
            }
            onExit?.(exit)
          },
          iOSPresentationStyle: LinkIOSPresentationStyle.MODAL,
          logLevel: LinkLogLevel.ERROR,
        })
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: getErrorMessage(error, 'Unable to open Plaid Link'),
        }))
      }
    },
    [createLinkToken, exchangePublicToken],
  )

  return {
    ...state,
    openLinkFlow,
  }
}

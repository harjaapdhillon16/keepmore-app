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

type PlaidLinkState = {
  linkToken: string | null
  isLoading: boolean
  error?: string
}

type PlaidExchangeResponse = {
  accessToken: string
  itemId: string
}

type PlaidLinkFlowPayload = PlaidExchangeResponse & {
  publicToken: string
  metadata: LinkSuccess['metadata']
}

type OpenLinkOptions = {
  userId: string
  onSuccess?: (payload: PlaidLinkFlowPayload) => void
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

export function usePlaid() {
  const [state, setState] = useState<PlaidLinkState>({
    linkToken: null,
    isLoading: false,
  })

  const createLinkToken = useCallback(async (userId: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: undefined }))
    try {
      const response = await fetch(apiUrl('/api/plaid/create-link-token'), {
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

  const exchangePublicToken = useCallback(async (publicToken: string) => {
    const response = await fetch(apiUrl('/api/plaid/exchange-token'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicToken }),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(payload?.error ?? 'Failed to exchange Plaid token')
    }
    const accessToken = payload?.accessToken ?? payload?.access_token
    const itemId = payload?.itemId ?? payload?.item_id
    if (!accessToken || !itemId) {
      throw new Error('Missing Plaid access token in response')
    }
    return { accessToken, itemId }
  }, [])

  const openLinkFlow = useCallback(
    async ({ userId, onSuccess, onExit }: OpenLinkOptions) => {
      const linkToken = await createLinkToken(userId)
      if (!linkToken) {
        return
      }

      try {
        await destroy()
      } catch {
        // Ignore cleanup errors so we can still open Link.
      }

      try {
        create({
          token: linkToken,
          logLevel: LinkLogLevel.ERROR,
        })

        open({
          onSuccess: async (success) => {
            try {
              const exchange = await exchangePublicToken(success.publicToken)
              onSuccess?.({
                publicToken: success.publicToken,
                metadata: success.metadata,
                ...exchange,
              })
            } catch (error) {
              setState((prev) => ({
                ...prev,
                error: getErrorMessage(error, 'Failed to exchange Plaid token'),
              }))
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
    createLinkToken,
    exchangePublicToken,
    openLinkFlow,
  }
}

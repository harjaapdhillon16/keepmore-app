import { useEffect, useState } from 'react'
import Purchases from 'react-native-purchases'

type SubscriptionState = {
  isPremium: boolean
  isLoading: boolean
  error?: string
}

export function useSubscription() {
  const [state, setState] = useState<SubscriptionState>({
    isPremium: false,
    isLoading: true,
  })

  useEffect(() => {
    let isMounted = true

    const checkStatus = async () => {
      try {
        // TODO: ensure Purchases.configure is called on app start.
        const customerInfo = await Purchases.getCustomerInfo()
        if (!isMounted) return
        setState({
          isPremium: customerInfo.entitlements.active.premium !== undefined,
          isLoading: false,
        })
      } catch (error) {
        if (!isMounted) return
        setState({ isPremium: false, isLoading: false, error: String(error) })
      }
    }

    checkStatus()
    Purchases.addCustomerInfoUpdateListener(checkStatus)

    return () => {
      isMounted = false
      Purchases.removeCustomerInfoUpdateListener(checkStatus)
    }
  }, [])

  return state
}

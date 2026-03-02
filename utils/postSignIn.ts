import { supabase } from '../lib/supabase'
import { isSubscriptionBypassEnabled } from './subscriptionBypass'

type PostSignInRoute = '/(auth)/plaid-connect' | '/(auth)/paywall' | '/(tabs)'

export async function getPostSignInRoute(userId: string): Promise<PostSignInRoute> {
  const [{ data: plaidItems, error: plaidError }, bypassEnabled] = await Promise.all([
    supabase
      .from('plaid_items')
      .select('id')
      .eq('user_id', userId)
      .limit(1),
    isSubscriptionBypassEnabled(userId),
  ])

  if (plaidError) {
    throw plaidError
  }

  if (!plaidItems || plaidItems.length === 0) {
    return '/(auth)/plaid-connect'
  }

  if (bypassEnabled) {
    return '/(tabs)'
  }

  const { data: subscriptions, error: subscriptionError } = await supabase
    .from('revenuecat_subscriptions')
    .select('app_user_id')
    .eq('app_user_id', userId)
    .limit(1)

  if (subscriptionError) {
    throw subscriptionError
  }

  if (!subscriptions || subscriptions.length === 0) {
    return '/(auth)/paywall'
  }

  return '/(tabs)'
}

import { supabase } from '../lib/supabase'

type PostSignInRoute = '/(auth)/plaid-connect' | '/(auth)/paywall' | '/(tabs)'

export async function getPostSignInRoute(userId: string): Promise<PostSignInRoute> {
  const [
    { data: plaidItems, error: plaidError },
    { data: subscriptions, error: subscriptionError }
  ] = await Promise.all([
    supabase
      .from('plaid_items')
      .select('id')
      .eq('user_id', userId)
      .limit(1),
    supabase
      .from('revenuecat_subscriptions')
      .select('app_user_id')
      .eq('app_user_id', userId)
      .limit(1)
  ])

  if (plaidError) {
    throw plaidError
  }

  if (subscriptionError) {
    throw subscriptionError
  }

  if (!plaidItems || plaidItems.length === 0) {
    return '/(auth)/plaid-connect'
  }

  if (!subscriptions || subscriptions.length === 0) {
    return '/(auth)/paywall'
  }

  return '/(tabs)'
}
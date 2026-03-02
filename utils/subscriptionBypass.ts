import AsyncStorage from '@react-native-async-storage/async-storage'

const getSubscriptionBypassKey = (userId: string) =>
  `keepmore:subscription-bypass:${userId}`

export async function isSubscriptionBypassEnabled(userId: string): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(getSubscriptionBypassKey(userId))
    return value === 'true'
  } catch {
    return false
  }
}

export async function setSubscriptionBypassEnabled(
  userId: string,
  enabled: boolean,
): Promise<boolean> {
  try {
    const key = getSubscriptionBypassKey(userId)
    if (enabled) {
      await AsyncStorage.setItem(key, 'true')
    } else {
      await AsyncStorage.removeItem(key)
    }
    return true
  } catch {
    return false
  }
}

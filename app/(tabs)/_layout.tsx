import { Ionicons } from '@expo/vector-icons'
import { Tabs, useRouter } from 'expo-router'
import { theme } from '../../constants/theme'

export default function TabsLayout() {
  const router = useRouter()

  return (
    <Tabs
      screenOptions={({ route }) => {
        const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
          index: 'home-outline',
          expenses: 'receipt-outline',
          investments: 'trending-up-outline',
          taxes: 'sparkles-outline',
          settings: 'settings-outline',
        }

        return {
          headerShown: false,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.mutedLight,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
            borderTopWidth: 1,
            paddingTop: 6,
          },
          tabBarLabelStyle: {
            fontFamily: theme.fonts.body.medium,
            fontSize: 11,
          },
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name={iconMap[route.name] ?? 'ellipse-outline'}
              size={size}
              color={color}
            />
          ),
        }
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="expenses" options={{ title: 'Expenses' }} />
      <Tabs.Screen name="investments" options={{ title: 'Investments' }} />
      <Tabs.Screen
        name="taxes"
        options={{ title: 'Assistant' }}
        listeners={{
          tabPress: (event) => {
            event.preventDefault()
            router.push('/assistant')
          },
        }}
      />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  )
}

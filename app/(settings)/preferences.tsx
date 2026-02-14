import { useCallback, useEffect, useState } from 'react'
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native'
import { Chip, Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Notifications from 'expo-notifications'
import * as LocalAuthentication from 'expo-local-authentication'
import { theme } from '../../constants/theme'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

type PreferencesRow = {
  user_id: string
  tax_year_start_month: number
  notifications_enabled: boolean
  face_id_enabled: boolean
}

const defaultPrefs: PreferencesRow = {
  user_id: '',
  tax_year_start_month: 1,
  notifications_enabled: true,
  face_id_enabled: false,
}

const months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export default function PreferencesScreen() {
  const { user } = useAuth()
  const [prefs, setPrefs] = useState<PreferencesRow>(defaultPrefs)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('user_id, tax_year_start_month, notifications_enabled, face_id_enabled')
          .eq('user_id', user.id)
          .maybeSingle()

        if (error) throw error
        if (data) {
          setPrefs({
            user_id: data.user_id,
            tax_year_start_month: Number(data.tax_year_start_month ?? 1),
            notifications_enabled: Boolean(data.notifications_enabled),
            face_id_enabled: Boolean(data.face_id_enabled),
          })
        } else {
          setPrefs({ ...defaultPrefs, user_id: user.id })
        }
      } catch (err) {
        Alert.alert('Unable to load preferences', err instanceof Error ? err.message : 'Try again.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [user?.id])

  const savePreferences = useCallback(
    async (next: PreferencesRow) => {
      if (!user?.id) return
      setPrefs(next)
      const payload = { ...next, user_id: user.id, updated_at: new Date().toISOString() }
      const { data: updated, error: updateError } = await supabase
        .from('user_preferences')
        .update(payload)
        .eq('user_id', user.id)
        .select('user_id')
      if (updateError) {
        throw updateError
      }
      if (!updated || updated.length === 0) {
        const { error: insertError } = await supabase
          .from('user_preferences')
          .insert(payload)
        if (insertError) {
          throw insertError
        }
      }
    },
    [user?.id],
  )

  const handleToggleNotifications = async (value: boolean) => {
    if (value) {
      const permission = await Notifications.requestPermissionsAsync()
      if (permission.status !== 'granted') {
        Alert.alert('Notifications disabled', 'Enable notifications in system settings.')
        return
      }
    }

    try {
      await savePreferences({ ...prefs, notifications_enabled: value })
    } catch (err) {
      Alert.alert('Update failed', err instanceof Error ? err.message : 'Try again.')
    }
  }

  const handleToggleFaceId = async (value: boolean) => {
    if (value) {
      const hasHardware = await LocalAuthentication.hasHardwareAsync()
      const isEnrolled = await LocalAuthentication.isEnrolledAsync()
      if (!hasHardware || !isEnrolled) {
        Alert.alert('Face ID unavailable', 'Set up Face ID in system settings first.')
        return
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Enable Face ID for KeepMore',
      })
      if (!result.success) {
        return
      }
    }

    try {
      await savePreferences({ ...prefs, face_id_enabled: value })
    } catch (err) {
      Alert.alert('Update failed', err instanceof Error ? err.message : 'Try again.')
    }
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Preferences</Text>
        <Text style={styles.subtitle}>Control how KeepMore personalizes your experience.</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tax year start</Text>
          <View style={styles.chipRow}>
            {months.map((label, index) => (
              <Chip
                key={label}
                selected={prefs.tax_year_start_month === index + 1}
                onPress={async () => {
                  try {
                    await savePreferences({ ...prefs, tax_year_start_month: index + 1 })
                  } catch (err) {
                    Alert.alert('Update failed', err instanceof Error ? err.message : 'Try again.')
                  }
                }}
                style={[
                  styles.chip,
                  prefs.tax_year_start_month === index + 1 && styles.chipSelected,
                ]}
                textStyle={[
                  styles.chipText,
                  prefs.tax_year_start_month === index + 1 && styles.chipTextSelected,
                ]}
              >
                {label}
              </Chip>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.cardTitle}>Notifications</Text>
              <Text style={styles.cardSubtitle}>Get alerts for large transactions.</Text>
            </View>
            <Switch
              value={prefs.notifications_enabled}
              onValueChange={handleToggleNotifications}
              disabled={loading}
              trackColor={{ true: theme.colors.accent, false: theme.colors.border }}
            />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.cardTitle}>Face ID</Text>
              <Text style={styles.cardSubtitle}>Require biometric access on launch.</Text>
            </View>
            <Switch
              value={prefs.face_id_enabled}
              onValueChange={handleToggleFaceId}
              disabled={loading}
              trackColor={{ true: theme.colors.accent, false: theme.colors.border }}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    padding: theme.spacing.page,
    gap: 16,
  },
  title: {
    fontFamily: theme.fonts.display.regular,
    fontSize: 22,
    color: theme.colors.ink,
  },
  subtitle: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  cardTitle: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 13,
    color: theme.colors.ink,
  },
  cardSubtitle: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  chipSelected: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accentSoft,
  },
  chipText: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 12,
    color: theme.colors.muted,
  },
  chipTextSelected: {
    color: theme.colors.accentStrong,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
})

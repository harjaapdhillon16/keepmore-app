import { useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'
import { ActivityIndicator, Button, Text, TextInput } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '../../constants/theme'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

export default function ProfileSettingsScreen() {
  const { user } = useAuth()
  const [displayName, setDisplayName] = useState(
    (user?.user_metadata?.full_name as string | undefined) ?? '',
  )
  const [email, setEmail] = useState(user?.email ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false)

  const handleSaveProfile = async () => {
    if (!user) return
    setIsSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: displayName },
      })
      if (error) throw error
      Alert.alert('Profile updated', 'Your display name has been saved.')
    } catch (err) {
      Alert.alert('Update failed', err instanceof Error ? err.message : 'Unable to save.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateEmail = async () => {
    if (!user) return
    if (!email.trim()) {
      Alert.alert('Missing email', 'Enter a valid email address.')
      return
    }
    setIsUpdatingEmail(true)
    try {
      const { error } = await supabase.auth.updateUser({ email })
      if (error) throw error
      Alert.alert(
        'Check your inbox',
        'We sent a confirmation link to update your email.',
      )
    } catch (err) {
      Alert.alert(
        'Update failed',
        err instanceof Error ? err.message : 'Unable to update email.',
      )
    } finally {
      setIsUpdatingEmail(false)
    }
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Profile info</Text>
        <Text style={styles.subtitle}>Update your name and account email.</Text>

        <View style={styles.card}>
          <TextInput
            label="Display name"
            value={displayName}
            onChangeText={setDisplayName}
            mode="outlined"
            style={styles.input}
            outlineColor={theme.colors.border}
            activeOutlineColor={theme.colors.accent}
          />
          <Button
            mode="contained"
            onPress={handleSaveProfile}
            loading={isSaving}
            buttonColor={theme.colors.primary}
            textColor="#ffffff"
          >
            Save profile
          </Button>
        </View>

        <View style={styles.card}>
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            mode="outlined"
            style={styles.input}
            outlineColor={theme.colors.border}
            activeOutlineColor={theme.colors.accent}
          />
          <Button
            mode="outlined"
            onPress={handleUpdateEmail}
            disabled={isUpdatingEmail}
            textColor={theme.colors.accentStrong}
          >
            {isUpdatingEmail ? 'Updating...' : 'Update email'}
          </Button>
          {isUpdatingEmail ? (
            <ActivityIndicator size="small" color={theme.colors.accent} />
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
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
  input: {
    backgroundColor: theme.colors.surface,
  },
})

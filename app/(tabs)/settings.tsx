import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { ActivityIndicator, Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '../../constants/theme'
import { useAuth } from '../../contexts/AuthContext'

type IconName = keyof typeof Ionicons.glyphMap

type SettingsItem = {
  label: string
  icon: IconName
  tone?: 'danger'
}

const sections: { title: string; items: SettingsItem[] }[] = [
  {
    title: 'Account',
    items: [
      { label: 'Profile info', icon: 'person-outline' },
      { label: 'Connected accounts', icon: 'link-outline' },
      { label: 'Reconnect banks', icon: 'refresh-outline' },
    ],
  },
  {
    title: 'Subscription',
    items: [
      { label: 'Current plan', icon: 'card-outline' },
      { label: 'Billing date', icon: 'calendar-outline' },
      { label: 'Manage subscription', icon: 'settings-outline' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { label: 'Currency', icon: 'cash-outline' },
      { label: 'Tax year', icon: 'calculator-outline' },
      { label: 'Notifications', icon: 'notifications-outline' },
      { label: 'Face ID', icon: 'scan-outline' },
    ],
  },
  {
    title: 'Data and privacy',
    items: [
      { label: 'Export data', icon: 'download-outline' },
      { label: 'Delete account', icon: 'trash-outline', tone: 'danger' },
      { label: 'Privacy policy', icon: 'lock-closed-outline' },
      { label: 'Terms', icon: 'document-text-outline' },
    ],
  },
  {
    title: 'Support',
    items: [
      { label: 'Help center', icon: 'help-circle-outline' },
      { label: 'Contact support', icon: 'mail-outline' },
      { label: 'Feature requests', icon: 'bulb-outline' },
    ],
  },
]

export default function SettingsScreen() {
  const router = useRouter()
  const { signOut, isWorking, isSigningOut,user } = useAuth()

  const handleSignOut = async () => {
    const fn = ()=>{
      router.replace("/(auth)")
    }
    await signOut(fn)

  }

  const confirmSignOut = () => {
    if (isWorking || isSigningOut) return
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: handleSignOut },
    ])
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Manage your account, plan, and privacy.</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Ionicons name="person-outline" size={22} color={theme.colors.ink} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>Demo User</Text>
              <Text style={styles.profileMeta}>harjaap@primedepthlabs.com</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={theme.colors.mutedLight}
            />
          </View>
        </View>

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, index) => {
                const isDanger = item.tone === 'danger'
                return (
                  <View
                    key={item.label}
                    style={[styles.row, index > 0 && styles.rowDivider]}
                  >
                    <View style={styles.rowLeft}>
                      <View style={[styles.iconBadge, isDanger && styles.iconBadgeDanger]}>
                        <Ionicons
                          name={item.icon}
                          size={18}
                          color={isDanger ? theme.colors.danger : theme.colors.accentStrong}
                        />
                      </View>
                      <Text style={[styles.rowLabel, isDanger && styles.rowLabelDanger]}>
                        {item.label}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={theme.colors.mutedLight}
                    />
                  </View>
                )
              })}
            </View>
          </View>
        ))}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account actions</Text>
          <View style={styles.sectionCard}>
            <Pressable
              onPress={confirmSignOut}
              disabled={isWorking || isSigningOut}
              style={({ pressed }) => [
                styles.logoutRow,
                pressed && styles.logoutRowPressed,
              ]}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.iconBadge, styles.iconBadgeDanger]}>
                  <Ionicons name="log-out-outline" size={18} color={theme.colors.danger} />
                </View>
                <Text style={[styles.rowLabel, styles.rowLabelDanger]}>Sign out</Text>
              </View>
              {isWorking || isSigningOut ? (
                <ActivityIndicator size="small" color={theme.colors.danger} />
              ) : (
                <Ionicons name="chevron-forward" size={18} color={theme.colors.mutedLight} />
              )}
            </Pressable>
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
    flex: 1,
  },
  content: {
    padding: theme.spacing.page,
    gap: 18,
    paddingBottom: 32,
  },
  header: {
    gap: 4,
  },
  title: {
    fontFamily: theme.fonts.display.regular,
    fontSize: 24,
    color: theme.colors.ink,
  },
  subtitle: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 14,
    color: theme.colors.muted,
  },
  profileCard: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: theme.radii.cardLarge,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    height: 44,
    width: 44,
    borderRadius: 16,
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 15,
    color: theme.colors.ink,
  },
  profileMeta: {
    marginTop: 2,
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.mutedLight,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: theme.colors.mutedLight,
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    height: 32,
    width: 32,
    borderRadius: 12,
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeDanger: {
    backgroundColor: theme.colors.dangerSoft,
  },
  rowLabel: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 14,
    color: theme.colors.ink,
  },
  rowLabelDanger: {
    color: theme.colors.danger,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  logoutRowPressed: {
    backgroundColor: theme.colors.surfaceAlt,
  },
})

import { useCallback, useEffect, useState } from 'react'
import { Alert, ScrollView, StyleSheet, View } from 'react-native'
import { ActivityIndicator, Button, Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '../../constants/theme'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { usePlaid } from '../../hooks/usePlaid'
import { apiUrl } from '../../constants/api'

type PlaidItem = {
  id: string
  institution_name?: string | null
  last_synced_at?: string | null
}

export default function ConnectedAccountsScreen() {
  const { user } = useAuth()
  const { openLinkFlow, isLoading, error: linkError } = usePlaid()
  const [items, setItems] = useState<PlaidItem[]>([])
  const [loading, setLoading] = useState(false)

  const loadAccounts = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const itemsResult = await supabase
        .from('plaid_items')
        .select('id, institution_name, last_synced_at, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (itemsResult.error) throw itemsResult.error

      setItems(itemsResult.data ?? [])
    } catch (err) {
      Alert.alert('Unable to load accounts', err instanceof Error ? err.message : 'Try again.')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    void loadAccounts()
  }, [loadAccounts])

  const handleReconnect = () => {
    if (!user?.id) return
    void openLinkFlow({ userId: user.id })
  }

  const handleDisconnect = (itemId: string) => {
    if (!user?.id) return
    Alert.alert('Disconnect account', 'Remove this institution from KeepMore?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await fetch(apiUrl('/api/plaid/remove-item'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user.id, plaidItemId: itemId }),
            })
            const payload = await response.json().catch(() => null)
            if (!response.ok) {
              throw new Error(payload?.error ?? 'Unable to disconnect item.')
            }
            await loadAccounts()
          } catch (err) {
            Alert.alert(
              'Disconnect failed',
              err instanceof Error ? err.message : 'Try again.',
            )
          }
        },
      },
    ])
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Connected accounts</Text>
          <Text style={styles.subtitle}>Manage your linked institutions.</Text>
        </View>

        <View style={styles.actionsRow}>
          <Button
            mode="contained"
            onPress={handleReconnect}
            loading={isLoading}
            buttonColor={theme.colors.primary}
            textColor="#ffffff"
          >
            Reconnect banks
          </Button>
        </View>

        {linkError ? <Text style={styles.errorText}>{linkError}</Text> : null}

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={theme.colors.accent} />
            <Text style={styles.loadingText}>Loading institutions...</Text>
          </View>
        ) : null}

        {items.length === 0 && !loading ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No connected accounts</Text>
            <Text style={styles.emptySubtitle}>Connect a bank to manage institutions.</Text>
          </View>
        ) : (
          items.map((item) => {
            return (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View>
                    <Text style={styles.itemTitle}>
                      {item.institution_name ?? 'Linked institution'}
                    </Text>
                    <Text style={styles.itemMeta}>
                      {item.last_synced_at
                        ? `Last synced ${new Date(item.last_synced_at).toLocaleDateString()}`
                        : 'Sync pending'}
                    </Text>
                  </View>
                  <Button
                    mode="text"
                    onPress={() => handleDisconnect(item.id)}
                    textColor={theme.colors.danger}
                  >
                    Disconnect
                  </Button>
                </View>
              </View>
            )
          })
        )}
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
  header: {
    gap: 6,
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
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  errorText: {
    fontFamily: theme.fonts.body.medium,
    color: theme.colors.danger,
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  emptyTitle: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 15,
    color: theme.colors.ink,
  },
  emptySubtitle: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  itemCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitle: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 15,
    color: theme.colors.ink,
  },
  itemMeta: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 4,
  },
})

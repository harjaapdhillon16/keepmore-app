import { useState } from 'react'
import { Alert, Linking, Share, StyleSheet, View } from 'react-native'
import { ActivityIndicator, Button, Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '../../constants/theme'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { apiUrl } from '../../constants/api'

export default function PrivacySettingsScreen() {
  const { user, signOut } = useAuth()
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleExport = async () => {
    if (!user?.id) return
    setExporting(true)
    try {
      const [transactions, accounts, budgets, goals] = await Promise.all([
        supabase
          .from('plaid_transactions')
          .select('date, name, merchant_name, amount, category')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(1000),
        supabase
          .from('plaid_accounts')
          .select('name, official_name, type, subtype, mask, balances')
          .eq('user_id', user.id),
        supabase
          .from('user_budgets')
          .select('month_start, amount')
          .eq('user_id', user.id),
        supabase
          .from('financial_goals')
          .select('title, target_amount, current_amount, status')
          .eq('user_id', user.id),
      ])

      if (transactions.error) throw transactions.error
      if (accounts.error) throw accounts.error
      if (budgets.error) throw budgets.error
      if (goals.error) throw goals.error

      const csv = [
        '=== Transactions ===',
        'date,merchant,amount,category',
        ...(transactions.data ?? []).map((tx: any) => {
          const merchant = tx.merchant_name || tx.name || ''
          const category = Array.isArray(tx.category) ? tx.category[0] : tx.category ?? ''
          return `${tx.date},${merchant},${tx.amount},${category}`
        }),
        '',
        '=== Accounts ===',
        'name,type,subtype,mask,balance',
        ...(accounts.data ?? []).map((acc: any) => {
          const balances = typeof acc.balances === 'string' ? JSON.parse(acc.balances) : acc.balances
          const balance = balances?.current ?? balances?.available ?? ''
          return `${acc.official_name || acc.name},${acc.type ?? ''},${acc.subtype ?? ''},${acc.mask ?? ''},${balance ?? ''}`
        }),
        '',
        '=== Budgets ===',
        'month_start,amount',
        ...(budgets.data ?? []).map((budget: any) => `${budget.month_start},${budget.amount}`),
        '',
        '=== Goals ===',
        'title,target_amount,current_amount,status',
        ...(goals.data ?? []).map((goal: any) =>
          `${goal.title},${goal.target_amount},${goal.current_amount},${goal.status}`,
        ),
      ].join('\n')

      await Share.share({ message: csv })
    } catch (err) {
      Alert.alert('Export failed', err instanceof Error ? err.message : 'Try again.')
    } finally {
      setExporting(false)
    }
  }

  const handleDelete = () => {
    if (!user?.id) return
    Alert.alert(
      'Delete account',
      'This will permanently remove your data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true)
            try {
              const response = await fetch(apiUrl('/api/account/delete'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id }),
              })
              const payload = await response.json().catch(() => null)
              if (!response.ok) {
                throw new Error(payload?.error ?? 'Unable to delete account.')
              }
              await signOut(() => undefined)
            } catch (err) {
              Alert.alert('Delete failed', err instanceof Error ? err.message : 'Try again.')
            } finally {
              setDeleting(false)
            }
          },
        },
      ],
    )
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Data and privacy</Text>
        <Text style={styles.subtitle}>Control your data access and account.</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Export data</Text>
          <Text style={styles.cardSubtitle}>Download a CSV snapshot of your data.</Text>
          <Button mode="outlined" onPress={handleExport} disabled={exporting}>
            {exporting ? 'Preparing...' : 'Export data'}
          </Button>
          {exporting ? <ActivityIndicator size="small" color={theme.colors.accent} /> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Legal</Text>
          <Button mode="text" onPress={() => Linking.openURL('https://keepmore.finance/privacy')}>
            Privacy policy
          </Button>
          <Button mode="text" onPress={() => Linking.openURL('https://keepmore.finance/terms')}>
            Terms of service
          </Button>
        </View>

        <View style={styles.card}>
          <Text style={[styles.cardTitle, styles.dangerTitle]}>Delete account</Text>
          <Text style={styles.cardSubtitle}>Permanently remove your KeepMore data.</Text>
          <Button
            mode="contained"
            onPress={handleDelete}
            loading={deleting}
            buttonColor={theme.colors.danger}
            textColor="#ffffff"
          >
            Delete account
          </Button>
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
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  cardTitle: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 14,
    color: theme.colors.ink,
  },
  cardSubtitle: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  dangerTitle: {
    color: theme.colors.danger,
  },
})

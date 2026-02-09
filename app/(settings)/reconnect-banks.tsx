import { StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '../../constants/theme'
import { useAuth } from '../../contexts/AuthContext'
import { usePlaid } from '../../hooks/usePlaid'

export default function ReconnectBanksScreen() {
  const { user } = useAuth()
  const { openLinkFlow, isLoading, error } = usePlaid()

  const handleReconnect = () => {
    if (!user?.id) return
    void openLinkFlow({ userId: user.id })
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Reconnect banks</Text>
        <Text style={styles.subtitle}>
          Refresh your linked accounts to pull the latest balances and transactions.
        </Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Button
          mode="contained"
          onPress={handleReconnect}
          loading={isLoading}
          buttonColor={theme.colors.primary}
          textColor="#ffffff"
        >
          Open Plaid Link
        </Button>
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
    gap: 12,
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
  errorText: {
    fontFamily: theme.fonts.body.medium,
    color: theme.colors.danger,
  },
})

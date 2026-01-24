import { LinearGradient } from 'expo-linear-gradient'
import { StyleSheet, Text, View } from 'react-native'
import { theme } from '../../constants/theme'

type NetWorthCardProps = {
  amount: string
  changeLabel: string
}

export default function NetWorthCard({ amount, changeLabel }: NetWorthCardProps) {
  return (
    <LinearGradient colors={['#22c55e', '#15803d']} style={styles.card}>
      <Text style={styles.label}>Net worth</Text>
      <Text style={styles.amount}>{amount}</Text>
      <View style={styles.changeRow}>
        <Text style={styles.change}>{changeLabel}</Text>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 20,
    gap: 8,
    ...theme.shadows.card,
  },
  label: {
    color: theme.colors.accentSoft,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    fontSize: 12,
  },
  amount: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '700',
  },
  changeRow: {
    flexDirection: 'row',
  },
  change: {
    color: '#f0fdf4',
    fontWeight: '600',
  },
})

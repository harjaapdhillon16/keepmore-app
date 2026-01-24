import { StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'
import { theme } from '../../constants/theme'

type NetWorthCardProps = {
  amount: string
  changeLabel: string
}

export default function NetWorthCard({ amount, changeLabel }: NetWorthCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Net worth</Text>
        <View style={styles.changeBadge}>
          <Text style={styles.changeText}>{changeLabel}</Text>
        </View>
      </View>
      <Text style={styles.amount}>{amount}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.cardLarge,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: theme.colors.mutedLight,
  },
  amount: {
    fontFamily: theme.fonts.display.regular,
    fontSize: 32,
    color: theme.colors.ink,
  },
  changeBadge: {
    borderRadius: 999,
    backgroundColor: theme.colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  changeText: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 12,
    color: theme.colors.accentStrong,
  },
})

import { ScrollView, StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '../../constants/theme'

const accounts = [
  { name: 'RRSP', value: '$12,500', change: '+$890' },
  { name: 'TFSA', value: '$8,750', change: '+$670' },
  { name: 'Taxable', value: '$3,500', change: '+$332' },
]

const holdings = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    shares: '150 shares',
    price: '$178.32',
    value: '$26,748',
    change: '+$2,145 (8.7%)',
  },
  {
    symbol: 'VTI',
    name: 'Vanguard Total Stock',
    shares: '50 shares',
    price: '$242.10',
    value: '$12,105',
    change: '+$892 (7.9%)',
  },
]

export default function InvestmentsScreen() {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total investments</Text>
          <Text style={styles.summaryValue}>$24,750</Text>
          <Text style={styles.summaryChange}>+$1,892 (8.3%) YTD</Text>
        </View>

        <Text style={styles.sectionTitle}>Account breakdown</Text>
        <View style={styles.grid}>
          {accounts.map((account) => (
            <View key={account.name} style={styles.accountCard}>
              <Text style={styles.accountName}>{account.name}</Text>
              <Text style={styles.accountValue}>{account.value}</Text>
              <Text style={styles.accountChange}>{account.change}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Holdings</Text>
        {holdings.map((holding) => (
          <View key={holding.symbol} style={styles.holdingCard}>
            <View style={styles.holdingHeader}>
              <Text style={styles.holdingSymbol}>{holding.symbol}</Text>
              <Text style={styles.holdingValue}>{holding.value}</Text>
            </View>
            <Text style={styles.holdingName}>{holding.name}</Text>
            <Text style={styles.holdingMeta}>
              {holding.shares} at {holding.price}
            </Text>
            <Text style={styles.holdingChange}>{holding.change}</Text>
          </View>
        ))}
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
    gap: 16,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    borderRadius: theme.radii.cardLarge,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  summaryLabel: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: theme.colors.mutedLight,
  },
  summaryValue: {
    color: theme.colors.ink,
    fontSize: 28,
    fontFamily: theme.fonts.display.regular,
  },
  summaryChange: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 13,
    color: theme.colors.accent,
  },
  sectionTitle: {
    fontFamily: theme.fonts.display.regular,
    fontSize: 20,
    color: theme.colors.ink,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  accountCard: {
    flexGrow: 1,
    minWidth: 140,
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: theme.radii.card,
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  accountName: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 12,
    color: theme.colors.mutedLight,
  },
  accountValue: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 15,
    color: theme.colors.ink,
  },
  accountChange: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 12,
    color: theme.colors.accent,
  },
  holdingCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.card,
    borderRadius: theme.radii.card,
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  holdingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  holdingSymbol: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 14,
    color: theme.colors.ink,
  },
  holdingValue: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 14,
    color: theme.colors.ink,
  },
  holdingName: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  holdingMeta: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.mutedLight,
  },
  holdingChange: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 12,
    color: theme.colors.accent,
  },
})

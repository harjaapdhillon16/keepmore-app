import { ScrollView, StyleSheet, View } from 'react-native'
import { Chip, Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '../../constants/theme'

const groups = [
  {
    label: 'Today',
    items: [
      { name: 'Starbucks', amount: '-$6.75', category: 'Dining' },
      { name: 'Uber', amount: '-$18.50', category: 'Transport' },
      { name: 'Amazon', amount: '-$42.99', category: 'Shopping' },
    ],
  },
  {
    label: 'Yesterday',
    items: [
      { name: 'Rent Payment', amount: '-$2,100', category: 'Housing' },
      { name: 'Spotify', amount: '-$10.99', category: 'Entertainment' },
    ],
  },
]

export default function ExpensesScreen() {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Expenses</Text>
        <View style={styles.filters}>
          <Chip selected>All</Chip>
          <Chip>This month</Chip>
          <Chip>Last month</Chip>
          <Chip>Custom</Chip>
        </View>

        {groups.map((group) => (
          <View key={group.label} style={styles.group}>
            <Text style={styles.groupLabel}>{group.label}</Text>
            {group.items.map((item) => (
              <View key={`${group.label}-${item.name}`} style={styles.row}>
                <View>
                  <Text style={styles.merchant}>{item.name}</Text>
                  <Text style={styles.category}>{item.category}</Text>
                </View>
                <Text style={styles.amount}>{item.amount}</Text>
              </View>
            ))}
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
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  group: {
    gap: 12,
  },
  groupLabel: {
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: theme.colors.mutedLight,
  },
  row: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.card,
    borderRadius: theme.radii.card,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...theme.shadows.card,
  },
  merchant: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.ink,
  },
  category: {
    color: theme.colors.mutedLight,
    marginTop: 4,
  },
  amount: {
    fontWeight: '700',
    color: theme.colors.danger,
  },
})

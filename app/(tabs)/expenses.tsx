import { ScrollView, StyleSheet, View } from 'react-native'
import { Chip, Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '../../constants/theme'

const filters = ['All', 'This month', 'Last month', 'Custom']

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
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Expenses</Text>
        <View style={styles.filters}>
          {filters.map((label) => {
            const isSelected = label === 'All'
            return (
              <Chip
                key={label}
                selected={isSelected}
                style={[styles.chip, isSelected && styles.chipSelected]}
                textStyle={[styles.chipText, isSelected && styles.chipTextSelected]}
              >
                {label}
              </Chip>
            )
          })}
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
    fontFamily: theme.fonts.display.regular,
    fontSize: 24,
    color: theme.colors.ink,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: theme.colors.surface,
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
  group: {
    gap: 12,
  },
  groupLabel: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: theme.colors.mutedLight,
  },
  row: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.card,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...theme.shadows.card,
  },
  merchant: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 15,
    color: theme.colors.ink,
  },
  category: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.mutedLight,
    marginTop: 4,
  },
  amount: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 14,
    color: theme.colors.danger,
  },
})

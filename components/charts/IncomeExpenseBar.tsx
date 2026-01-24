import { StyleSheet, View } from 'react-native'
import { BarChart } from 'react-native-gifted-charts'
import { theme } from '../../constants/theme'

type BarPoint = {
  x: string
  y: number
  group: 'Income' | 'Expenses'
}

type IncomeExpenseBarProps = {
  data: BarPoint[]
}

export default function IncomeExpenseBar({ data }: IncomeExpenseBarProps) {
  // Group data by x value
  const groupedData = data.reduce((acc, item) => {
    if (!acc[item.x]) {
      acc[item.x] = { label: item.x, income: 0, expenses: 0 }
    }
    if (item.group === 'Income') {
      acc[item.x].income = item.y
    } else {
      acc[item.x].expenses = item.y
    }
    return acc
  }, {} as Record<string, { label: string; income: number; expenses: number }>)

  // Transform to gifted-charts format for grouped bars
  const chartData = Object.values(groupedData).map(item => ({
    value: item.income,
    label: item.label,
    frontColor: theme.colors.accent,
    spacing: 4,
    labelWidth: 40,
    labelTextStyle: {
      color: theme.colors.mutedLight,
      fontSize: 10,
      fontFamily: theme.fonts.body.regular,
    },
  }))

  const expensesData = Object.values(groupedData).map(item => ({
    value: item.expenses,
    frontColor: theme.colors.danger,
  }))

  // For grouped bars, you need to pass both datasets
  return (
    <View style={styles.container}>
      <BarChart
        data={chartData}
        data2={expensesData}
        barWidth={12}
        spacing={24}
        roundedTop
        roundedBottom={false}
        hideRules
        xAxisThickness={1}
        yAxisThickness={1}
        xAxisColor={theme.colors.border}
        yAxisColor={theme.colors.border}
        yAxisTextStyle={{
          color: theme.colors.mutedLight,
          fontSize: 10,
          fontFamily: theme.fonts.body.regular,
        }}
        noOfSections={4}
        maxValue={Math.max(...data.map(d => d.y)) * 1.2}
        rulesColor={theme.colors.border}
        rulesType="dashed"
        height={250}
        showGradient={false}
        isAnimated
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
})

import { StyleSheet, View, Text } from 'react-native'
import { PieChart } from 'react-native-gifted-charts'
import { theme } from '../../constants/theme'

type Slice = {
  x: string
  y: number
  color: string
}

type SpendingPieProps = {
  data: Slice[]
}

export default function SpendingPie({ data }: SpendingPieProps) {
  const total = data.reduce((sum, d) => sum + d.y, 0)

  const chartData = data.map(item => ({
    value: item.y,
    color: item.color,
  }))

  return (
    <View style={styles.container}>
      <PieChart
        data={chartData}
        donut
        radius={115}
        innerRadius={85}
        strokeWidth={0}
        focusOnPress
        toggleFocusOnPress
        centerLabelComponent={() => (
          <View style={styles.center}>
            <Text style={styles.total}>₹{total.toLocaleString()}</Text>
            <Text style={styles.sub}>Total spending</Text>
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    paddingVertical: 24,
    alignItems: 'center',
  },
  center: {
    alignItems: 'center',
  },
  total: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
  },
  sub: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.mutedLight,
  },
})

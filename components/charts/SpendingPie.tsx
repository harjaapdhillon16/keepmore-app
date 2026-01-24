import { StyleSheet, View } from 'react-native'
import { PieChart } from 'react-native-gifted-charts'
import { Text } from 'react-native-paper'
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
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  center: {
    alignItems: 'center',
  },
  total: {
    fontSize: 20,
    fontFamily: theme.fonts.display.regular,
    color: theme.colors.ink,
  },
  sub: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: theme.fonts.body.regular,
    color: theme.colors.mutedLight,
  },
})

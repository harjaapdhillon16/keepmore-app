import { StyleSheet, View, Text } from 'react-native'
import { LineChart } from 'react-native-gifted-charts'
import { theme } from '../../constants/theme'

type Point = {
  x: string
  y: number
}

type NetWorthLineProps = {
  data: Point[]
}

export default function NetWorthLine({ data }: NetWorthLineProps) {
  const chartData = data.map(item => ({
    value: item.y,
    label: item.x,
  }))

  return (
    <View style={styles.container}>
      <LineChart
        data={chartData}
        curved
        areaChart
        thickness={2.5}
        color={theme.colors.accent}

        startFillColor={theme.colors.accent}
        startOpacity={0.18}
        endOpacity={0.02}

        spacing={70}
        initialSpacing={30}
        height={260}

        hideRules={false}
        rulesType="solid"
        rulesColor={theme.colors.border}

        yAxisTextStyle={styles.axis}
        xAxisLabelTextStyle={styles.axis}

        dataPointsRadius={0}
        hideDataPoints

        pointerConfig={{
          activatePointersOnLongPress: true,
          pointerStripColor: theme.colors.border,
          pointerColor: theme.colors.accent,
          radius: 4,
          pointerLabelComponent: items => (
            <View style={styles.tooltip}>
              <Text style={styles.tooltipText}>
                ₹{items[0].value.toLocaleString()}
              </Text>
            </View>
          ),
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  axis: {
    color: theme.colors.mutedLight,
    fontSize: 10,
  },
  tooltip: {
    backgroundColor: theme.colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  tooltipText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '500',
  },
})

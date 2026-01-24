import { StyleSheet, View } from 'react-native'
import InsightCard from '../cards/InsightCard'

type Insight = {
  title: string
  description: string
  cta: string
}

type InsightsListProps = {
  items: Insight[]
}

export default function InsightsList({ items }: InsightsListProps) {
  return (
    <View style={styles.list}>
      {items.map((item) => (
        <InsightCard
          key={item.title}
          title={item.title}
          description={item.description}
          cta={item.cta}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
})

import { StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { theme } from '../../constants/theme'

type InsightCardProps = {
  title: string
  description: string
  cta: string
  onPress?: () => void
}

export default function InsightCard({
  title,
  description,
  cta,
  onPress,
}: InsightCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <Button mode="text" compact onPress={onPress} labelStyle={styles.ctaLabel}>
        {cta}
      </Button>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.card,
    borderRadius: theme.radii.card,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  title: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 15,
    color: theme.colors.ink,
  },
  description: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  ctaLabel: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 13,
    color: theme.colors.accent,
  },
})

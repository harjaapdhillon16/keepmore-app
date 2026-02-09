import { Linking, StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '../../constants/theme'

export default function SupportScreen() {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Support</Text>
        <Text style={styles.subtitle}>We are here to help.</Text>

        <View style={styles.card}>
          <Button
            mode="text"
            onPress={() => Linking.openURL('https://keepmore.finance')}
          >
            Help center
          </Button>
          <Button
            mode="text"
            onPress={() =>
              Linking.openURL('mailto:support@keepmore.finance?subject=KeepMore Support')
            }
          >
            Contact support
          </Button>
          <Button
            mode="text"
            onPress={() =>
              Linking.openURL('mailto:product@keepmore.finance?subject=Feature Request')
            }
          >
            Feature requests
          </Button>
        </View>
      </View>
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
    padding: theme.spacing.page,
    gap: 16,
  },
  title: {
    fontFamily: theme.fonts.display.regular,
    fontSize: 22,
    color: theme.colors.ink,
  },
  subtitle: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
})

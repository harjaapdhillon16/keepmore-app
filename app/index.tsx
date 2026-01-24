import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { ScrollView, StatusBar, StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '../constants/theme'

export default function AppIndexScreen() {
  const router = useRouter()

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoRow}>
          <Text style={styles.logoText}>KeepMore</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.headline}>
            Talk to your money.{"\n"}
            <Text style={styles.headlineAccent}>Understand everything.</Text>
          </Text>
          <Text style={styles.subtitle}>
            The only app where AI understands both your spending and investments.
            Make informed decisions with clarity and confidence.
          </Text>
        </View>

        <Button
          mode="contained"
          buttonColor={theme.colors.primary}
          textColor="#ffffff"
          style={styles.primaryButton}
          contentStyle={styles.buttonContent}
          labelStyle={styles.primaryLabel}
          onPress={() => router.push('/(auth)/login')}
        >
          Get Started Free
        </Button>

        <View style={styles.statsRow}>
          {[
            { value: '12,000+', label: 'Institutions supported' },
            { value: 'Bank-level', label: 'Security encryption' },
            { value: '24/7', label: 'AI assistance' },
          ].map((stat) => (
            <View key={stat.label} style={styles.statItem}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
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
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 28,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    height: 40,
    width: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: theme.fonts.display.regular,
    fontSize: 24,
    color: theme.colors.ink,
  },
  hero: {
    gap: 12,
  },
  headline: {
    fontFamily: theme.fonts.display.regular,
    fontSize: 36,
    lineHeight: 42,
    color: theme.colors.ink,
  },
  headlineAccent: {
    color: theme.colors.accent,
  },
  subtitle: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.muted,
  },
  primaryButton: {
    borderRadius: theme.radii.button,
  },
  buttonContent: {
    paddingVertical: 10,
  },
  primaryLabel: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 15,
  },
  statsRow: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    minWidth: 120,
    flexGrow: 1,
    gap: 4,
  },
  statValue: {
    fontFamily: theme.fonts.display.regular,
    fontSize: 22,
    color: theme.colors.ink,
  },
  statLabel: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
})

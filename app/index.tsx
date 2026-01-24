import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { StatusBar, StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '../constants/theme'

export default function AppIndexScreen() {
  const router = useRouter()

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.container}>
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoSection}>
            <Text style={styles.appName}>Keepmore</Text>
          </View>

          {/* Hero Text */}
          <View style={styles.heroSection}>
            <Text style={styles.headline}>
              Your Financial Copilot
            </Text>
            <Text style={styles.tagline}>
              Talk to your money. Understand your spending. Grow your wealth.
            </Text>
          </View>

          {/* Preview */}
          <LinearGradient
            colors={[theme.colors.accent, '#0d9488']}
            style={styles.previewCard}
          >
            <View style={styles.chatBubble}>
              <Text style={styles.chatText}>
                "Can I afford a $3,000 vacation?"
              </Text>
            </View>
            <View style={styles.responseBubble}>
              <Text style={styles.responseText}>
                💡 Yes! Based on your savings rate, you'll have enough by June. 
                Want me to create a savings plan?
              </Text>
            </View>
          </LinearGradient>

          {/* CTA Buttons */}
          <View style={styles.ctaSection}>
            <Button
              mode="contained"
              onPress={() => router.push('/(auth)/login')}
              labelStyle={styles.primaryButtonLabel}
              contentStyle={styles.buttonContent}
            >
              Get Started Free
            </Button>
          </View>
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
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: 'space-between',
  },
  logoSection: {
    alignItems: 'center',
    gap: 12,
  },
  logoMark: {
    height: 68,
    width: 68,
    borderRadius: 22,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  logoEmoji: {
    fontSize: 36,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.ink,
    letterSpacing: 0.5,
  },
  heroSection: {
    alignItems: 'center',
    gap: 16,
    marginTop: -20,
  },
  headline: {
    fontSize: 42,
    fontWeight: '800',
    color: theme.colors.ink,
    textAlign: 'center',
    lineHeight: 48,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 17,
    color: theme.colors.primary,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '600',
    paddingHorizontal: 20,
  },
  previewCard: {
    borderRadius: 24,
    padding: 20,
    gap: 12,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    marginTop: -10,
  },
  chatBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignSelf: 'flex-end',
    maxWidth: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  chatText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  responseBubble: {
    backgroundColor: 'white',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignSelf: 'flex-start',
    maxWidth: '90%',
  },
  responseText: {
    color: theme.colors.ink,
    fontSize: 14,
    lineHeight: 20,
  },
  ctaSection: {
    gap: 14,
    marginTop: -10,
  },
  primaryButton: {
    borderRadius: 16,
    backgroundColor: theme.colors.ink,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  primaryButtonLabel: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  secondaryButton: {
    borderRadius: 16,
    borderColor: theme.colors.border,
    borderWidth: 1.5,
  },
  secondaryButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  trialNote: {
    textAlign: 'center',
    color: theme.colors.mutedLight,
    fontSize: 13,
    marginTop: 4,
  },
})
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '../../constants/theme'

const steps = [
  { label: 'Connected to Chase', doneAt: 20 },
  { label: 'Retrieved 247 transactions', doneAt: 45 },
  { label: 'Categorizing spending', doneAt: 70 },
  { label: 'Running AI analysis', doneAt: 90 },
]

export default function SyncingScreen() {
  const router = useRouter()
  const [progress, setProgress] = useState(12)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(prev + 7, 100)
        if (next === 100) {
          clearInterval(interval)
          setTimeout(() => router.replace('/(auth)/wow'), 600)
        }
        return next
      })
    }, 650)

    return () => clearInterval(interval)
  }, [router])

  const progressLabel = useMemo(() => `${progress}%`, [progress])

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.loaderRing}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
        <Text style={styles.title}>Analyzing your finances...</Text>
        <Text style={styles.subtitle}>Just a few more seconds.</Text>

        <View style={styles.card}>
          {steps.map((step, index) => {
            const prevThreshold = index === 0 ? 0 : steps[index - 1].doneAt
            const isDone = progress >= step.doneAt
            const isActive = !isDone && progress >= prevThreshold
            return (
              <View key={step.label} style={styles.stepRow}>
                {isDone ? (
                  <Ionicons name="checkmark-circle" size={18} color={theme.colors.accent} />
                ) : (
                  <Ionicons
                    name={isActive ? 'time' : 'ellipse-outline'}
                    size={18}
                    color={isActive ? theme.colors.accent : theme.colors.mutedLight}
                  />
                )}
                <Text style={styles.stepText}>{step.label}</Text>
              </View>
            )
          })}

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{progressLabel}</Text>
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
    justifyContent: 'center',
    gap: 16,
    backgroundColor: theme.colors.background,
  },
  loaderRing: {
    alignSelf: 'center',
    height: 72,
    width: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  title: {
    fontFamily: theme.fonts.display.regular,
    fontSize: 26,
    textAlign: 'center',
    color: theme.colors.ink,
  },
  subtitle: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 14,
    textAlign: 'center',
    color: theme.colors.muted,
  },
  card: {
    marginTop: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceAlt,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
  },
  progressLabel: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 12,
    color: theme.colors.mutedLight,
    textAlign: 'right',
  },
})

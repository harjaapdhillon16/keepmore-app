import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system/legacy'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Linking, ScrollView, StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { chatApiUrl } from '../../constants/api'
import { theme } from '../../constants/theme'
import { useAuth } from '../../contexts/AuthContext'
import { useCurrency } from '../../contexts/CurrencyContext'

const monthOptions = [6, 12] as const

const MAX_FILE_BYTES = 15 * 1024 * 1024

export default function BankStatementUploadScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { refresh: refreshCurrency } = useCurrency()
  const [months, setMonths] = useState<(typeof monthOptions)[number]>(6)
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const formattedFileSize = useMemo(() => {
    if (!file?.size) return null
    const sizeMb = file.size / (1024 * 1024)
    return `${sizeMb.toFixed(2)} MB`
  }, [file?.size])

  const handlePickFile = async () => {
    setError(null)
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'text/csv', 'text/plain', 'application/vnd.ms-excel'],
      copyToCacheDirectory: true,
      multiple: false,
    })

    if (result.canceled) return
    const asset = result.assets?.[0]
    if (!asset) return
    if (asset.size && asset.size > MAX_FILE_BYTES) {
      setError('File is too large. Please upload a smaller statement.')
      return
    }

    setFile(asset)
  }

  const handleUpload = async () => {
    if (!user?.id) {
      setError('Please sign in again to continue.')
      return
    }
    if (!file?.uri) {
      setError('Choose a statement file first.')
      return
    }

    setError(null)
    setIsUploading(true)

    try {
      const fileBase64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      })
      if (!fileBase64) {
        throw new Error('Unable to read file data. Please try again.')
      }

      const response = await fetch(chatApiUrl('/api/bank-statements/upload'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          statementMonths: months,
          fileName: file.name ?? 'statement',
          fileType: file.mimeType ?? 'application/pdf',
          fileBase64,
        }),
      })

      const responseText = await response.text()
      let payload: { success?: boolean; error?: string; message?: string } | null = null
      if (responseText) {
        try {
          payload = JSON.parse(responseText)
        } catch {
          payload = null
        }
      }
      if (!response.ok || !payload?.success) {
        const serverMessage =
          payload?.error ?? payload?.message ?? (responseText || null)
        const statusLabel = `${response.status}${response.statusText ? ` ${response.statusText}` : ''}`
        const message = serverMessage
          ? `Upload failed (${statusLabel}). ${serverMessage}`
          : `Upload failed (${statusLabel}).`
        throw new Error(message)
      }

      await refreshCurrency()

      const summaryParam = encodeURIComponent(
        JSON.stringify(payload.previewSummary ?? {}),
      )

      router.replace({
        pathname: '/(auth)/wow',
        params: {
          summary: summaryParam,
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Upload bank statement</Text>
          <Text style={styles.subtitle}>
            We will extract your transactions and generate a preview summary right away.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Statement range</Text>
          <View style={styles.chipRow}>
            {monthOptions.map((option) => {
              const isSelected = option === months
              return (
                <Button
                  key={option}
                  mode={isSelected ? 'contained' : 'outlined'}
                  onPress={() => setMonths(option)}
                  buttonColor={isSelected ? theme.colors.primary : undefined}
                  textColor={isSelected ? '#ffffff' : theme.colors.ink}
                  style={styles.chipButton}
                  compact
                >
                  Last {option} months
                </Button>
              )
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Statement file</Text>
          <Button mode="outlined" onPress={handlePickFile}>
            Choose file
          </Button>
          {file ? (
            <View style={styles.fileInfo}>
              <Text style={styles.fileName}>{file.name ?? 'Selected file'}</Text>
              {formattedFileSize ? (
                <Text style={styles.fileMeta}>{formattedFileSize}</Text>
              ) : null}
            </View>
          ) : (
            <Text style={styles.helperText}>
              Upload a PDF or CSV statement covering the last {months} months.
            </Text>
          )}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          mode="contained"
          buttonColor={theme.colors.primary}
          textColor="#ffffff"
          onPress={handleUpload}
          loading={isUploading}
          disabled={isUploading}
          style={styles.primaryButton}
          contentStyle={styles.buttonContent}
          labelStyle={styles.primaryLabel}
        >
          Upload & analyze
        </Button>

        <Text style={styles.privacyNote}>
          Available worldwide. We delete your statement after processing.
        </Text>
        <Text style={styles.unlockNote}>
          If your PDF is password protected, go to{' '}
          <Text
            style={styles.linkText}
            onPress={() => Linking.openURL('https://www.ilovepdf.com/unlock_pdf')}
          >
            ilovepdf.com/unlock_pdf
          </Text>{' '}
          to unlock it, then upload it.
        </Text>
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
    padding: theme.spacing.page,
    gap: 18,
  },
  header: {
    gap: 6,
  },
  title: {
    fontFamily: theme.fonts.display.regular,
    fontSize: 26,
    color: theme.colors.ink,
  },
  subtitle: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.muted,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  sectionTitle: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 14,
    color: theme.colors.ink,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chipButton: {
    borderRadius: theme.radii.pill,
  },
  helperText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  fileInfo: {
    gap: 4,
  },
  fileName: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 13,
    color: theme.colors.ink,
  },
  fileMeta: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  errorText: {
    fontFamily: theme.fonts.body.medium,
    color: theme.colors.danger,
  },
  primaryButton: {
    borderRadius: theme.radii.button,
    marginTop: 4,
  },
  buttonContent: {
    paddingVertical: 10,
  },
  primaryLabel: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 15,
  },
  privacyNote: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.mutedLight,
    textAlign: 'center',
  },
  unlockNote: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.muted,
    textAlign: 'center',
  },
  linkText: {
    color: '#2563eb',
    textDecorationLine: 'underline',
  },
})

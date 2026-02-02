import { useCallback, useEffect, useRef, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import { ActivityIndicator, Button, IconButton, Text, TextInput } from 'react-native-paper'
import Markdown from 'react-native-markdown-display'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { chatApiUrl } from '../constants/api'
import { theme } from '../constants/theme'
import { useAuth } from '../contexts/AuthContext'
import { logError } from '../lib/telemetry'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at?: string
}

type Conversation = {
  id: string
  title: string
  message_count: number
  last_message_at: string
  created_at: string
}

const HEADER_HEIGHT = 56

const getParam = (value: string | string[] | undefined) => {
  if (!value) return undefined
  return Array.isArray(value) ? value[0] : value
}

export default function AssistantChatScreen() {
  const router = useRouter()
  const { user, status } = useAuth()
  const params = useLocalSearchParams()
  const insets = useSafeAreaInsets()

  const initialPrompt = getParam(params.prompt)
  const initialConversationId = getParam(params.conversationId)
  const initialMode = getParam(params.mode)

  const [viewMode, setViewMode] = useState<'chat' | 'list'>(
    initialMode === 'list' ? 'list' : 'chat',
  )
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const scrollViewRef = useRef<ScrollView>(null)
  const inputRef = useRef<any>(null)
  const handledPrompt = useRef(false)

  const canChat = status === 'authenticated' && Boolean(user?.id)

  const loadConversations = useCallback(async () => {
    if (!user?.id) return

    setIsLoadingConversations(true)
    try {
      const response = await fetch(chatApiUrl(`/api/chat/conversations?userId=${user.id}`))
      const data = await response.json()
      if (data?.success && data.conversations) {
        setConversations(data.conversations)
      }
    } catch (err) {
      logError(err, 'Assistant chat: load conversations failed')
      setError('Unable to load conversations.')
    } finally {
      setIsLoadingConversations(false)
    }
  }, [user?.id])

  const loadConversation = useCallback(
    async (convId: string) => {
      if (!user?.id) return

      setIsLoadingMessages(true)
      try {
        const response = await fetch(
          chatApiUrl(`/api/chat/conversations/${convId}?userId=${user.id}`),
        )
        const data = await response.json()

        if (data.success && data.conversation) {
          setConversationId(convId)

          const loadedMessages = (data.conversation.messages || []).map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            created_at: msg.created_at,
          }))

          setMessages(loadedMessages)
          setViewMode('chat')

          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }, 100)
        }
      } catch (err) {
        logError(err, 'Assistant chat: load conversation failed')
        setError('Failed to load conversation')
      } finally {
        setIsLoadingMessages(false)
      }
    },
    [user?.id],
  )

  useEffect(() => {
    if (!user?.id) return
    void loadConversations()
  }, [loadConversations, user?.id])

  useEffect(() => {
    if (!user?.id) return

    if (initialConversationId) {
      void loadConversation(initialConversationId)
      return
    }

    if (initialPrompt && !handledPrompt.current) {
      handledPrompt.current = true
      startNewChat()
      void sendMessage(initialPrompt)
    }
  }, [initialConversationId, initialPrompt, loadConversation, user?.id])

  const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`

  const updateAssistantMessage = (id: string, content: string) => {
    setMessages((prev) =>
      prev.map((message) => (message.id === id ? { ...message, content } : message)),
    )
  }

  const startNewChat = () => {
    setConversationId(null)
    setMessages([])
    setError(null)
    setViewMode('chat')
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }

  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isSending) return

    if (!user?.id) {
      setError('Sign in to ask the assistant.')
      return
    }

    setError(null)
    setInput('')
    const userMessage = { id: makeId(), role: 'user', content: trimmed } as const
    const assistantId = makeId()
    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: assistantId, role: 'assistant', content: '' },
    ])
    setIsSending(true)

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true })
    }, 100)

    try {
      const payload = {
        message: trimmed,
        userId: user.id,
        conversationId,
      }

      const applySsePayload = (
        data: { token?: string; message?: string; conversationId?: string; error?: string },
        state: { assistantText: string },
      ) => {
        if (data?.conversationId && !conversationId) {
          setConversationId(data.conversationId)
        }

        if (typeof data?.token === 'string') {
          state.assistantText += data.token
          updateAssistantMessage(assistantId, state.assistantText)
        } else if (typeof data?.message === 'string') {
          state.assistantText = data.message
          updateAssistantMessage(assistantId, state.assistantText)
        }

        if (data?.error) {
          setError(data.error)
        }
      }

      const streamWithXhr = async () => {
        const XhrImpl = (globalThis as any).XMLHttpRequest
        if (!XhrImpl || Platform.OS === 'web') {
          return false
        }

        await new Promise<void>((resolve, reject) => {
          const xhr = new XhrImpl()
          const state = { assistantText: '' }
          let buffer = ''
          let lastIndex = 0

          const handleChunk = (chunk: string) => {
            buffer += chunk
            const lines = buffer.split(/\r?\n/)
            buffer = lines.pop() ?? ''
            for (const line of lines) {
              const trimmedLine = line.trim()
              if (!trimmedLine.startsWith('data:')) continue
              const data = trimmedLine.slice(5).trim()
              if (!data) continue

              try {
                applySsePayload(JSON.parse(data), state)
              } catch {
                // Ignore malformed SSE chunks.
              }
            }
          }

          xhr.open('POST', chatApiUrl('/api/chat?stream=1'))
          xhr.setRequestHeader('Content-Type', 'application/json')
          xhr.setRequestHeader('Accept', 'text/event-stream')

          xhr.onreadystatechange = () => {
            if (xhr.readyState === 3 || xhr.readyState === 4) {
              const text = xhr.responseText ?? ''
              const chunk = text.slice(lastIndex)
              lastIndex = text.length
              if (chunk) {
                handleChunk(chunk)
              }
            }

            if (xhr.readyState === 4) {
              if (xhr.status >= 200 && xhr.status < 300) {
                if (!state.assistantText) {
                  const contentType = xhr.getResponseHeader?.('content-type') ?? ''
                  if (contentType.includes('application/json')) {
                    try {
                      const data = JSON.parse(xhr.responseText || '{}')
                      if (data?.conversationId) {
                        setConversationId(data.conversationId)
                      }
                      updateAssistantMessage(
                        assistantId,
                        data?.message ?? 'Sorry, I had trouble answering that.',
                      )
                    } catch {
                      updateAssistantMessage(
                        assistantId,
                        'Sorry, I had trouble answering that.',
                      )
                    }
                  } else {
                    updateAssistantMessage(
                      assistantId,
                      'Sorry, I had trouble answering that.',
                    )
                  }
                }
                resolve()
              } else {
                reject(new Error(xhr.responseText || 'Unable to get a response.'))
              }
            }
          }

          xhr.onprogress = () => {
            const text = xhr.responseText ?? ''
            const chunk = text.slice(lastIndex)
            lastIndex = text.length
            if (chunk) {
              handleChunk(chunk)
            }
          }

          xhr.onerror = () => reject(new Error('Unable to get a response.'))
          xhr.send(JSON.stringify(payload))
        })

        return true
      }

      let didStream = false
      try {
        didStream = await streamWithXhr()
      } catch {
        didStream = false
      }

      if (!didStream) {
        const TextDecoderImpl = (globalThis as any).TextDecoder
        const canStream = typeof TextDecoderImpl !== 'undefined'
        const url =
          Platform.OS === 'web' && canStream ? '/api/chat?stream=1' : '/api/chat'
        const response = await fetch(chatApiUrl(url), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(canStream ? { Accept: 'text/event-stream' } : {}),
          },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const errorText = await response.text().catch(() => null)
          throw new Error(errorText || 'Unable to get a response.')
        }

        const contentType = response.headers.get('content-type') ?? ''
        const reader = response.body?.getReader?.()
        const isEventStream = contentType.includes('text/event-stream')

        if (canStream && isEventStream && reader) {
          const decoder = new TextDecoderImpl()
          let buffer = ''
          const state = { assistantText: '' }

          while (true) {
            const { value, done } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split(/\r?\n/)
            buffer = lines.pop() ?? ''

            for (const line of lines) {
              const trimmedLine = line.trim()
              if (!trimmedLine.startsWith('data:')) continue
              const data = trimmedLine.slice(5).trim()
              if (!data) continue

              try {
                applySsePayload(JSON.parse(data), state)
              } catch {
                // Ignore malformed SSE chunks.
              }
            }
          }

          if (!state.assistantText) {
            updateAssistantMessage(assistantId, 'Sorry, I had trouble answering that.')
          }
        } else {
          const data = await response.json().catch(() => null)
          if (!data?.success) {
            throw new Error(data?.error ?? 'Unable to get a response.')
          }

          if (data?.conversationId) {
            setConversationId(data.conversationId)
          }

          updateAssistantMessage(
            assistantId,
            data?.message ?? 'Sorry, I had trouble answering that.',
          )
        }
      }

      await loadConversations()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reach the assistant.')
      updateAssistantMessage(assistantId, 'Sorry, I had trouble answering that.')
    } finally {
      setIsSending(false)
    }
  }

  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (!canChat) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <IconButton icon="close" onPress={() => router.back()} />
          <Text style={styles.headerTitle}>Assistant Chat</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Sign in to start chatting.</Text>
        </View>
      </SafeAreaView>
    )
  }

  const keyboardVerticalOffset = Platform.OS === 'ios' ? HEADER_HEIGHT : 0

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <View style={styles.header}>
          <IconButton icon="close" onPress={() => router.back()} />
          <Text style={styles.headerTitle}>
            {viewMode === 'chat' ? 'Assistant Chat' : 'Conversations'}
          </Text>
          <View style={styles.headerActions}>
            <IconButton icon="plus" onPress={startNewChat} />
            <IconButton
              icon={viewMode === 'chat' ? 'format-list-bulleted' : 'message-text'}
              onPress={() => {
                if (viewMode === 'chat') {
                  void loadConversations()
                  setViewMode('list')
                } else {
                  setViewMode('chat')
                }
              }}
            />
          </View>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {viewMode === 'list' ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: 12 + insets.bottom },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            {isLoadingConversations ? (
              <Text style={styles.emptyText}>Loading conversations...</Text>
            ) : conversations.length === 0 ? (
              <Text style={styles.emptyText}>No conversations yet.</Text>
            ) : (
              conversations.map((conv) => (
                <TouchableOpacity
                  key={conv.id}
                  style={styles.conversationRow}
                  onPress={() => loadConversation(conv.id)}
                >
                  <Text style={styles.conversationTitle}>{conv.title || 'Conversation'}</Text>
                  <Text style={styles.conversationMeta}>
                    {conv.message_count} messages • {formatRelativeDate(conv.last_message_at)}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: 12 + insets.bottom },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((message) => (
              <View
                key={message.id}
                style={message.role === 'assistant' ? styles.assistantBubble : styles.userBubble}
              >
                {message.role === 'assistant' ? (
                  <Markdown style={markdownStyles}>{message.content}</Markdown>
                ) : (
                  <Text style={styles.userText}>{message.content}</Text>
                )}
              </View>
            ))}
            {isLoadingMessages ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : null}
          </ScrollView>
        )}

        {viewMode === 'chat' ? (
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              placeholder="Ask a question..."
              style={styles.input}
            />
            <Button mode="contained" onPress={() => sendMessage(input)} loading={isSending}>
              Send
            </Button>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const markdownStyles = {
  body: { color: theme.colors.ink, fontSize: 14, lineHeight: 20 },
  paragraph: { marginTop: 0, marginBottom: 6 },
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
  },
  errorBanner: {
    backgroundColor: '#fbe9e9',
    padding: 12,
    borderRadius: 12,
    margin: 12,
  },
  errorText: {
    color: '#b91c1c',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 12,
    padding: 12,
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 12,
    maxWidth: '85%',
  },
  userText: {
    color: '#fff',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  input: {
    flex: 1,
  },
  conversationRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  conversationTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  conversationMeta: {
    fontSize: 12,
    color: theme.colors.mutedLight,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    color: theme.colors.mutedLight,
  },
})

import { useCallback, useEffect, useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { ActivityIndicator, Chip, IconButton, Text, TextInput } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import Markdown from 'react-native-markdown-display'
import { useRouter } from 'expo-router'
import { chatApiUrl } from '../../constants/api'
import { theme } from '../../constants/theme'
import { useAuth } from '../../contexts/AuthContext'

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

type FinancialSummary = {
  total_balance: number | null
  monthly_income: number | null
  monthly_spending: number | null
  savings_rate: number | null
  spending_trend: string | null
}

const quickPrompts = [
  '💰 How can I save more?',
  '📊 Analyze my spending',
  '🎯 Set a budget goal',
  '💡 Money-saving tips',
]

export default function TaxesScreen() {
  const router = useRouter()
  const { user, status } = useAuth()

  // UI State
  const [viewMode, setViewMode] = useState<'chat' | 'list'>('chat')

  // Data State
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')

  // Loading States
  const [isSending, setIsSending] = useState(false)
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Current conversation
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const scrollViewRef = useRef<ScrollView>(null)
  const inputRef = useRef<any>(null)
  const canChat = status === 'authenticated' && Boolean(user?.id)

  // Load financial summary
  const loadSummary = useCallback(async () => {
    if (!user?.id) return

    setIsLoadingSummary(true)
    try {
      const response = await fetch(chatApiUrl(`/api/chat/financial-summary/${user.id}`))

      const data = await response.json()
      if (data.success && data.summary) {
        setSummary(data.summary)
      }
    } catch (err) {
      console.error('Failed to load summary:', err)
    } finally {
      setIsLoadingSummary(false)
    }
  }, [user?.id])

  // Load conversations list
  const loadConversations = useCallback(async () => {
    if (!user?.id) return

    setIsLoadingConversations(true)
    try {
      const response = await fetch(chatApiUrl(`/api/chat/conversations?userId=${user.id}`))
      const data = await response.json()

      if (data.success && data.conversations) {
        setConversations(data.conversations)
      }
    } catch (err) {
      console.error('Failed to load conversations:', err)
    } finally {
      setIsLoadingConversations(false)
    }
  }, [user?.id])

  // Load specific conversation messages
  const loadConversation = useCallback(async (convId: string) => {
    if (!user?.id) return

    setIsLoadingMessages(true)
    try {
      const response = await fetch(
        chatApiUrl(`/api/chat/conversations/${convId}?userId=${user.id}`)
      )
      const data = await response.json()

      if (data.success && data.conversation) {
        setConversationId(convId)

        // Convert messages to local format
        const loadedMessages = (data.conversation.messages || []).map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          created_at: msg.created_at,
        }))

        setMessages(loadedMessages)
        setViewMode('chat')

        // Scroll to bottom after loading
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true })
        }, 100)
      }
    } catch (err) {
      console.error('Failed to load conversation:', err)
      setError('Failed to load conversation')
    } finally {
      setIsLoadingMessages(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadSummary()
    loadConversations()
  }, [loadSummary, loadConversations])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([loadSummary(), loadConversations()])
    setRefreshing(false)
  }, [loadSummary, loadConversations])

  const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`

  const updateAssistantMessage = (id: string, content: string) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === id ? { ...message, content } : message,
      ),
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

    // Scroll to bottom
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
              } catch (error) {
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
                    } catch (error) {
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
      } catch (error) {
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
              } catch (error) {
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

      // Reload conversations list after sending a message
      loadConversations()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reach the assistant.')
      updateAssistantMessage(assistantId, 'Sorry, I had trouble answering that.')
    } finally {
      setIsSending(false)
    }
  }

  const formatCurrency = (value: number | null) => {
    if (value === null) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPercent = (value: number | null) => {
    if (value === null) return 'N/A'
    return `${value.toFixed(1)}%`
  }

  const formatDate = (dateString: string) => {
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

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header with Navigation */}
        <View style={styles.headerBar}>
          <View style={styles.headerLeft}>
            <IconButton
              icon="close"
              size={24}
              onPress={() => router.back()}
              iconColor={theme.colors.ink}
            />
            <View>
              <Text style={styles.headerTitle}>
                {viewMode === 'chat' ? '💬 Assistant' : '📋 Conversations'}
              </Text>
              {viewMode === 'chat' && conversationId && (
                <Text style={styles.headerSubtitle}>
                  {messages.length} messages
                </Text>
              )}
            </View>
          </View>

          <View style={styles.headerRight}>
            <IconButton
              icon="plus"
              size={24}
              onPress={startNewChat}
              iconColor={theme.colors.primary}
              style={styles.headerButton}
            />
            <IconButton
              icon={viewMode === 'chat' ? 'format-list-bulleted' : 'message-text'}
              size={24}
              onPress={() => {
                if (viewMode === 'chat') {
                  loadConversations()
                  setViewMode('list')
                } else {
                  setViewMode('chat')
                }
              }}
              iconColor={theme.colors.primary}
              style={styles.headerButton}
            />
          </View>
        </View>

        {/* Conversations List View */}
        {viewMode === 'list' ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            <Text style={styles.listTitle}>Your Conversations</Text>
            <Text style={styles.listSubtitle}>
              {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
            </Text>

            {isLoadingConversations ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading conversations...</Text>
              </View>
            ) : conversations.length === 0 ? (
              <View style={styles.emptyConversations}>
                <Text style={styles.emptyConversationsIcon}>💬</Text>
                <Text style={styles.emptyConversationsTitle}>No conversations yet</Text>
                <Text style={styles.emptyConversationsText}>
                  Start a new chat to begin asking about your finances
                </Text>
                <TouchableOpacity
                  style={styles.startChatButton}
                  onPress={startNewChat}
                >
                  <Text style={styles.startChatButtonText}>Start New Chat</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.conversationsList}>
                {conversations.map((conv) => (
                  <TouchableOpacity
                    key={conv.id}
                    style={[
                      styles.conversationCard,
                      conv.id === conversationId && styles.conversationCardActive,
                    ]}
                    onPress={() => loadConversation(conv.id)}
                  >
                    <View style={styles.conversationHeader}>
                      <Text style={styles.conversationTitle} numberOfLines={1}>
                        {conv.title}
                      </Text>
                      <Text style={styles.conversationDate}>
                        {formatDate(conv.last_message_at)}
                      </Text>
                    </View>
                    <Text style={styles.conversationMeta}>
                      {conv.message_count} message{conv.message_count !== 1 ? 's' : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        ) : (
          /* Chat View */
          <>
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            >
              {/* Financial Summary Stats */}
              {isLoadingSummary ? (
                <View style={styles.statsLoading}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={styles.statsLoadingText}>Loading your stats...</Text>
                </View>
              ) : summary ? (
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Balance (with investments)</Text>
                    <Text style={styles.statValue}>{formatCurrency(summary.total_balance)}</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Monthly Spending</Text>
                    <Text style={styles.statValue}>{formatCurrency(summary.monthly_spending)}</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Monthly Income</Text>
                    <Text style={styles.statValue}>{formatCurrency(summary.monthly_income)}</Text>
                  </View>
                </View>
              ) : null}

              {/* Loading Messages State */}
              {isLoadingMessages ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={styles.loadingText}>Loading conversation...</Text>
                </View>
              ) : (
                /* Chat Messages */
                <View style={styles.chatContainer}>
                  {messages.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateIcon}>💡</Text>
                      <Text style={styles.emptyStateTitle}>Start a conversation</Text>
                      <Text style={styles.emptyStateText}>
                        Ask about your spending, get saving tips, or plan your financial goals
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.chatMessages}>
                      {messages.map((message) => (
                        <View
                          key={message.id}
                          style={[
                            styles.chatBubble,
                            message.role === 'user'
                              ? styles.chatBubbleUser
                              : styles.chatBubbleAssistant,
                          ]}
                        >
                          {message.role === 'assistant' ? (
                            message.content ? (
                              <Markdown style={markdownStyles}>{message.content}</Markdown>
                            ) : (
                              <View style={styles.typingIndicator}>
                                <ActivityIndicator size="small" color={theme.colors.primary} />
                              </View>
                            )
                          ) : (
                            <Text style={styles.chatText}>{message.content}</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {error ? (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>❌ {error}</Text>
                    </View>
                  ) : null}
                </View>
              )}
            </ScrollView>

            {/* Input Section - Fixed at Bottom */}
            <View style={styles.inputSection}>
              {/* Quick Prompts */}
              <View style={styles.promptRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {quickPrompts.map((prompt) => (
                    <Chip
                      key={prompt}
                      onPress={() => sendMessage(prompt)}
                      style={styles.promptChip}
                      textStyle={styles.promptChipText}
                      disabled={!canChat || isSending}
                    >
                      {prompt}
                    </Chip>
                  ))}
                </ScrollView>
              </View>

              {/* Input Row */}
              <View style={styles.inputRow}>
                <TextInput
                  ref={inputRef}
                  mode="outlined"
                  placeholder={canChat ? 'Ask about your finances...' : 'Sign in to chat'}
                  value={input}
                  onChangeText={setInput}
                  multiline
                  maxLength={500}
                  editable={canChat && !isSending}
                  style={styles.chatInput}
                  outlineStyle={styles.inputOutline}
                  onSubmitEditing={() => {
                    if (input.trim() && !isSending) {
                      sendMessage(input)
                    }
                  }}
                />
                <IconButton
                  icon="send"
                  size={24}
                  onPress={() => sendMessage(input)}
                  disabled={!canChat || isSending || !input.trim()}
                  iconColor={
                    canChat && !isSending && input.trim()
                      ? theme.colors.primary
                      : theme.colors.muted
                  }
                  style={styles.sendButton}
                />
              </View>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const markdownStyles = StyleSheet.create({
  body: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 14,
    color: theme.colors.ink,
    lineHeight: 20,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 8,
  },
  strong: {
    fontFamily: theme.fonts.body.medium,
    fontWeight: '600',
  },
  link: {
    color: theme.colors.accent,
    textDecorationLine: 'underline',
  },
  bullet_list: {
    marginBottom: 8,
  },
  ordered_list: {
    marginBottom: 8,
  },
  list_item: {
    marginBottom: 4,
    flexDirection: 'row',
  },
})

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontFamily: theme.fonts.display.medium,
    fontSize: 18,
    color: theme.colors.ink,
  },
  headerSubtitle: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    margin: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 8,
  },
  listTitle: {
    fontFamily: theme.fonts.display.medium,
    fontSize: 24,
    color: theme.colors.ink,
    marginBottom: 4,
  },
  listSubtitle: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 14,
    color: theme.colors.muted,
    marginBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  loadingText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 14,
    color: theme.colors.muted,
  },
  emptyConversations: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyConversationsIcon: {
    fontSize: 64,
    marginBottom: 8,
  },
  emptyConversationsTitle: {
    fontFamily: theme.fonts.display.medium,
    fontSize: 20,
    color: theme.colors.ink,
    textAlign: 'center',
  },
  emptyConversationsText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 14,
    color: theme.colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  startChatButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  startChatButtonText: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 14,
    color: '#FFFFFF',
  },
  conversationsList: {
    gap: 12,
  },
  conversationCard: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  conversationCardActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft || '#f0f9ff',
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  conversationTitle: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 16,
    color: theme.colors.ink,
    flex: 1,
  },
  conversationDate: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  conversationMeta: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  statsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  statsLoadingText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 14,
    color: theme.colors.muted,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  statLabel: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: theme.colors.muted,
  },
  statValue: {
    fontFamily: theme.fonts.display.medium,
    fontSize: 20,
    color: theme.colors.ink,
  },
  statValuePositive: {
    color: '#10b981',
  },
  statValueNegative: {
    color: '#ef4444',
  },
  chatContainer: {
    flex: 1,
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyStateTitle: {
    fontFamily: theme.fonts.display.medium,
    fontSize: 18,
    color: theme.colors.ink,
    textAlign: 'center',
  },
  emptyStateText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 14,
    color: theme.colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  chatMessages: {
    gap: 12,
  },
  chatBubble: {
    padding: 14,
    borderRadius: 16,
    maxWidth: '85%',
  },
  chatBubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary,
  },
  chatBubbleAssistant: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chatText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  typingIndicator: {
    paddingVertical: 4,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 13,
    color: '#991b1b',
  },
  inputSection: {
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 8 : 12,
    gap: 12,
  },
  promptRow: {
    flexDirection: 'row',
    gap: 8,
  },
  promptChip: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 8,
  },
  promptChipText: {
    fontFamily: theme.fonts.body.medium,
    fontSize: 13,
    color: theme.colors.ink,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    maxHeight: 100,
    fontSize: 14,
  },
  inputOutline: {
    borderRadius: 20,
    borderColor: theme.colors.border,
  },
  sendButton: {
    marginBottom: 4,
  },
})

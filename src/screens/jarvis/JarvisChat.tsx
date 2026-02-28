import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  StyleSheet,
  ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageRole = 'jarvis' | 'user';

type ChatState = 'idle' | 'typing' | 'waiting' | 'responding';

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
}

interface TypingDot {
  anim: Animated.Value;
}

// ─── Placeholder AI call ──────────────────────────────────────────────────────

async function callJarvisAPI(userMessage: string): Promise<string> {
  // TODO: replace with actual Supabase Edge Function / OpenAI call
  await new Promise((res) => setTimeout(res, 1400 + Math.random() * 600));
  const responses: Record<string, string> = {
    default:
      'Bien compris. Je travaille sur vos données de santé pour vous fournir une analyse personnalisée.',
    bonjour:
      'Bonjour ! Comment vous sentez-vous aujourd'hui ? Je peux analyser votre sommeil, votre stress ou vos performances.',
    sommeil:
      'Votre score de sommeil cette nuit était de 78/100. Phase REM légèrement réduite — je vous recommande 30 min de moins d'écran ce soir.',
    stress:
      'Vos niveaux de VFC suggèrent un stress modéré aujourd'hui. Une session de respiration de 5 min pourrait faire la différence.',
  };
  const lower = userMessage.toLowerCase();
  if (lower.includes('bonjour') || lower.includes('salut')) return responses.bonjour;
  if (lower.includes('sommeil') || lower.includes('nuit')) return responses.sommeil;
  if (lower.includes('stress') || lower.includes('anxiété')) return responses.stress;
  return responses.default;
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  const dots = useRef<TypingDot[]>([
    { anim: new Animated.Value(0) },
    { anim: new Animated.Value(0) },
    { anim: new Animated.Value(0) },
  ]).current;

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(dot.anim, {
            toValue: 1,
            duration: 320,
            useNativeDriver: true,
          }),
          Animated.timing(dot.anim, {
            toValue: 0,
            duration: 320,
            useNativeDriver: true,
          }),
        ])
      )
    );
    const parallel = Animated.parallel(animations);
    parallel.start();
    return () => parallel.stop();
  }, [dots]);

  return (
    <View style={styles.typingContainer}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={[
            styles.typingDot,
            {
              opacity: dot.anim,
              transform: [
                {
                  translateY: dot.anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -5],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: Message;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isJarvis = message.role === 'jarvis';
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const timeString = message.timestamp.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Animated.View
      style={[
        styles.bubbleRow,
        isJarvis ? styles.bubbleRowJarvis : styles.bubbleRowUser,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {isJarvis && (
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>J</Text>
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isJarvis ? styles.bubbleJarvis : styles.bubbleUser,
        ]}
      >
        <Text
          style={[
            styles.bubbleText,
            isJarvis ? styles.bubbleTextJarvis : styles.bubbleTextUser,
          ]}
        >
          {message.content}
        </Text>
        <Text
          style={[
            styles.timestamp,
            isJarvis ? styles.timestampJarvis : styles.timestampUser,
          ]}
        >
          {timeString}
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function JarvisChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'jarvis',
      content:
        'Bonjour. Je suis Jarvis, votre assistant santé IA. Comment puis-je vous aider aujourd'hui ?',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState<string>('');
  const [chatState, setChatState] = useState<ChatState>('idle');
  const flatListRef = useRef<FlatList<Message>>(null);
  const inputRef = useRef<TextInput>(null);

  const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const scrollToTop = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 80);
  }, []);

  const { mutate: sendMessage } = useMutation({
    mutationFn: (userText: string) => callJarvisAPI(userText),
    onMutate: (userText: string) => {
      const userMsg: Message = {
        id: generateId(),
        role: 'user',
        content: userText,
        timestamp: new Date(),
      };
      setMessages((prev) => [userMsg, ...prev]);
      setChatState('typing');
      scrollToTop();
    },
    onSuccess: (response: string) => {
      setChatState('responding');
      const jarvisMsg: Message = {
        id: generateId(),
        role: 'jarvis',
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [jarvisMsg, ...prev]);
      setChatState('idle');
      scrollToTop();
    },
    onError: () => {
      const errorMsg: Message = {
        id: generateId(),
        role: 'jarvis',
        content: 'Une erreur est survenue. Veuillez réessayer.',
        timestamp: new Date(),
      };
      setMessages((prev) => [errorMsg, ...prev]);
      setChatState('idle');
      scrollToTop();
    },
  });

  const handleSend = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed || chatState !== 'idle') return;
    setInputText('');
    setChatState('waiting');
    sendMessage(trimmed);
  }, [inputText, chatState, sendMessage]);

  const isLoading = chatState === 'typing' || chatState === 'waiting' || chatState === 'responding';

  const renderItem: ListRenderItem<Message> = useCallback(
    ({ item }) => <MessageBubble message={item} />,
    []
  );

  const renderHeader = useCallback(() => {
    if (!isLoading) return null;
    return (
      <View style={styles.typingWrapper}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>J</Text>
        </View>
        <View style={[styles.bubble, styles.bubbleJarvis, styles.typingBubble]}>
          <TypingIndicator />
        </View>
      </View>
    );
  }, [isLoading]);

  const keyExtractor = useCallback((item: Message) => item.id, []);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.statusDot} />
            <Text style={styles.headerTitle}>Jarvis</Text>
          </View>
          <Text style={styles.headerSub}>Assistant IA · VIVE</Text>
        </View>

        {/* Message List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          inverted
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        />

        {/* Input Row */}
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Parlez à Jarvis…"
            placeholderTextColor="#A8A8C0"
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            editable={!isLoading}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
            ]}
            activeOpacity={0.75}
          >
            <Text style={styles.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#080810',
  },
  kav: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1C1C28',
    backgroundColor: '#080810',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3D8BFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E8E8F0',
    letterSpacing: 0.3,
  },
  headerSub: {
    fontSize: 12,
    color: '#A8A8C0',
    letterSpacing: 0.2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexGrow: 1,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginVertical: 5,
    maxWidth: '82%',
  },
  bubbleRowJarvis: {
    alignSelf: 'flex-start',
    alignItems: 'flex-end',
  },
  bubbleRowUser: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  avatarContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#3D8BFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 2,
    flexShrink: 0,
  },
  avatarText: {
    color: '#E8E8F0',
    fontSize: 13,
    fontWeight: '700',
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  bubbleJarvis: {
    backgroundColor: '#1C1C28',
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: '#3D8BFF',
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
  },
  bubbleTextJarvis: {
    color: '#E8E8F0',
  },
  bubbleTextUser: {
    color: '#FFFFFF',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
  },
  timestampJarvis: {
    color: '#A8A8C0',
    textAlign: 'left',
  },
  timestampUser: {
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'right',
  },
  typingWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  typingBubble: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 16,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#A8A8C0',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1C1C28',
    backgroundColor: '#080810',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#111118',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    color: '#E8E8F0',
    fontSize: 15,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#1C1C28',
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#3D8BFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#1C1C28',
  },
  sendIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: -1,
  },
});

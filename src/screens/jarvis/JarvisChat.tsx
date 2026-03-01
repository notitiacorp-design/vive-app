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
import type { MessageRole, ChatState, Message } from './types';

// âââ Types locaux non partagÃ©s ââââââââââââââââââââââââââââââââââââââââââââââââ

interface TypingDot {
  anim: Animated.Value;
}

// âââ Input validation âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const MAX_INPUT_LENGTH = 500;

function validateUserInput(text: string): { valid: boolean; sanitized: string; error?: string } {
  const trimmed = text.trim();
  if (!trimmed) {
    return { valid: false, sanitized: trimmed, error: 'Message vide.' };
  }
  if (trimmed.length > MAX_INPUT_LENGTH) {
    return { valid: false, sanitized: trimmed, error: 'Message trop long.' };
  }
  // Basic sanitation: strip null bytes and control characters (except newlines/tabs)
  const sanitized = trimmed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  if (!sanitized) {
    return { valid: false, sanitized, error: 'Contenu invalide.' };
  }
  return { valid: true, sanitized };
}

// âââ Typing Indicator âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

function TypingIndicator() {
  const dotsRef = useRef<TypingDot[]>([
    { anim: new Animated.Value(0) },
    { anim: new Animated.Value(0) },
    { anim: new Animated.Value(0) },
  ]);
  const dots = dotsRef.current;

  useEffect(() => {
    let isMounted = true;
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
    if (isMounted) {
      parallel.start();
    }
    return () => {
      isMounted = false;
      parallel.stop();
      // Reset all dot animations to prevent stale state on remount
      dots.forEach((dot) => dot.anim.setValue(0));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

// âââ Message Bubble âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble = React.memo(function MessageBubble({ message }: MessageBubbleProps) {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
});

// âââ Main Component âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export default function JarvisChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'jarvis',
      content:
        'Bonjour. Je suis Jarvis, votre assistant sant\u00e9 IA. Comment puis-je vous aider aujourd\u2019hui\u00a0?',
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
    mutationFn: (userText: string) => import('../../services/jarvisService').then(m => m.callJarvisAPI(userText)),
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
        content: 'Une erreur est survenue. Veuillez r\u00e9essayer.',
        timestamp: new Date(),
      };
      setMessages((prev) => [errorMsg, ...prev]);
      setChatState('idle');
      scrollToTop();
    },
  });

  const handleSend = useCallback(() => {
    if (chatState !== 'idle') return;
    const { valid, sanitized, error } = validateUserInput(inputText);
    if (!valid || !sanitized) {
      // Optionally surface error to user; for now silently abort
      return;
    }
    setInputText('');
    setChatState('waiting');
    sendMessage(sanitized);
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
          <Text style={styles.headerSub}>Assistant IA \u00b7 VIVE</Text>
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
            placeholder="Parlez \u00e0 Jarvis\u2026"
            placeholderTextColor="#A8A8C0"
            multiline
            maxLength={MAX_INPUT_LENGTH}
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
            <Text style={styles.sendIcon}>\u2191</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// âââ Styles âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

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

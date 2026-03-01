import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
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

// âââ ThÃ¨me / Constantes de couleurs ââââââââââââââââââââââââââââââââââââââââââ

const Theme = {
  background: '#080810',
  surface: '#111118',
  border: '#1C1C28',
  primary: '#3D8BFF',
  textPrimary: '#E8E8F0',
  textSecondary: '#A8A8C0',
  white: '#FFFFFF',
  whiteAlpha65: 'rgba(255,255,255,0.65)',
} as const;

// âââ Constantes âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const MAX_INPUT_LENGTH = 500;

// âââ Utilitaires ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function validateUserInput(
  text: string
): { valid: boolean; sanitized: string; error?: string } {
  const trimmed = text.trim();
  if (!trimmed) {
    return { valid: false, sanitized: trimmed, error: 'Message vide.' };
  }
  if (trimmed.length > MAX_INPUT_LENGTH) {
    return { valid: false, sanitized: trimmed, error: 'Message trop long.' };
  }
  // Suppression des octets nuls et caractÃ¨res de contrÃ´le (sauf retours Ã  la ligne / tabulations)
  const sanitized = trimmed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  if (!sanitized) {
    return { valid: false, sanitized, error: 'Contenu invalide.' };
  }
  return { valid: true, sanitized };
}

// âââ Types locaux non partagÃ©s ââââââââââââââââââââââââââââââââââââââââââââââââ

interface TypingDot {
  anim: Animated.Value;
}

// âââ Indicateur de frappe âââââââââââââââââââââââââââââââââââââââââââââââââââââ

const TypingIndicator = React.memo(function TypingIndicator() {
  const dotsRef = useRef<TypingDot[]>([
    { anim: new Animated.Value(0) },
    { anim: new Animated.Value(0) },
    { anim: new Animated.Value(0) },
  ]);
  const dots = dotsRef.current;

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
    return () => {
      parallel.stop();
      // RÃ©initialisation pour Ã©viter un Ã©tat obsolÃ¨te lors du remontage
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
});

// âââ Bulle de message âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble = React.memo(function MessageBubble({
  message,
}: MessageBubbleProps) {
  const isJarvis = message.role === 'jarvis';
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    const animation = Animated.parallel([
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
    ]);
    animation.start();
    return () => {
      animation.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const timeString = useMemo(
    () =>
      message.timestamp.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    [message.timestamp]
  );

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

// âââ Composant principal ââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export default function JarvisChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'jarvis',
      content:
        'Bonjour. Je suis Jarvis, votre assistant santÃ© IA. Comment puis-je vous aider aujourd\u2019hui\u00a0?',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState<string>('');
  const [chatState, setChatState] = useState<ChatState>('idle');
  const flatListRef = useRef<FlatList<Message>>(null);
  const inputRef = useRef<TextInput>(null);

  // DÃ©filement vers le bas (offset 0 dans une FlatList inversÃ©e)
  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const { mutate: sendMessage } = useMutation({
    mutationFn: (userText: string) =>
      import('../../services/jarvisService').then((m) =>
        m.callJarvisAPI(userText)
      ),
    onMutate: (userText: string) => {
      const userMsg: Message = {
        id: generateId(),
        role: 'user',
        content: userText,
        timestamp: new Date(),
      };
      setMessages((prev) => [userMsg, ...prev]);
      setChatState('typing');
      scrollToBottom();
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
      scrollToBottom();
    },
    onError: () => {
      const errorMsg: Message = {
        id: generateId(),
        role: 'jarvis',
        content: 'Une erreur est survenue. Veuillez rÃ©essayer.',
        timestamp: new Date(),
      };
      setMessages((prev) => [errorMsg, ...prev]);
      setChatState('idle');
      scrollToBottom();
    },
  });

  const handleSend = useCallback(() => {
    if (chatState !== 'idle') return;
    const { valid, sanitized } = validateUserInput(inputText);
    if (!valid || !sanitized) return;
    setInputText('');
    setChatState('waiting');
    sendMessage(sanitized);
  }, [inputText, chatState, sendMessage]);

  const isLoading = useMemo(
    () =>
      chatState === 'typing' ||
      chatState === 'waiting' ||
      chatState === 'responding',
    [chatState]
  );

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

  const isSendDisabled = useMemo(
    () => !inputText.trim() || isLoading,
    [inputText, isLoading]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        {/* En-tÃªte */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.statusDot} />
            <Text style={styles.headerTitle}>Jarvis</Text>
          </View>
          <Text style={styles.headerSub}>Assistant IA Â· VIVE</Text>
        </View>

        {/* Liste des messages */}
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

        {/* Zone de saisie */}
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Parlez Ã  Jarvisâ¦"
            placeholderTextColor={Theme.textSecondary}
            multiline
            maxLength={MAX_INPUT_LENGTH}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            editable={!isLoading}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={isSendDisabled}
            style={[
              styles.sendButton,
              isSendDisabled && styles.sendButtonDisabled,
            ]}
            activeOpacity={0.75}
          >
            <Text style={styles.sendIcon}>â</Text>
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
    backgroundColor: Theme.background,
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
    borderBottomColor: Theme.border,
    backgroundColor: Theme.background,
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
    backgroundColor: Theme.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Theme.textPrimary,
    letterSpacing: 0.3,
  },
  headerSub: {
    fontSize: 12,
    color: Theme.textSecondary,
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
    backgroundColor: Theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 2,
    flexShrink: 0,
  },
  avatarText: {
    color: Theme.textPrimary,
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
    backgroundColor: Theme.border,
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: Theme.primary,
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
  },
  bubbleTextJarvis: {
    color: Theme.textPrimary,
  },
  bubbleTextUser: {
    color: Theme.white,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
  },
  timestampJarvis: {
    color: Theme.textSecondary,
    textAlign: 'left',
  },
  timestampUser: {
    color: Theme.whiteAlpha65,
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
    backgroundColor: Theme.textSecondary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Theme.border,
    backgroundColor: Theme.background,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: Theme.surface,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    color: Theme.textPrimary,
    fontSize: 15,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Theme.border,
  },
  sendIcon: {
    color: Theme.white,
    fontSize: 18,
    fontWeight: '700',
    marginTop: -1,
  },
});

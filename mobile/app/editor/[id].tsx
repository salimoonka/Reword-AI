/**
 * Editor Screen - Note Editor with AI Generation
 * Redesigned: custom header, title system, inline diff, mode buttons with full labels
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useSubscriptionStore } from '@/stores/useSubscriptionStore';
import { useNotesStore } from '@/stores/useNotesStore';
import { colors, spacing } from '@/theme';
import { paraphraseText, ParaphraseMode, DiffSegment } from '@/services/api/paraphrase';

const PARAPHRASE_MODES: { id: ParaphraseMode; label: string; emoji: string }[] = [
  { id: 'paraphrase', label: 'Перефразировка', emoji: '🔄' },
  { id: 'shorten', label: 'Сократить', emoji: '✂️' },
  { id: 'expand', label: 'Расширить', emoji: '📝' },
  { id: 'professional', label: 'Профессиональный', emoji: '💼' },
  { id: 'colloquial', label: 'Разговорный', emoji: '💬' },
  { id: 'empathetic', label: 'Эмпатичный', emoji: '❤️' },
  { id: 'confident', label: 'Уверенный', emoji: '💪' },
  { id: 'friendly', label: 'Дружелюбный', emoji: '😊' },
];

export default function EditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { paraphrasesUsed, paraphrasesLimit, tier, incrementUsage } = useSubscriptionStore();
  const { getNote, updateNote } = useNotesStore();

  const note = getNote(id || '');

  // Split content: first line = title, rest = body
  const contentParts = (note?.content || '').split('\n');
  const [title, setTitle] = useState(contentParts[0] || '');
  const [body, setBody] = useState(contentParts.slice(1).join('\n'));

  const [selectedMode, setSelectedMode] = useState<ParaphraseMode>('paraphrase');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Diff state
  const [showDiff, setShowDiff] = useState(false);
  const [diffSegments, setDiffSegments] = useState<DiffSegment[]>([]);
  const [generatedText, setGeneratedText] = useState('');
  const [originalBody, setOriginalBody] = useState('');

  const bodyInputRef = useRef<TextInput>(null);
  const titleInputRef = useRef<TextInput>(null);

  // Green flash animation refs
  const saveFlash = useRef(new Animated.Value(0)).current;
  const copyFlash = useRef(new Animated.Value(0)).current;

  const isDarkMode =
    themeMode === 'dark' || (themeMode === 'auto' && colorScheme === 'dark');

  const remainingParaphrases = paraphrasesLimit - paraphrasesUsed;
  const canParaphrase = tier === 'pro' || remainingParaphrases > 0;

  // Auto-save on text change
  useEffect(() => {
    if (id) {
      const fullContent = title + '\n' + body;
      if (fullContent !== note?.content) {
        const timeout = setTimeout(() => {
          updateNote(id, { content: fullContent });
        }, 500);
        return () => clearTimeout(timeout);
      }
    }
  }, [title, body, id]);

  // Date formatting
  const createdDate = note?.createdAt
    ? new Date(note.createdAt).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }) +
      ' г. в ' +
      new Date(note.createdAt).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const handleGenerate = async () => {
    const textToProcess = body.trim();
    if (!textToProcess) {
      setError('Введите текст для генерации');
      return;
    }

    if (!canParaphrase) {
      setError('Лимит исчерпан. Перейдите на PRO');
      return;
    }

    setIsLoading(true);
    setError(null);
    Keyboard.dismiss();

    try {
      const response = await paraphraseText({
        text: textToProcess,
        mode: selectedMode,
        preserveEnglish: true,
      });

      setDiffSegments(response.diff || []);
      setGeneratedText(response.outputText);
      setOriginalBody(body);
      // Immediately replace the body with the generated text
      setBody(response.outputText);
      setShowDiff(true);
      incrementUsage();
      // Auto-save with new text
      if (id) {
        updateNote(id, { content: title + '\n' + response.outputText });
      }
    } catch (err: any) {
      console.error('Generate error:', err);
      setError(err.message || 'Ошибка генерации. Попробуйте снова.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = () => {
    // Body already contains the generated text — just clear diff state
    setShowDiff(false);
    setDiffSegments([]);
    setGeneratedText('');
    setOriginalBody('');
  };

  const handleReject = () => {
    // Restore original body text
    setBody(originalBody);
    if (id) {
      updateNote(id, { content: title + '\n' + originalBody });
    }
    setShowDiff(false);
    setDiffSegments([]);
    setGeneratedText('');
    setOriginalBody('');
  };

  const flashGreen = useCallback((anim: Animated.Value) => {
    anim.setValue(1);
    Animated.timing(anim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, []);

  const handleCopy = async () => {
    const fullText = (title + '\n' + body).trim();
    if (!fullText) return;
    await Clipboard.setStringAsync(fullText);
    flashGreen(copyFlash);
  };

  const handleSave = () => {
    Keyboard.dismiss();
    if (id) {
      updateNote(id, { content: title + '\n' + body });
    }
    flashGreen(saveFlash);
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const handleTitleChange = (text: string) => {
    // If user presses Enter inside the title, jump to body instead
    if (text.includes('\n')) {
      setTitle(text.replace(/\n/g, ''));
      bodyInputRef.current?.focus();
      return;
    }
    setTitle(text);
  };

  const handleTitleSubmit = () => {
    bodyInputRef.current?.focus();
  };

  // Render diff inline
  const renderDiff = () => {
    if (!diffSegments || diffSegments.length === 0) {
      // Fallback: show generated text as single insert
      return (
        <Text
          style={[
            styles.diffText,
            { color: isDarkMode ? colors.text.primary : '#000000' },
          ]}
        >
          {generatedText}
        </Text>
      );
    }

    return (
      <Text
        style={[
          styles.diffText,
          { color: isDarkMode ? colors.text.primary : '#000000' },
        ]}
      >
        {diffSegments.map((seg, i) => {
          if (seg.type === 'equal') {
            return <Text key={i}>{seg.text}</Text>;
          }
          if (seg.type === 'delete') {
            return (
              <Text
                key={i}
                style={{
                  backgroundColor: colors.diff.deletedBackground,
                  color: colors.diff.deleted,
                  textDecorationLine: 'line-through',
                }}
              >
                {seg.text}
              </Text>
            );
          }
          if (seg.type === 'insert') {
            return (
              <Text
                key={i}
                style={{
                  backgroundColor: colors.diff.insertedBackground,
                  color: colors.diff.inserted,
                }}
              >
                {seg.text}
              </Text>
            );
          }
          return null;
        })}
      </Text>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: isDarkMode ? colors.background.primary : '#FFFFFF' },
        ]}
      >
        {/* Custom top nav bar */}
        <View style={styles.topNav}>
          <TouchableOpacity
            style={[
              styles.navButtonCircle,
              { backgroundColor: isDarkMode ? colors.background.secondary : '#F0F0F0' },
            ]}
            onPress={() => router.back()}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={isDarkMode ? colors.text.primary : '#000000'}
            />
          </TouchableOpacity>

          <Text
            style={[
              styles.navTitle,
              { color: isDarkMode ? colors.text.primary : '#000000' },
            ]}
          >
            Reword AI
          </Text>

          <TouchableOpacity
            style={[styles.saveButton]}
            onPress={handleSave}
          >
            <Animated.View style={[
              styles.saveButtonInner,
              {
                backgroundColor: saveFlash.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['#F5A623', '#4CD964'],
                }),
              },
            ]}>
              <Ionicons name="checkmark" size={22} color="#FFFFFF" />
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* Date/time centered */}
        <Text
          style={[
            styles.dateHeader,
            { color: isDarkMode ? colors.text.tertiary : '#999999' },
          ]}
        >
          {createdDate}
        </Text>

        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <KeyboardAvoidingView
            style={styles.content}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            {/* Mode selector */}
            <View style={styles.modeSelectorWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.modeSelectorContent}
              >
                {PARAPHRASE_MODES.map((mode) => (
                  <TouchableOpacity
                    key={mode.id}
                    style={[
                      styles.modeChip,
                      {
                        backgroundColor:
                          selectedMode === mode.id
                            ? colors.accent.primary
                            : isDarkMode
                            ? colors.background.secondary
                            : '#F0F0F0',
                      },
                    ]}
                    onPress={() => setSelectedMode(mode.id)}
                  >
                    <Text
                      style={[
                        styles.modeLabel,
                        {
                          color:
                            selectedMode === mode.id
                              ? '#FFFFFF'
                              : isDarkMode
                              ? colors.text.primary
                              : '#333333',
                        },
                      ]}
                    >
                      {mode.emoji} {mode.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Error message */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Title + Body editor area */}
            <ScrollView
              style={styles.editorScroll}
              contentContainerStyle={styles.editorScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Title input - bold, large, wraps to multiple visual lines */}
              <TextInput
                ref={titleInputRef}
                style={[
                  styles.titleInput,
                  { color: isDarkMode ? colors.text.primary : '#000000' },
                ]}
                placeholder="Заголовок"
                placeholderTextColor={isDarkMode ? colors.text.tertiary : '#999999'}
                value={title}
                onChangeText={handleTitleChange}
                onSubmitEditing={handleTitleSubmit}
                blurOnSubmit={false}
                multiline
                scrollEnabled={false}
                editable={!showDiff}
              />

              {/* Body: show diff or editable text */}
              {showDiff ? (
                <View style={styles.diffContainer}>
                  {renderDiff()}
                </View>
              ) : (
                <TextInput
                  ref={bodyInputRef}
                  style={[
                    styles.bodyInput,
                    { color: isDarkMode ? colors.text.primary : '#000000' },
                  ]}
                  placeholder="Начните писать здесь..."
                  placeholderTextColor={isDarkMode ? colors.text.tertiary : '#999999'}
                  multiline
                  textAlignVertical="top"
                  value={body}
                  onChangeText={setBody}
                />
              )}
            </ScrollView>

            {/* Bottom action buttons */}
            <View style={styles.buttonContainer}>
              {showDiff ? (
                <>
                  {/* Reject (red) */}
                  <TouchableOpacity
                    style={[styles.rejectButton]}
                    onPress={handleReject}
                  >
                    <Ionicons name="close-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.rejectButtonText}>Отклонить</Text>
                  </TouchableOpacity>

                  {/* Accept (green) */}
                  <TouchableOpacity
                    style={[styles.acceptButton]}
                    onPress={handleAccept}
                  >
                    <Ionicons name="checkmark-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.acceptButtonText}>Принять</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* Copy */}
                  <TouchableOpacity
                    style={[styles.copyButtonTouchable]}
                    onPress={handleCopy}
                  >
                    <Animated.View
                      style={[
                        styles.copyButton,
                        {
                          backgroundColor: copyFlash.interpolate({
                            inputRange: [0, 1],
                            outputRange: [
                              isDarkMode
                                ? colors.background.tertiary
                                : '#E8E8E8',
                              'rgba(76, 217, 100, 0.3)',
                            ],
                          }),
                        },
                      ]}
                    >
                      <Ionicons
                        name="copy-outline"
                        size={18}
                        color={isDarkMode ? colors.text.primary : '#333333'}
                      />
                      <Text
                        style={[
                          styles.copyButtonText,
                          { color: isDarkMode ? colors.text.primary : '#333333' },
                        ]}
                      >
                        Скопировать
                      </Text>
                    </Animated.View>
                  </TouchableOpacity>

                  {/* Generate */}
                  <TouchableOpacity
                    style={[
                      styles.generateButton,
                      {
                        backgroundColor: canParaphrase
                          ? colors.accent.primary
                          : colors.text.tertiary,
                        opacity: isLoading ? 0.7 : 1,
                      },
                    ]}
                    onPress={handleGenerate}
                    disabled={isLoading || !canParaphrase}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                        <Text style={styles.generateButtonText}>Генерация</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    </>
  );
}

const SCREEN_WIDTH = Dimensions.get('window').width;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Top navigation
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  navButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  saveButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5A623',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Date header
  dateHeader: {
    textAlign: 'center',
    fontSize: 13,
    marginBottom: spacing.md,
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },

  // Mode selector
  modeSelectorWrapper: {
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  modeSelectorContent: {
    paddingRight: spacing.md,
    gap: spacing.sm,
  },
  modeChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: 20,
  },
  modeLabel: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Error
  errorContainer: {
    backgroundColor: 'rgba(227, 90, 90, 0.1)',
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: 13,
    color: colors.status.error,
    textAlign: 'center',
  },

  // Editor scroll
  editorScroll: {
    flex: 1,
  },
  editorScrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.lg,
  },

  // Title input (bold, large)
  titleInput: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
    paddingVertical: spacing.sm,
    minHeight: 42,
  },

  // Body input
  bodyInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    paddingVertical: spacing.sm,
    minHeight: 200,
    textAlignVertical: 'top',
  },

  // Diff container
  diffContainer: {
    paddingVertical: spacing.sm,
    minHeight: 200,
  },
  diffText: {
    fontSize: 16,
    lineHeight: 24,
  },

  // Bottom buttons
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },

  // Copy button
  copyButtonTouchable: {
    flex: 1,
  },
  copyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 14,
    gap: spacing.sm,
  },
  copyButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Generate button
  generateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 14,
    gap: spacing.sm,
  },
  generateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Accept button (green)
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 14,
    gap: spacing.sm,
    backgroundColor: colors.status.success,
  },
  acceptButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Reject button (red)
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 14,
    gap: spacing.sm,
    backgroundColor: colors.status.error,
  },
  rejectButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

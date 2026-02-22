/**
 * Home Screen - Notes List
 * Displays all created notes with ability to create new ones
 * Redesigned with Grammarly-inspired Write/Import buttons and merged PRO+Quota banner
 */

import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated as RNAnimated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useNotesStore, Note } from '@/stores/useNotesStore';
import { useSubscriptionStore } from '@/stores/useSubscriptionStore';
import { colors, spacing } from '@/theme';
import { useRef, useEffect, useCallback } from 'react';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_GAP = spacing.md;
const CARD_WIDTH = (SCREEN_W - spacing.lg * 2 - CARD_GAP) / 2;

function NoteCard({ 
  note, 
  isDarkMode, 
  onPress,
  onDelete,
  index,
}: { 
  note: Note; 
  isDarkMode: boolean;
  onPress: () => void;
  onDelete: () => void;
  index: number;
}) {
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;

  // Staggered fade-in on mount
  useEffect(() => {
    RNAnimated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      delay: index * 50,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressIn = useCallback(() => {
    RNAnimated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressOut = useCallback(() => {
    RNAnimated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  }, []);
  const content = note.content ?? '';
  const previewText = content.length > 100 
    ? content.substring(0, 100) + '...' 
    : content;

  const handleLongPress = () => {
    Alert.alert(
      'Удалить заметку?',
      `"${note.title}"`,
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Удалить', style: 'destructive', onPress: onDelete },
      ]
    );
  };

  return (
    <RNAnimated.View style={{ width: CARD_WIDTH, transform: [{ scale: scaleAnim }], opacity: fadeAnim }}>
      <TouchableOpacity
        style={[
          styles.noteCard,
          {
            backgroundColor: isDarkMode ? colors.background.secondary : '#FFFFFF',
            shadowColor: isDarkMode ? '#000' : '#888',
          },
        ]}
        onPress={onPress}
        onLongPress={handleLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
      <Text 
        style={[
          styles.noteTitle,
          { color: isDarkMode ? colors.text.primary : '#1A1A1A' },
        ]}
        numberOfLines={2}
      >
        {note.title ?? 'Без названия'}
      </Text>
      <Text 
        style={[
          styles.notePreview,
          { color: isDarkMode ? colors.text.secondary : '#666666' },
        ]}
        numberOfLines={4}
      >
        {previewText || 'Пустая заметка'}
      </Text>
      <Text style={[styles.noteDate, { color: isDarkMode ? colors.text.tertiary : '#999' }]}>
        {new Date(note.updatedAt).toLocaleDateString('ru-RU', { 
          day: 'numeric', 
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </TouchableOpacity>
    </RNAnimated.View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { notes, deleteNote, addNote } = useNotesStore();
  const { tier, paraphrasesUsed, paraphrasesLimit } = useSubscriptionStore();

  const isDarkMode =
    themeMode === 'dark' || (themeMode === 'auto' && colorScheme === 'dark');

  /**
   * Russian plural for "заметка":
   * 1, 21, 31…  → заметка
   * 2-4, 22-24… → заметки
   * 5-20, 25-30 → заметок
   */
  const pluralizeNotes = (n: number): string => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return `${n} заметка`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} заметки`;
    return `${n} заметок`;
  };

  const handleCreateNote = () => {
    const newNote = addNote('', 'Новая заметка');
    router.push({ pathname: '/editor/[id]', params: { id: newNote.id } });
  };

  const handleOpenNote = (noteId: string) => {
    router.push({ pathname: '/editor/[id]', params: { id: noteId } });
  };

  const remaining = paraphrasesLimit - paraphrasesUsed;

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDarkMode ? colors.background.primary : '#F5F5F7' },
      ]}
    >
      {/* Header with branding */}
      <View style={styles.header}>
        <View style={styles.brandContainer}>
          <Text style={styles.brandEmoji}>✨</Text>
          <Text style={[styles.brandText, { color: isDarkMode ? colors.text.primary : '#1A1A1A' }]}>
            Reword AI
          </Text>
        </View>
        {tier !== 'pro' && (
          <TouchableOpacity 
            style={styles.upgradeButton}
            onPress={() => router.push('/subscription')}
          >
            <Text style={styles.upgradeButtonText}>PRO</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Merged PRO banner + Quota container */}
      {tier !== 'pro' && (
        <TouchableOpacity
          style={[
            styles.mergedProCard,
            { backgroundColor: isDarkMode ? colors.background.secondary : '#FFFFFF' },
          ]}
          onPress={() => router.push('/subscription')}
          activeOpacity={0.85}
        >
          {/* PRO banner section */}
          <View style={styles.proSection}>
            <View style={styles.proIconContainer}>
              <Ionicons name="diamond" size={28} color={colors.accent.primary} />
            </View>
            <View style={styles.proTextContainer}>
              <Text style={[styles.proTitle, { color: isDarkMode ? '#FFFFFF' : '#1A1A1A' }]}>
                Попробуйте PRO бесплатно
              </Text>
              <Text style={[styles.proSubtitle, { color: isDarkMode ? colors.text.secondary : '#888' }]}>
                7 дней безлимитных генераций
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={isDarkMode ? colors.text.tertiary : '#CCC'} />
          </View>

          {/* Thin separator */}
          <View style={[styles.proSeparator, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

          {/* Quota section */}
          <View style={styles.quotaSection}>
            <Ionicons name="sparkles-outline" size={16} color={isDarkMode ? colors.text.tertiary : '#999'} />
            <Text style={[styles.quotaText, { color: isDarkMode ? colors.text.secondary : '#666' }]}>
              Осталось генераций: {remaining} из {paraphrasesLimit}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* PRO user status */}
      {tier === 'pro' && (
        <View style={[styles.proActiveCard, { backgroundColor: isDarkMode ? colors.background.secondary : '#FFFFFF' }]}>
          <Ionicons name="checkmark-circle" size={18} color={colors.status.success} />
          <Text style={[styles.proActiveText, { color: isDarkMode ? colors.text.secondary : '#666' }]}>
            PRO — Безлимитные генерации
          </Text>
        </View>
      )}

      {/* Section title with create button */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? colors.text.primary : '#1A1A1A' }]}>
            Заметки
          </Text>
          <Text style={[styles.sectionCount, { color: isDarkMode ? colors.text.tertiary : '#999' }]}>
            {pluralizeNotes(notes.length)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCreateNote}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Notes grid */}
      <ScrollView 
        style={styles.notesContainer}
        contentContainerStyle={styles.notesGrid}
        showsVerticalScrollIndicator={false}
      >
        {notes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📝</Text>
            <Text style={[styles.emptyTitle, { color: isDarkMode ? colors.text.primary : '#1A1A1A' }]}>
              Нет заметок
            </Text>
            <Text style={[styles.emptySubtitle, { color: isDarkMode ? colors.text.secondary : '#666' }]}>
              Создайте первую заметку, чтобы начать
            </Text>
          </View>
        ) : (
          <View style={styles.notesRow}>
            {notes.map((note, index) => (
              <NoteCard
                key={note.id}
                note={note}
                isDarkMode={isDarkMode}
                onPress={() => handleOpenNote(note.id)}
                onDelete={() => deleteNote(note.id)}
                index={index}
              />
            ))}
          </View>
        )}
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandEmoji: {
    fontSize: 28,
  },
  brandText: {
    fontSize: 22,
    fontWeight: '700',
  },
  upgradeButton: {
    backgroundColor: colors.accent.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },

  // Merged PRO + Quota card
  mergedProCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  proSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    paddingVertical: 18,
    gap: spacing.md,
  },
  proIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(155, 109, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proTextContainer: {
    flex: 1,
    gap: 2,
  },
  proTitle: {
    fontWeight: '600',
    fontSize: 15,
  },
  proSubtitle: {
    fontSize: 13,
  },
  proSeparator: {
    height: 1,
    marginHorizontal: spacing.md,
  },
  quotaSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  quotaText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // PRO active
  proActiveCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: 6,
  },
  proActiveText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  sectionCount: {
    fontSize: 14,
    marginTop: 2,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Notes
  notesContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  notesGrid: {
    paddingBottom: 90,
  },
  notesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  noteCard: {
    width: '100%',
    padding: spacing.md,
    borderRadius: 12,
    minHeight: 150,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  notePreview: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  noteDate: {
    fontSize: 11,
    marginTop: spacing.sm,
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
  },

});

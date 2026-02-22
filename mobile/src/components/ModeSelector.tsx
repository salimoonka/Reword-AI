/**
 * ModeChip Component - Paraphrase mode selector
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ScrollView,
  View,
} from 'react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

export type ParaphraseMode =
  | 'shorten'
  | 'expand'
  | 'formal'
  | 'friendly'
  | 'confident'
  | 'professional'
  | 'colloquial'
  | 'empathetic';

interface ModeChipProps {
  mode: ParaphraseMode;
  selected: boolean;
  onSelect: (mode: ParaphraseMode) => void;
}

const MODE_LABELS: Record<ParaphraseMode, string> = {
  shorten: 'Короче',
  expand: 'Подробнее',
  formal: 'Формально',
  friendly: 'Дружелюбно',
  confident: 'Уверенно',
  professional: 'Профессионально',
  colloquial: 'Разговорно',
  empathetic: 'Эмпатично',
};

const MODE_EMOJI: Record<ParaphraseMode, string> = {
  shorten: '📝',
  expand: '📖',
  formal: '👔',
  friendly: '😊',
  confident: '💪',
  professional: '💼',
  colloquial: '💬',
  empathetic: '❤️',
};

export const ModeChip: React.FC<ModeChipProps> = ({
  mode,
  selected,
  onSelect,
}) => {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={() => onSelect(mode)}
      activeOpacity={0.7}
    >
      <Text style={styles.emoji}>{MODE_EMOJI[mode]}</Text>
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {MODE_LABELS[mode]}
      </Text>
    </TouchableOpacity>
  );
};

interface ModeSelectorProps {
  selected: ParaphraseMode;
  onSelect: (mode: ParaphraseMode) => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  selected,
  onSelect,
}) => {
  const modes: ParaphraseMode[] = [
    'shorten',
    'expand',
    'formal',
    'friendly',
    'confident',
    'professional',
    'colloquial',
    'empathetic',
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Выберите стиль</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {modes.map((mode) => (
          <ModeChip
            key={mode}
            mode={mode}
            selected={selected === mode}
            onSelect={onSelect}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  title: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: spacing.lg,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  chipSelected: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  emoji: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  labelSelected: {
    color: colors.text.primary,
    fontWeight: '600',
  },
});

export default ModeSelector;

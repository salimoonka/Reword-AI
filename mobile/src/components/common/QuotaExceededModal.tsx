/**
 * Quota Exceeded Modal
 * Shows when user exceeds free paraphrase limit
 * Prompts to upgrade to PRO
 */

import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { router } from 'expo-router';
import { colors, spacing, typography } from '@/theme';

interface QuotaExceededModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export function QuotaExceededModal({ visible, onDismiss }: QuotaExceededModalProps) {
  const handleUpgrade = () => {
    onDismiss();
    router.push('/subscription');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.modal}>
              <Text style={styles.icon}>⚠️</Text>
              <Text style={styles.title}>Лимит исчерпан</Text>
              <Text style={styles.description}>
                Вы использовали все бесплатные перефразирования за сегодня.
              </Text>

              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={handleUpgrade}
                activeOpacity={0.8}
              >
                <Text style={styles.upgradeButtonText}>Оформить PRO</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dismissButton}
                onPress={onDismiss}
              >
                <Text style={styles.dismissButtonText}>Может позже</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#2D2D2D',
    borderRadius: 20,
    padding: 24,
    maxWidth: 320,
    width: '85%',
    alignItems: 'center',
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  upgradeButton: {
    backgroundColor: colors.accent.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  upgradeButtonText: {
    ...typography.button,
    color: colors.white,
  },
  dismissButton: {
    paddingVertical: spacing.sm,
  },
  dismissButtonText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
});

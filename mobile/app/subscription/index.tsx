/**
 * Subscription Plans Screen
 * Modern glassmorphism PRO subscription page with back navigation
 */

import { router } from 'expo-router';
import SubscriptionContent from '@/components/SubscriptionContent';

export default function SubscriptionScreen() {
  return <SubscriptionContent variant="modal" onBack={() => router.back()} />;
}

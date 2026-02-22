/**
 * Tests for QuotaExceededModal component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { QuotaExceededModal } from '@/components/common/QuotaExceededModal';
import { router } from 'expo-router';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

describe('QuotaExceededModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render modal content when visible', () => {
    render(
      <QuotaExceededModal visible={true} onDismiss={() => {}} />
    );

    expect(screen.getByText('Лимит исчерпан')).toBeTruthy();
    expect(screen.getByText('Оформить PRO')).toBeTruthy();
    expect(screen.getByText('Может позже')).toBeTruthy();
  });

  it('should call onDismiss when "Может позже" is pressed', () => {
    const onDismiss = jest.fn();
    render(
      <QuotaExceededModal visible={true} onDismiss={onDismiss} />
    );

    fireEvent.press(screen.getByText('Может позже'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should navigate to subscription and dismiss when upgrade pressed', () => {
    const onDismiss = jest.fn();
    render(
      <QuotaExceededModal visible={true} onDismiss={onDismiss} />
    );

    fireEvent.press(screen.getByText('Оформить PRO'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/subscription');
  });

  it('should show description about used quota', () => {
    render(
      <QuotaExceededModal visible={true} onDismiss={() => {}} />
    );

    expect(
      screen.getByText('Вы использовали все бесплатные перефразирования за сегодня.')
    ).toBeTruthy();
  });
});

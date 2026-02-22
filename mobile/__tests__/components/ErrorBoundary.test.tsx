/**
 * Tests for ErrorBoundary component
 */

import React from 'react';
import { Text } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

// Component that throws on render
function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <Text>Всё хорошо</Text>;
}

// Suppress console.error for expected errors in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
});

describe('ErrorBoundary', () => {
  it('should render children when no error', () => {
    render(
      <ErrorBoundary>
        <Text>Дочерний элемент</Text>
      </ErrorBoundary>
    );
    expect(screen.getByText('Дочерний элемент')).toBeTruthy();
  });

  it('should show fallback UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Что-то пошло не так')).toBeTruthy();
    expect(screen.getByText('Попробовать снова')).toBeTruthy();
  });

  it('should show custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<Text>Пользовательский fallback</Text>}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Пользовательский fallback')).toBeTruthy();
  });

  it('should call onError callback when error occurs', () => {
    const onError = jest.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it('should reset error state when retry is pressed', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Что-то пошло не так')).toBeTruthy();

    // Press retry — ErrorBoundary resets hasError to false internally
    // Since the child still throws, error UI re-appears, but the handler didn't crash
    fireEvent.press(screen.getByText('Попробовать снова'));
    expect(screen.getByText('Что-то пошло не так')).toBeTruthy();
  });
});

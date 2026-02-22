/**
 * Tests for Button component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Button } from '@/components/Button';

describe('Button', () => {
  it('should render with title text', () => {
    render(<Button title="Нажми" onPress={() => {}} />);
    expect(screen.getByText('Нажми')).toBeTruthy();
  });

  it('should call onPress when pressed', () => {
    const onPress = jest.fn();
    render(<Button title="Кнопка" onPress={onPress} />);

    fireEvent.press(screen.getByText('Кнопка'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should not call onPress when disabled', () => {
    const onPress = jest.fn();
    render(<Button title="Выкл" onPress={onPress} disabled />);

    fireEvent.press(screen.getByText('Выкл'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('should show ActivityIndicator when loading', () => {
    render(<Button title="Загрузка" onPress={() => {}} loading />);
    // When loading, title text should not be visible
    expect(screen.queryByText('Загрузка')).toBeNull();
  });

  it('should not call onPress when loading', () => {
    const onPress = jest.fn();
    const { root } = render(
      <Button title="Загрузка" onPress={onPress} loading />
    );

    fireEvent.press(root);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('should render with different variants', () => {
    const { rerender } = render(
      <Button title="Primary" onPress={() => {}} variant="primary" />
    );
    expect(screen.getByText('Primary')).toBeTruthy();

    rerender(
      <Button title="Secondary" onPress={() => {}} variant="secondary" />
    );
    expect(screen.getByText('Secondary')).toBeTruthy();

    rerender(
      <Button title="Ghost" onPress={() => {}} variant="ghost" />
    );
    expect(screen.getByText('Ghost')).toBeTruthy();
  });

  it('should render with different sizes', () => {
    const { rerender } = render(
      <Button title="Small" onPress={() => {}} size="small" />
    );
    expect(screen.getByText('Small')).toBeTruthy();

    rerender(
      <Button title="Large" onPress={() => {}} size="large" />
    );
    expect(screen.getByText('Large')).toBeTruthy();
  });
});

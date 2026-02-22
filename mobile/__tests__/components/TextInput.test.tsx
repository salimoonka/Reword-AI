/**
 * Tests for TextInput component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { TextInput } from '@/components/TextInput';

describe('TextInput', () => {
  it('should render with label', () => {
    render(<TextInput label="Имя" />);
    expect(screen.getByText('Имя')).toBeTruthy();
  });

  it('should render without label', () => {
    const { root } = render(<TextInput placeholder="Введите текст" />);
    expect(root).toBeTruthy();
    expect(screen.queryByText('Имя')).toBeNull();
  });

  it('should display error message', () => {
    render(<TextInput label="Email" error="Неверный формат" />);
    expect(screen.getByText('Неверный формат')).toBeTruthy();
  });

  it('should not display error when none provided', () => {
    render(<TextInput label="Email" />);
    expect(screen.queryByText('Неверный формат')).toBeNull();
  });

  it('should call onChangeText when text changes', () => {
    const onChangeText = jest.fn();
    render(
      <TextInput
        label="Текст"
        onChangeText={onChangeText}
        testID="text-input"
      />
    );

    fireEvent.changeText(screen.getByTestId('text-input'), 'Привет');
    expect(onChangeText).toHaveBeenCalledWith('Привет');
  });

  it('should show placeholder text', () => {
    render(
      <TextInput placeholder="Введите здесь..." testID="input" />
    );
    expect(screen.getByTestId('input').props.placeholder).toBe('Введите здесь...');
  });
});

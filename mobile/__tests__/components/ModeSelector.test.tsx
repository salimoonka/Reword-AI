/**
 * Tests for ModeSelector component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ModeSelector, ModeChip, ParaphraseMode } from '@/components/ModeSelector';

describe('ModeChip', () => {
  it('should render mode label', () => {
    const onSelect = jest.fn();
    render(
      <ModeChip mode="formal" selected={false} onSelect={onSelect} />
    );
    expect(screen.getByText('Формально')).toBeTruthy();
  });

  it('should render emoji', () => {
    const onSelect = jest.fn();
    render(
      <ModeChip mode="friendly" selected={false} onSelect={onSelect} />
    );
    expect(screen.getByText('😊')).toBeTruthy();
  });

  it('should call onSelect with mode when pressed', () => {
    const onSelect = jest.fn();
    render(
      <ModeChip mode="shorten" selected={false} onSelect={onSelect} />
    );

    fireEvent.press(screen.getByText('Короче'));
    expect(onSelect).toHaveBeenCalledWith('shorten');
  });
});

describe('ModeSelector', () => {
  it('should render title', () => {
    render(
      <ModeSelector selected="formal" onSelect={() => {}} />
    );
    expect(screen.getByText('Выберите стиль')).toBeTruthy();
  });

  it('should render all 8 mode chips', () => {
    render(
      <ModeSelector selected="formal" onSelect={() => {}} />
    );

    const labels = [
      'Короче', 'Подробнее', 'Формально', 'Дружелюбно',
      'Уверенно', 'Профессионально', 'Разговорно', 'Эмпатично',
    ];
    labels.forEach((label) => {
      expect(screen.getByText(label)).toBeTruthy();
    });
  });

  it('should call onSelect when a mode is pressed', () => {
    const onSelect = jest.fn();
    render(
      <ModeSelector selected="formal" onSelect={onSelect} />
    );

    fireEvent.press(screen.getByText('Дружелюбно'));
    expect(onSelect).toHaveBeenCalledWith('friendly');
  });

  it('should render emojis for all modes', () => {
    render(
      <ModeSelector selected="formal" onSelect={() => {}} />
    );

    const emojis = ['📝', '📖', '👔', '😊', '💪', '💼', '💬', '❤️'];
    emojis.forEach((emoji) => {
      expect(screen.getByText(emoji)).toBeTruthy();
    });
  });
});

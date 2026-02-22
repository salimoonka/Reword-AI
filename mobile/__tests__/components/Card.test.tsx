/**
 * Tests for Card component
 */

import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { Card } from '@/components/Card';

describe('Card', () => {
  it('should render children', () => {
    render(
      <Card>
        <Text>Содержимое</Text>
      </Card>
    );
    expect(screen.getByText('Содержимое')).toBeTruthy();
  });

  it('should render with default variant', () => {
    const { root } = render(
      <Card>
        <Text>Default</Text>
      </Card>
    );
    expect(root).toBeTruthy();
  });

  it('should render with elevated variant', () => {
    const { root } = render(
      <Card variant="elevated">
        <Text>Elevated</Text>
      </Card>
    );
    expect(root).toBeTruthy();
  });

  it('should accept custom styles', () => {
    const { root } = render(
      <Card style={{ backgroundColor: 'red' }}>
        <Text>Styled</Text>
      </Card>
    );
    expect(root).toBeTruthy();
  });
});

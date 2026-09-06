import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../components/primitives/Button';
import { Text } from '../components/primitives/Text';
import { Badge } from '../components/primitives/Badge';

describe('Design System Primitives & Accessibility', () => {
  it('renders Button with accessibility role and fires onPress event', () => {
    const onPressMock = jest.fn();
    const { getByRole, getByText } = render(
      <Button title="Book Session" onPress={onPressMock} variant="primary" />
    );

    const button = getByRole('button');
    expect(button).toBeTruthy();
    expect(getByText('Book Session')).toBeTruthy();

    fireEvent.press(button);
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('renders Text with scalable properties and correct content', () => {
    const { getByText } = render(<Text variant="h1">Bench Press 100kg</Text>);
    expect(getByText('Bench Press 100kg')).toBeTruthy();
  });

  it('renders Badge with accessibility status and variant', () => {
    const { getByText } = render(<Badge label="ACTIVE MEMBER" variant="success" />);
    expect(getByText('ACTIVE MEMBER')).toBeTruthy();
  });
});

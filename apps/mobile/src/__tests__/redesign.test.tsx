import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  Icon,
  MetricCard,
  ProgressRing,
  Tabs,
  Badge,
  Button,
} from '../components/primitives';

describe('FitCore Redesigned Design System & UI Components', () => {
  it('renders Icon vector glyphs correctly', () => {
    const { toJSON } = render(
      <>
        <Icon name="sparkles" size={24} color="#8B5CF6" />
        <Icon name="dumbbell" size={24} color="#E63946" />
        <Icon name="qr" size={24} color="#0EA5E9" />
        <Icon name="flame" size={24} color="#FB923C" />
      </>,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders MetricCard with KPI value, label, and trend', () => {
    const { getByText } = render(
      <MetricCard
        label="WEEKLY TONNAGE"
        value="24.8"
        unit="tonnes"
        change="+14.2%"
        trend="up"
        icon="dumbbell"
      />,
    );

    expect(getByText('WEEKLY TONNAGE')).toBeTruthy();
    expect(getByText('24.8')).toBeTruthy();
    expect(getByText('tonnes')).toBeTruthy();
    expect(getByText('↑ +14.2%')).toBeTruthy();
  });

  it('renders ProgressRing with percentage and label', () => {
    const { getByText } = render(
      <ProgressRing progress={88} valueText="88%" label="READY" />,
    );

    expect(getByText('88%')).toBeTruthy();
    expect(getByText('READY')).toBeTruthy();
  });

  it('renders Tabs and fires onTabChange when pressed', () => {
    const onTabChangeMock = jest.fn();
    const tabs = [
      { id: 'tab1', label: 'Volume' },
      { id: 'tab2', label: 'Strength' },
    ];

    const { getByText } = render(
      <Tabs tabs={tabs} activeTab="tab1" onTabChange={onTabChangeMock} />,
    );

    const strengthTab = getByText('Strength');
    expect(strengthTab).toBeTruthy();

    fireEvent.press(strengthTab);
    expect(onTabChangeMock).toHaveBeenCalledWith('tab2');
  });

  it('renders Button with AI and Accent variants', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <>
        <Button title="FitCore AI Insight" onPress={onPress} variant="ai" />
        <Button title="Book Class Now" onPress={onPress} variant="accent" />
      </>,
    );

    expect(getByText('FitCore AI Insight')).toBeTruthy();
    expect(getByText('Book Class Now')).toBeTruthy();
  });

  it('renders Badge with AI and Accent variants', () => {
    const { getByText } = render(
      <>
        <Badge label="AI OPTIMIZED" variant="ai" />
        <Badge label="PEAK LOAD" variant="accent" />
      </>,
    );

    expect(getByText('AI OPTIMIZED')).toBeTruthy();
    expect(getByText('PEAK LOAD')).toBeTruthy();
  });
});

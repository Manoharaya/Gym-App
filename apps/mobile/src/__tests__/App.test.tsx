import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import App from '../app/App';

describe('FitCore Mobile Application Startup', () => {
  it('renders the initial technical verification shell without crashing', async () => {
    const { getByText } = render(<App />);

    await waitFor(() => {
      expect(getByText('FitCore')).toBeTruthy();
      expect(getByText('Platform Foundation')).toBeTruthy();
      expect(getByText('DEV SEED DATA')).toBeTruthy();
      expect(getByText('Second Wind Athletic Club')).toBeTruthy();
    });
  });
});

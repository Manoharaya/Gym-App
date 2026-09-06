// Jest setup for React Native & Expo
jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    getItemAsync: jest.fn(async (key) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key, value) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key) => {
      store.delete(key);
    }),
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1,
  };
});

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };

  const InsetsContext = React.createContext(insets);
  const FrameContext = React.createContext(frame);

  return {
    SafeAreaInsetsContext: InsetsContext,
    SafeAreaFrameContext: FrameContext,
    SafeAreaProvider: ({ children }) =>
      React.createElement(
        FrameContext.Provider,
        { value: frame },
        React.createElement(InsetsContext.Provider, { value: insets }, children)
      ),
    SafeAreaConsumer: ({ children }) => children(insets),
    SafeAreaView: ({ children, style, testID }) =>
      React.createElement(View, { style, testID }, children),
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
  };
});

module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules[\\\\/](?!(\\.pnpm[\\\\/])?((\\bjest-)?react-native|@react-native|@react-native-community|expo(nent)?|@expo(nent)?[\\\\/].*|@expo-google-fonts[\\\\/].*|react-navigation|@react-navigation[\\\\/].*|@unimodules[\\\\/].*|unimodules|sentry-expo|native-base|react-native-svg))',
  ],
  moduleNameMapper: {
    '\\.(png|jpg|jpeg|gif|svg|webp)$': '<rootDir>/__mocks__/fileMock.js',
  },
  setupFiles: ['./jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
};

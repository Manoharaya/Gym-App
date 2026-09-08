import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'FitCore',
  slug: 'fitcore',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './src/assets/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    image: './src/assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0D0F12',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.fitcore.app',
    infoPlist: {
      NSCameraUsageDescription:
        'FitCore uses your camera to scan membership QR codes and capture progress photos.',
      NSPhotoLibraryUsageDescription:
        'FitCore needs access to select progress photos and health documents.',
      NSHealthShareUsageDescription:
        'FitCore reads steps, heart rate, active calories, distance, and sleep from Apple Health to evaluate your training capacity and recovery.',
      NSHealthUpdateUsageDescription:
        'FitCore writes completed gym workout records and active energy data to Apple Health.',
      NSFaceIDUsageDescription:
        'FitCore uses Face ID to securely authenticate your session and protect sensitive health data.',
    },
    entitlements: {
      'com.apple.developer.healthkit': true,
      'com.apple.developer.healthkit.access': [],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './src/assets/adaptive-icon.png',
      backgroundColor: '#0D0F12',
    },
    package: 'com.fitcore.app',
    permissions: [
      'android.permission.CAMERA',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.VIBRATE',
      'android.permission.USE_BIOMETRIC',
      'android.permission.USE_FINGERPRINT',
      'android.permission.health.READ_STEPS',
      'android.permission.health.READ_DISTANCE',
      'android.permission.health.READ_TOTAL_CALORIES_BURNED',
      'android.permission.health.READ_HEART_RATE',
      'android.permission.health.READ_RESTING_HEART_RATE',
      'android.permission.health.READ_SLEEP',
      'android.permission.health.READ_EXERCISE',
    ],
  },
  plugins: ['expo-secure-store'],
  extra: {
    eas: {
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || 'fitcore-mobile-core',
    },
  },
});

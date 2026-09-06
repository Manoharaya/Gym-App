import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { themeColors, typography, spacing } from '../theme';
import { Button } from '../components/primitives/Button';
import { logger } from '../services/logging';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('Uncaught component error in React tree', error, {
      componentStack: errorInfo.componentStack ?? undefined,
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>!</Text>
            </View>
            <Text style={styles.title}>Application Error</Text>
            <Text style={styles.message}>
              FitCore encountered an unexpected issue. Please try restarting the screen.
            </Text>
            <Button
              title="Reload Screen"
              onPress={this.handleReset}
              variant="primary"
              style={styles.button}
            />
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: themeColors.cardBackground,
    borderRadius: 16,
    padding: spacing[6],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: themeColors.dangerBackground,
    borderWidth: 1,
    borderColor: themeColors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  iconText: {
    ...typography.h3,
    color: themeColors.danger,
    fontWeight: '800',
  },
  title: {
    ...typography.h3,
    color: themeColors.textPrimary,
    marginBottom: spacing[2],
  },
  message: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  button: {
    width: '100%',
  },
});

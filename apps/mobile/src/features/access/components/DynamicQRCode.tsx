import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { themeColors } from '../../../theme';

interface DynamicQRCodeProps {
  token?: string;
  displayIdentifier?: string;
  secondsRemaining: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const DynamicQRCode: React.FC<DynamicQRCodeProps> = ({
  token,
  displayIdentifier = 'Dynamic QR Pass',
  secondsRemaining,
  onRefresh,
  isRefreshing = false,
}) => {
  const maxTtl = 60;
  const progressPercent = Math.max(0, Math.min(100, (secondsRemaining / maxTtl) * 100));

  // Determine progress color based on remaining time
  const progressColor =
    secondsRemaining > 20 ? '#10B981' : secondsRemaining > 10 ? '#F59E0B' : '#EF4444';

  return (
    <View style={styles.container}>
      {/* High Contrast Scanner Surface */}
      <View style={styles.qrSurface}>
        {/* Outer Scanner Target Frame */}
        <View style={styles.targetFrame}>
          {/* Visual QR Pattern representation */}
          <View style={styles.qrMatrixContainer}>
            {/* Top-Left Finder */}
            <View style={[styles.finderCorner, styles.finderTopLeft]} />
            {/* Top-Right Finder */}
            <View style={[styles.finderCorner, styles.finderTopRight]} />
            {/* Bottom-Left Finder */}
            <View style={[styles.finderCorner, styles.finderBottomLeft]} />

            {/* Central Badge */}
            <View style={styles.qrCenterBadge}>
              <Text style={styles.qrBrandText}>FITCORE</Text>
            </View>

            {/* Simulated Data Matrix Cells */}
            <View style={styles.matrixRows}>
              <View style={styles.matrixRow}>
                <View style={styles.cellDark} />
                <View style={styles.cellLight} />
                <View style={styles.cellDark} />
                <View style={styles.cellDark} />
                <View style={styles.cellLight} />
                <View style={styles.cellDark} />
              </View>
              <View style={styles.matrixRow}>
                <View style={styles.cellLight} />
                <View style={styles.cellDark} />
                <View style={styles.cellLight} />
                <View style={styles.cellDark} />
                <View style={styles.cellDark} />
                <View style={styles.cellLight} />
              </View>
              <View style={styles.matrixRow}>
                <View style={styles.cellDark} />
                <View style={styles.cellDark} />
                <View style={styles.cellLight} />
                <View style={styles.cellLight} />
                <View style={styles.cellDark} />
                <View style={styles.cellDark} />
              </View>
            </View>
          </View>
        </View>

        {/* Security Watermark & Identifier */}
        <View style={styles.tokenMetaRow}>
          <Text style={styles.tokenLabel}>{displayIdentifier}</Text>
          <Text style={styles.securityHash}>
            {token ? `ID: ${token.slice(-8).toUpperCase()}` : 'Generating token...'}
          </Text>
        </View>
      </View>

      {/* Dynamic Rotation Countdown Progress */}
      <View style={styles.timerSection}>
        <View style={styles.timerHeader}>
          <Text style={styles.timerTitle}>Auto-refreshes in:</Text>
          <Text style={[styles.timerCountdown, { color: progressColor }]}>
            {secondsRemaining}s
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progressPercent}%`, backgroundColor: progressColor },
            ]}
          />
        </View>

        <Text style={styles.securityNote}>
          Single-use rotating token. Screenshots or replays will be denied by the turnstile.
        </Text>
      </View>

      {/* Manual Refresh Button */}
      {onRefresh && (
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={isRefreshing}
          activeOpacity={0.8}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.refreshButtonText}>Refresh Pass Now</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginVertical: 12,
    borderWidth: 1,
    borderColor: themeColors.inputBorder,
  },
  qrSurface: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    width: 240,
    height: 250,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  targetFrame: {
    width: 170,
    height: 170,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 12,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  qrMatrixContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  finderCorner: {
    width: 28,
    height: 28,
    borderWidth: 5,
    borderColor: '#000000',
    position: 'absolute',
  },
  finderTopLeft: {
    top: 2,
    left: 2,
  },
  finderTopRight: {
    top: 2,
    right: 2,
  },
  finderBottomLeft: {
    bottom: 2,
    left: 2,
  },
  qrCenterBadge: {
    backgroundColor: '#000000',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    zIndex: 10,
  },
  qrBrandText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  matrixRows: {
    position: 'absolute',
    width: '80%',
    height: '80%',
    justifyContent: 'space-around',
    opacity: 0.85,
  },
  matrixRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  cellDark: {
    width: 12,
    height: 12,
    backgroundColor: '#000000',
    borderRadius: 2,
  },
  cellLight: {
    width: 12,
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
  },
  tokenMetaRow: {
    marginTop: 14,
    alignItems: 'center',
  },
  tokenLabel: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '700',
  },
  securityHash: {
    color: '#6B7280',
    fontSize: 10,
    fontFamily: 'Courier',
    marginTop: 2,
  },
  timerSection: {
    width: '100%',
    marginTop: 20,
  },
  timerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  timerTitle: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  timerCountdown: {
    fontSize: 15,
    fontWeight: '700',
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: themeColors.elevatedBackground,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  securityNote: {
    color: '#6B7280',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 15,
  },
  refreshButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: themeColors.elevatedBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: themeColors.inputBorder,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { Colors, BorderRadius } from '../../constants/theme';

export interface SkeletonProps {
  width?: number | `${number}%` | 'auto';
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = BorderRadius.sm,
  style,
}) => {
  const [opacityAnim] = useState(() => new Animated.Value(0.4));

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.85,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacityAnim]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius,
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <View style={styles.cardSkeleton}>
      <View style={styles.headerRow}>
        <Skeleton width={44} height={44} borderRadius={10} />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Skeleton width="70%" height={16} />
          <Skeleton width="45%" height={12} style={{ marginTop: 6 }} />
        </View>
        <Skeleton width={20} height={20} borderRadius={4} />
      </View>
      <Skeleton width="92%" height={13} style={{ marginTop: 12 }} />
      <Skeleton width="65%" height={13} style={{ marginTop: 6 }} />
      <View style={styles.tagsRow}>
        <Skeleton width={75} height={24} borderRadius={12} />
        <Skeleton width={60} height={24} borderRadius={12} />
        <Skeleton width={80} height={24} borderRadius={12} />
      </View>
      <View style={styles.divider} />
      <View style={styles.gridRow}>
        <Skeleton width="45%" height={26} borderRadius={6} />
        <Skeleton width="45%" height={26} borderRadius={6} />
      </View>
      <View style={[styles.gridRow, { marginTop: 8 }]}>
        <Skeleton width="45%" height={26} borderRadius={6} />
        <Skeleton width="45%" height={26} borderRadius={6} />
      </View>
      <Skeleton width="100%" height={32} borderRadius={8} style={{ marginTop: 12 }} />
      <View style={styles.actionsRow}>
        <Skeleton width="80%" height={46} borderRadius={10} style={{ flex: 1 }} />
        <Skeleton width={46} height={46} borderRadius={10} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: Colors.skeleton,
  },
  cardSkeleton: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 14,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
});

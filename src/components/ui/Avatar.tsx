import React, { useState } from 'react';
import { View, Image, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Typography } from '../../constants/theme';

export interface AvatarProps {
  uri?: string;
  name?: string;
  size?: number;
  isOnline?: boolean;
  isVerified?: boolean;
  style?: ViewStyle;
}

export const Avatar: React.FC<AvatarProps> = ({
  uri,
  name = 'User',
  size = 40,
  isOnline = false,
  isVerified = false,
  style,
}) => {
  const [hasError, setHasError] = useState(false);

  const getInitials = (n: string): string => {
    const parts = n.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  return (
    <View style={[{ position: 'relative' }, style]}>
      <View style={containerStyle}>
        {uri && !hasError ? (
          <Image
            source={{ uri }}
            style={{ width: size, height: size }}
            onError={() => setHasError(true)}
          />
        ) : (
          <Text
            style={{
              color: Colors.textPrimary,
              fontSize: size * 0.38,
              fontWeight: Typography.bold,
            }}
          >
            {getInitials(name)}
          </Text>
        )}
      </View>

      {isOnline ? (
        <View
          style={[
            styles.onlineBadge,
            {
              width: Math.max(10, size * 0.25),
              height: Math.max(10, size * 0.25),
              borderRadius: Math.max(5, size * 0.125),
            },
          ]}
        />
      ) : null}

      {isVerified && !isOnline ? (
        <View
          style={[
            styles.verifiedBadge,
            {
              width: Math.max(12, size * 0.28),
              height: Math.max(12, size * 0.28),
              borderRadius: Math.max(6, size * 0.14),
            },
          ]}
        >
          <Text style={{ color: '#FFF', fontSize: 8, fontWeight: 'bold' }}>✓</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Colors.primary,
    borderWidth: 1.5,
    borderColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

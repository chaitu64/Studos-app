import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { Colors, BorderRadius, Shadows } from '../../constants/theme';

export interface CardProps extends TouchableOpacityProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'interactive' | 'outline';
  style?: StyleProp<ViewStyle>;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  style,
  onPress,
  ...rest
}) => {
  const getCardStyle = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: Colors.surfaceElevated,
          borderColor: Colors.borderLight,
          ...Shadows.subtle,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderColor: Colors.border,
        };
      default:
        return {
          backgroundColor: Colors.card,
          borderColor: Colors.cardBorder,
        };
    }
  };

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onPress}
        style={[styles.base, getCardStyle(), style]}
        {...rest}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.base, getCardStyle(), style]}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: 18,
  },
});

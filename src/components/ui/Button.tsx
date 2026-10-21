import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, BorderRadius, Typography } from '../../constants/theme';

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
  enableHaptic?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  enableHaptic = true,
  disabled,
  onPress,
  ...rest
}) => {
  const handlePress = (e: any) => {
    if (disabled || loading) return;
    if (enableHaptic) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // Haptics optional on web
      }
    }
    if (onPress) onPress(e);
  };

  const getContainerStyle = (): ViewStyle => {
    const base: ViewStyle = styles.base;
    let sizeStyle: ViewStyle = styles.sizeMd;
    if (size === 'sm') sizeStyle = styles.sizeSm;
    if (size === 'lg') sizeStyle = styles.sizeLg;

    let variantStyle: ViewStyle = styles.primary;
    if (variant === 'secondary') variantStyle = styles.secondary;
    if (variant === 'outline') variantStyle = styles.outline;
    if (variant === 'ghost') variantStyle = styles.ghost;
    if (variant === 'danger') variantStyle = styles.danger;

    const disabledStyle: ViewStyle = disabled ? styles.disabled : {};

    return { ...base, ...sizeStyle, ...variantStyle, ...disabledStyle, ...style };
  };

  const getTextStyle = (): TextStyle => {
    let sizeText: TextStyle = styles.textMd;
    if (size === 'sm') sizeText = styles.textSm;
    if (size === 'lg') sizeText = styles.textLg;

    let variantText: TextStyle = styles.textPrimary;
    if (variant === 'secondary') variantText = styles.textSecondary;
    if (variant === 'outline') variantText = styles.textOutline;
    if (variant === 'ghost') variantText = styles.textGhost;
    if (variant === 'danger') variantText = styles.textDanger;

    return { ...sizeText, ...variantText, ...textStyle };
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      activeOpacity={0.8}
      style={getContainerStyle()}
      onPress={handlePress}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? '#FFF' : Colors.primary}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' ? <>{icon}</> : null}
          <Text style={[getTextStyle(), icon && iconPosition === 'left' ? { marginLeft: 8 } : undefined, icon && iconPosition === 'right' ? { marginRight: 8 } : undefined]}>
            {title}
          </Text>
          {icon && iconPosition === 'right' ? <>{icon}</> : null}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
  },
  sizeSm: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  sizeMd: {
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  sizeLg: {
    paddingVertical: 15,
    paddingHorizontal: 24,
  },
  primary: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  secondary: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: Colors.error,
  },
  disabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  textSm: {
    fontSize: Typography.subhead,
    fontWeight: Typography.semiBold,
  },
  textMd: {
    fontSize: Typography.body,
    fontWeight: Typography.semiBold,
  },
  textLg: {
    fontSize: Typography.headline,
    fontWeight: Typography.bold,
  },
  textPrimary: {
    color: Colors.textOnPrimary,
  },
  textSecondary: {
    color: Colors.textPrimary,
  },
  textOutline: {
    color: Colors.primary,
  },
  textGhost: {
    color: Colors.textSecondary,
  },
  textDanger: {
    color: Colors.textOnPrimary,
  },
});

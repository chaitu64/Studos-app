import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Colors, BorderRadius, Typography } from '../../constants/theme';

export interface BadgeProps {
  label: string;
  variant?: 'primary' | 'cyan' | 'purple' | 'green' | 'amber' | 'neutral' | 'outline';
  size?: 'sm' | 'md';
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'md',
  style,
  textStyle,
  icon,
}) => {
  const getBadgeStyle = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: Colors.primarySubtle, borderColor: Colors.primaryBorder, borderWidth: 1 };
      case 'cyan':
        return { backgroundColor: Colors.accentCyanSubtle, borderColor: 'rgba(6, 182, 212, 0.3)', borderWidth: 1 };
      case 'purple':
        return { backgroundColor: Colors.accentPurpleSubtle, borderColor: 'rgba(139, 92, 246, 0.3)', borderWidth: 1 };
      case 'green':
        return { backgroundColor: Colors.accentGreenSubtle, borderColor: 'rgba(16, 185, 129, 0.3)', borderWidth: 1 };
      case 'amber':
        return { backgroundColor: Colors.accentAmberSubtle, borderColor: 'rgba(245, 158, 11, 0.3)', borderWidth: 1 };
      case 'outline':
        return { backgroundColor: 'transparent', borderColor: Colors.borderLight, borderWidth: 1 };
      default:
        return { backgroundColor: Colors.surfaceHighlight, borderColor: Colors.border, borderWidth: 1 };
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'primary':
        return Colors.primary;
      case 'cyan':
        return Colors.accentCyan;
      case 'purple':
        return Colors.accentPurple;
      case 'green':
        return Colors.accentGreen;
      case 'amber':
        return Colors.accentAmber;
      case 'outline':
        return Colors.textSecondary;
      default:
        return Colors.textSecondary;
    }
  };

  return (
    <View
      style={[
        styles.base,
        size === 'sm' ? styles.sizeSm : styles.sizeMd,
        getBadgeStyle(),
        style,
      ]}
    >
      {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
      <Text
        style={[
          styles.text,
          size === 'sm' ? styles.textSm : styles.textMd,
          { color: getTextColor() },
          textStyle,
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  sizeSm: {
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  sizeMd: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  iconContainer: {
    marginRight: 4,
  },
  text: {
    fontWeight: Typography.medium,
  },
  textSm: {
    fontSize: Typography.caption,
  },
  textMd: {
    fontSize: Typography.footnote,
  },
});

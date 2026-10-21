import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, BorderRadius, Typography } from '../../constants/theme';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  count?: number;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onPress,
  icon,
  style,
  textStyle,
  count,
}) => {
  const handlePress = () => {
    try {
      Haptics.selectionAsync();
    } catch {
      // Haptics optional on web
    }
    if (onPress) onPress();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      style={[
        styles.chip,
        selected ? styles.chipSelected : styles.chipUnselected,
        style,
      ]}
    >
      {icon ? <>{icon}</> : null}
      <Text
        style={[
          styles.text,
          selected ? styles.textSelected : styles.textUnselected,
          icon ? { marginLeft: 6 } : undefined,
          textStyle,
        ]}
      >
        {label}
      </Text>
      {typeof count === 'number' ? (
        <Text
          style={[
            styles.countText,
            selected ? styles.countSelected : styles.countUnselected,
          ]}
        >
          {count}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.full,
    marginRight: 8,
    borderWidth: 1,
  },
  chipUnselected: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.border,
  },
  chipSelected: {
    backgroundColor: Colors.primarySubtle,
    borderColor: Colors.primary,
  },
  text: {
    fontSize: Typography.subhead,
    fontWeight: Typography.medium,
  },
  textUnselected: {
    color: Colors.textSecondary,
  },
  textSelected: {
    color: Colors.primary,
    fontWeight: Typography.semiBold,
  },
  countText: {
    fontSize: Typography.caption,
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  countUnselected: {
    backgroundColor: Colors.surfaceHighlight,
    color: Colors.textMuted,
  },
  countSelected: {
    backgroundColor: Colors.primary,
    color: '#FFF',
    fontWeight: Typography.bold,
  },
});

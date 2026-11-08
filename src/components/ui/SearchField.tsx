import React from 'react';
import { Pressable, StyleSheet, TextInput, TextInputProps, View, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius, Colors, Spacing } from '../../constants/theme';

type Props = Pick<TextInputProps, 'value' | 'onChangeText' | 'placeholder' | 'returnKeyType' | 'onSubmitEditing' | 'autoCorrect' | 'autoFocus'> & {
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
};

export function SearchField({ accessibilityLabel, value, onChangeText, placeholder, style, ...inputProps }: Props) {
  return (
    <View style={[styles.container, style]}>
      <Ionicons name="search-outline" size={19} color={Colors.textMuted} />
      <TextInput
        {...inputProps}
        accessibilityLabel={accessibilityLabel}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textSubtle}
        style={styles.input}
        returnKeyType={inputProps.returnKeyType || 'search'}
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={() => onChangeText?.('')}
          hitSlop={8}
          style={styles.clear}
        >
          <Ionicons name="close-circle" size={19} color={Colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 11,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  clear: { minWidth: 32, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
});

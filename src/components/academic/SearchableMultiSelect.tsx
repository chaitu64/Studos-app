import React, { useMemo, useState } from 'react';
import { FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import { normalizeSelections, toggleSelection } from '../../data/profileOptions';

type Props = {
  label: string;
  values: string[];
  suggestions: string[];
  onChange: (values: string[]) => void;
};

export default function SearchableMultiSelect({ label, values, suggestions, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = useMemo(() => normalizeSelections(values), [values]);
  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase('en');
    return suggestions.filter((item) => !search || item.toLocaleLowerCase('en').includes(search)).slice(0, 50);
  }, [query, suggestions]);
  const customValue = query.trim().replace(/\s+/g, ' ');
  const hasMatch = suggestions.some((item) => item.toLocaleLowerCase('en') === customValue.toLocaleLowerCase('en'))
    || selected.some((item) => item.toLocaleLowerCase('en') === customValue.toLocaleLowerCase('en'));
  const close = () => { Keyboard.dismiss(); setOpen(false); setQuery(''); };
  const toggle = (item: string) => onChange(toggleSelection(selected, item));

  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.selectedValues}>
      {selected.map((item) => <View key={item.toLocaleLowerCase('en')} style={styles.chip}>
        <Text numberOfLines={1} style={styles.chipText}>{item}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${item}`} onPress={() => toggle(item)} hitSlop={7} style={styles.remove}>
          <Ionicons name="close" size={14} color={Colors.textMuted}/>
        </Pressable>
      </View>)}
    </View>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Add ${label.toLowerCase()}`} onPress={() => setOpen(true)} style={styles.trigger}>
      <Text style={styles.triggerText}>{selected.length ? `Add ${label.toLowerCase()}` : `Search or add ${label.toLowerCase()}`}</Text>
      <Ionicons name="chevron-down" size={18} color={Colors.textMuted}/>
    </TouchableOpacity>
    <Modal transparent visible={open} animationType="slide" onRequestClose={close} presentationStyle="overFullScreen">
      <View style={styles.modalRoot}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Close ${label} selector`} onPress={close} style={styles.scrim}/>
        <KeyboardAvoidingView style={styles.keyboardWrap} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>{label}</Text><TouchableOpacity accessibilityRole="button" onPress={close} style={styles.done}><Text style={styles.doneText}>Done</Text></TouchableOpacity></View>
          <TextInput accessibilityLabel={`Search ${label.toLowerCase()}`} autoFocus value={query} onChangeText={setQuery} placeholder={`Search ${label.toLowerCase()}`} placeholderTextColor={Colors.textSubtle} style={styles.search}/>
          <FlatList
            data={filtered}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            initialNumToRender={12}
            maxToRenderPerBatch={20}
            windowSize={7}
            style={styles.results}
            ListEmptyComponent={<Text style={styles.empty}>No matching suggestions</Text>}
            renderItem={({ item }) => {
              const isSelected = selected.some((value) => value.toLocaleLowerCase('en') === item.toLocaleLowerCase('en'));
              return <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: isSelected }} onPress={() => toggle(item)} style={styles.option}>
                <Text style={styles.optionText}>{item}</Text><Ionicons name={isSelected ? 'checkbox' : 'square-outline'} size={20} color={isSelected ? Colors.primary : Colors.textMuted}/>
              </TouchableOpacity>;
            }}
          />
          {customValue && !hasMatch ? <TouchableOpacity accessibilityRole="button" onPress={() => { toggle(customValue); setQuery(''); }} style={styles.custom}>
            <Ionicons name="add-circle-outline" size={18} color={Colors.primary}/><Text numberOfLines={1} style={styles.customText}>Add “{customValue}”</Text>
          </TouchableOpacity> : null}
        </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  field: { gap: 6 }, label: { color: Colors.textSecondary, fontSize: 12, fontWeight: Typography.semiBold },
  selectedValues: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { maxWidth: '100%', minHeight: 30, paddingLeft: 9, paddingRight: 5, borderRadius: 9, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, flexDirection: 'row', alignItems: 'center', gap: 4 },
  chipText: { maxWidth: 220, color: Colors.textSecondary, fontSize: 11 }, remove: { width: 22, height: 24, alignItems: 'center', justifyContent: 'center' },
  trigger: { height: 48, paddingHorizontal: 13, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  triggerText: { color: Colors.textMuted, fontSize: 13 }, modalRoot: { flex: 1, justifyContent: 'flex-end' }, scrim: { ...StyleSheet.absoluteFill, backgroundColor: Colors.overlay },
  keyboardWrap: { flex: 1, justifyContent: 'flex-end' }, sheet: { width: '100%', maxWidth: 560, maxHeight: '82%', minHeight: 260, alignSelf: 'center', paddingHorizontal: Spacing.lg, paddingTop: 12, paddingBottom: 18, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceElevated },
  sheetHeader: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }, sheetTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: Typography.bold },
  done: { minWidth: 48, minHeight: 42, alignItems: 'flex-end', justifyContent: 'center' }, doneText: { color: Colors.textSecondary, fontSize: 13, fontWeight: Typography.semiBold },
  search: { minHeight: 48, paddingHorizontal: 13, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: 11, backgroundColor: Colors.background, color: Colors.textPrimary, fontSize: 14 },
  results: { flexGrow: 0, flexShrink: 1, maxHeight: 350, marginTop: 7 }, option: { minHeight: 46, paddingHorizontal: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  optionText: { flex: 1, color: Colors.textPrimary, fontSize: 13 }, empty: { color: Colors.textMuted, fontSize: 12, paddingVertical: 16 }, custom: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border }, customText: { flex: 1, color: Colors.primary, fontSize: 13 },
});

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator, FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform,
  Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import { searchAcademicOptions, type AcademicOption } from '../../data/academicCatalog';

type SearchProvider = (query: string) => Promise<AcademicOption[]>;

type Props = {
  label: string;
  value: string;
  options: AcademicOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  allowCustom?: boolean;
  helperText?: string;
  error?: string;
  searchProvider?: SearchProvider;
  emptyMessage?: string;
};

const normalize = (value: string) => value.toLocaleLowerCase('en-IN').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

export default function SearchableSelect({
  label, value, options, onChange, placeholder = 'Select an option', allowCustom = false,
  helperText, error, searchProvider, emptyMessage = 'No matching options.',
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [remoteResult, setRemoteResult] = useState<{ query: string; options: AcademicOption[] } | null>(null);
  const [loadingQuery, setLoadingQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const requestId = useRef(0);
  const listRef = useRef<FlatList<AcademicOption>>(null);
  const remoteOptions = useMemo(() => remoteResult?.query === query.trim() ? remoteResult.options : [], [query, remoteResult]);
  const loading = Boolean(query.trim() && loadingQuery === query.trim());
  const availableOptions = [...options, ...remoteOptions];
  const selectedOption = availableOptions.find((option) => option.value === value)
    || availableOptions.find((option) => option.keywords?.some((keyword) => normalize(keyword) === normalize(value)));
  const isSelected = (option: AcademicOption) => normalize(option.value) === normalize(value)
    || Boolean(option.keywords?.some((keyword) => normalize(keyword) === normalize(value)));

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options.slice(0, 50);
    return searchAcademicOptions(options, query, 50);
  }, [options, query]);

  const visibleOptions = useMemo(() => {
    const merged = [...remoteOptions, ...filteredOptions];
    const seen = new Set<string>();
    return merged.filter((option) => {
      const key = normalize(option.value);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 50);
  }, [filteredOptions, remoteOptions]);

  useEffect(() => {
    if (!open || !searchProvider || !query.trim()) return;
    const currentRequest = ++requestId.current;
    const timer = setTimeout(() => {
      setLoadingQuery(query.trim());
      void searchProvider(query.trim()).then((result) => {
        if (requestId.current === currentRequest) setRemoteResult({ query: query.trim(), options: result.slice(0, 50) });
      }).catch(() => {
        if (requestId.current === currentRequest) setRemoteResult({ query: query.trim(), options: [] });
      }).finally(() => {
        if (requestId.current === currentRequest) setLoadingQuery('');
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [open, query, searchProvider]);

  const close = () => {
    Keyboard.dismiss();
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
  };

  const choose = (optionValue: string) => {
    onChange(optionValue);
    close();
  };

  const normalizedQuery = normalize(query);
  const exactMatch = visibleOptions.some((option) => normalize(option.value) === normalizedQuery || normalize(option.label) === normalizedQuery);
  const showManualChoice = allowCustom && query.trim().length > 0 && !exactMatch;
  const rowCount = visibleOptions.length + Number(showManualChoice);

  const onSearchKey = (key: string) => {
    if (key === 'ArrowDown') setActiveIndex((index) => {
      const next = Math.min(index + 1, rowCount - 1);
      if (next < visibleOptions.length) listRef.current?.scrollToOffset({ offset: Math.max(0, (next - 1) * 54), animated: true });
      return next;
    });
    else if (key === 'ArrowUp') setActiveIndex((index) => {
      const next = Math.max(index - 1, 0);
      if (next < visibleOptions.length) listRef.current?.scrollToOffset({ offset: Math.max(0, (next - 1) * 54), animated: true });
      return next;
    });
    else if (key === 'Enter' && rowCount > 0) {
      if (showManualChoice && activeIndex === visibleOptions.length) choose(query.trim());
      else if (visibleOptions[activeIndex]) choose(visibleOptions[activeIndex].value);
    }
  };

  const renderOption = ({ item, index }: { item: AcademicOption; index: number }) => (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected: value === item.value }}
      onPress={() => choose(item.value)}
      onFocus={() => setActiveIndex(index)}
      style={[styles.option, activeIndex === index && styles.optionActive]}
    >
      <View style={styles.optionCopy}><Text style={styles.optionLabel}>{item.label}</Text>{item.detail ? <Text style={styles.optionDetail}>{item.detail}</Text> : null}</View>
      {isSelected(item) ? <Text style={styles.selectedMark}>Selected</Text> : null}
    </TouchableOpacity>
  );

  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TouchableOpacity
      accessibilityRole="combobox"
      accessibilityLabel={label}
      accessibilityHint={`Opens searchable ${label.toLowerCase()} options`}
      accessibilityState={{ expanded: open }}
      onPress={() => setOpen(true)}
      style={[styles.trigger, error && styles.triggerError]}
    >
      <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.triggerText, !value && styles.placeholder]}>{selectedOption?.label || value || placeholder}</Text>
      <Ionicons accessibilityElementsHidden name="chevron-down" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : helperText ? <Text style={styles.helper}>{helperText}</Text> : null}

    <Modal transparent visible={open} animationType="slide" onRequestClose={close} presentationStyle="overFullScreen">
      <View style={styles.modalRoot}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Close ${label} selector`} onPress={close} style={styles.scrim}/>
        <KeyboardAvoidingView style={styles.keyboardWrap} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close selector" onPress={close} style={styles.closeButton}><Text style={styles.closeText}>Done</Text></TouchableOpacity>
            </View>
            <TextInput
              accessibilityLabel={`Search ${label.toLowerCase()}`}
              autoFocus
              value={query}
              onChangeText={(text) => { setQuery(text); setActiveIndex(0); }}
              onKeyPress={(event) => onSearchKey(event.nativeEvent.key)}
              placeholder={`Search ${label.toLowerCase()}`}
              placeholderTextColor={Colors.textSubtle}
              returnKeyType="search"
              style={styles.searchInput}
            />
            {loading ? <ActivityIndicator accessibilityLabel="Loading results" color={Colors.primary} style={styles.loading}/> : null}
            <Text accessibilityLiveRegion="polite" style={styles.resultCount}>{visibleOptions.length ? `${visibleOptions.length} results${visibleOptions.length === 50 ? ' or more' : ''}` : query ? emptyMessage : options.length ? 'Choose an option or search.' : 'Search or enter your own value.'}</Text>
            {visibleOptions.length ? <FlatList
              ref={listRef}
              data={visibleOptions}
              keyExtractor={(item) => item.value}
              renderItem={renderOption}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              initialNumToRender={12}
              maxToRenderPerBatch={20}
              windowSize={7}
              style={styles.results}
            /> : null}
            {showManualChoice ? <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Use ${query.trim()} as the ${label.toLowerCase()}`}
              onPress={() => choose(query.trim())}
              style={[styles.manualChoice, activeIndex === visibleOptions.length && styles.optionActive]}
            ><Text style={styles.manualTitle}>{visibleOptions.length ? 'Other / enter manually' : 'Use this value'}</Text><Text numberOfLines={2} style={styles.manualValue}>{query.trim()}</Text></TouchableOpacity> : null}
            <View style={styles.sheetFooter}><TouchableOpacity accessibilityRole="button" onPress={close}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity></View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  field: { gap: 5 }, label: { color: Colors.textSecondary, fontSize: 12, fontWeight: Typography.semiBold },
  trigger: { height: 52, paddingHorizontal: 13, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  triggerError: { borderColor: Colors.error }, triggerText: { flex: 1, minWidth: 0, color: Colors.textPrimary, fontSize: 14, lineHeight: 20 }, placeholder: { color: Colors.textSubtle },
  helper: { color: Colors.textMuted, fontSize: 11, lineHeight: 16 }, error: { color: Colors.error, fontSize: 11, lineHeight: 16 },
  modalRoot: { flex: 1 }, scrim: { ...StyleSheet.absoluteFill, backgroundColor: Colors.overlay }, keyboardWrap: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  sheet: { width: '100%', maxWidth: 560, minHeight: 190, maxHeight: '85%', alignSelf: 'center', backgroundColor: Colors.surfaceElevated, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: Spacing.lg, paddingTop: 12, paddingBottom: 12, borderWidth: 1, borderColor: Colors.border },
  sheetHeader: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }, sheetTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: Typography.bold }, closeButton: { minWidth: 48, minHeight: 44, justifyContent: 'center', alignItems: 'flex-end' }, closeText: { color: Colors.textSecondary, fontSize: 13, fontWeight: Typography.semiBold },
  searchInput: { minHeight: 50, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: 11, paddingHorizontal: 13, backgroundColor: Colors.background, color: Colors.textPrimary, fontSize: 14 }, loading: { marginTop: 8 }, resultCount: { minHeight: 28, paddingTop: 8, color: Colors.textMuted, fontSize: 11 },
  results: { flexGrow: 0, flexShrink: 1, maxHeight: 320 }, option: { minHeight: 54, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, optionActive: { backgroundColor: Colors.surfaceHighlight }, optionCopy: { flex: 1, gap: 2 }, optionLabel: { color: Colors.textPrimary, fontSize: 14 }, optionDetail: { color: Colors.textMuted, fontSize: 11 }, selectedMark: { color: Colors.primary, fontSize: 11, fontWeight: Typography.semiBold },
  manualChoice: { minHeight: 54, paddingHorizontal: 12, paddingVertical: 9, marginTop: 4, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, justifyContent: 'center' }, manualTitle: { color: Colors.textSecondary, fontSize: 12, fontWeight: Typography.semiBold }, manualValue: { color: Colors.textPrimary, fontSize: 13, marginTop: 3 }, sheetFooter: { alignItems: 'flex-end', paddingTop: 10, paddingBottom: 4 }, cancelText: { color: Colors.textMuted, fontSize: 12 },
});

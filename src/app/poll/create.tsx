import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, Spacing, Typography } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { pollService } from '../../services/pollService';

export default function CreatePollScreen() {
  const { session } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [externalUrl, setExternalUrl] = useState('');
  const [closesOn, setClosesOn] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (!session) router.replace('/login' as never); }, [session]);

  const submit = async () => {
    if (busy) return;
    setError('');
    const normalizedOptions = options.map((value) => value.trim()).filter(Boolean);
    if (title.trim().length < 5) { setError('Add a title of at least 5 characters.'); return; }
    if (!externalUrl.trim() && normalizedOptions.length < 2) { setError('Add at least two poll choices or a survey link.'); return; }
    let closeAt: string | null = null;
    if (closesOn.trim()) {
      const parsed = new Date(`${closesOn.trim()}T23:59:59`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(closesOn.trim()) || !Number.isFinite(parsed.getTime()) || parsed <= new Date()) { setError('Use a future close date in YYYY-MM-DD format.'); return; }
      closeAt = parsed.toISOString();
    }
    if (externalUrl.trim()) { try { if (new URL(externalUrl.trim()).protocol !== 'https:') throw new Error(); } catch { setError('Survey links must use HTTPS.'); return; } }
    setBusy(true);
    try {
      const created = await pollService.create({ title: title.trim(), description: description.trim(), options: normalizedOptions, externalUrl: externalUrl.trim() || undefined, closesAt: closeAt });
      Alert.alert('Survey shared', 'Your survey is now in the student feed.');
      router.replace(`/post/${created.post.id}` as never);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The survey could not be published.'); }
    finally { setBusy(false); }
  };

  return <SafeAreaView style={styles.safe} edges={['top','bottom']}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as never)} style={styles.back}><Ionicons name="arrow-back" size={20} color={Colors.textPrimary}/></Pressable><Text style={styles.headerTitle}>Create a survey or poll</Text><View style={styles.back}/></View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.intro}>Ask a question, collect student feedback, or share an external survey.</Text>
      <Text style={styles.label}>Title</Text><TextInput value={title} onChangeText={setTitle} maxLength={180} placeholder="What do you want to learn?" placeholderTextColor={Colors.textMuted} style={styles.input}/>
      <Text style={styles.label}>Description (optional)</Text><TextInput value={description} onChangeText={setDescription} maxLength={6000} multiline placeholder="Add context for students answering." placeholderTextColor={Colors.textMuted} style={[styles.input,styles.multiline]}/>
      <View style={styles.sectionHeading}><Text style={styles.label}>Poll choices</Text>{options.length < 8 ? <Pressable accessibilityRole="button" onPress={() => setOptions((items) => [...items, ''])} style={styles.add}><Ionicons name="add" size={17} color={Colors.primary}/><Text style={styles.addText}>Add choice</Text></Pressable> : null}</View>
      {options.map((option, index) => <View key={index} style={styles.optionRow}><TextInput value={option} onChangeText={(value) => setOptions((items) => items.map((item, itemIndex) => itemIndex === index ? value : item))} maxLength={240} placeholder={`Choice ${index + 1}`} placeholderTextColor={Colors.textMuted} style={[styles.input,{flex:1}]}/>{options.length > 2 ? <Pressable accessibilityRole="button" accessibilityLabel={`Remove choice ${index + 1}`} onPress={() => setOptions((items) => items.filter((_, itemIndex) => itemIndex !== index))} style={styles.remove}><Ionicons name="close" size={18} color={Colors.textMuted}/></Pressable> : null}</View>)}
      <Text style={styles.label}>External survey link (optional)</Text><TextInput value={externalUrl} onChangeText={setExternalUrl} autoCapitalize="none" keyboardType="url" placeholder="https://forms.example.com/..." placeholderTextColor={Colors.textMuted} style={styles.input}/>
      <Text style={styles.label}>Close date (optional)</Text><TextInput value={closesOn} onChangeText={setClosesOn} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textMuted} style={styles.input}/>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => void submit()} style={[styles.submit,busy && {opacity:.6}]}>{busy ? <ActivityIndicator color={Colors.textOnPrimary}/> : <Text style={styles.submitText}>Publish survey</Text>}</Pressable>
    </ScrollView>
  </SafeAreaView>;
}

const styles=StyleSheet.create({safe:{flex:1,backgroundColor:Colors.background},header:{height:56,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:Spacing.screenPadding,borderBottomWidth:1,borderBottomColor:Colors.border},back:{width:40,height:40,alignItems:'center',justifyContent:'center'},headerTitle:{color:Colors.textPrimary,fontSize:Typography.headline,fontWeight:Typography.bold},content:{width:'100%',maxWidth:680,alignSelf:'center',padding:Spacing.screenPadding,paddingBottom:36},intro:{color:Colors.textMuted,fontSize:Typography.footnote,lineHeight:20,marginBottom:8},label:{color:Colors.textSecondary,fontSize:Typography.caption,fontWeight:Typography.semiBold,marginTop:14,marginBottom:6},input:{minHeight:48,borderWidth:1,borderColor:Colors.border,borderRadius:BorderRadius.md,backgroundColor:Colors.surface,color:Colors.textPrimary,paddingHorizontal:12,paddingVertical:10,fontSize:Typography.footnote,outlineStyle:'none' as any},multiline:{minHeight:100,textAlignVertical:'top'},sectionHeading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},add:{minHeight:40,flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:8},addText:{color:Colors.primary,fontSize:Typography.caption,fontWeight:Typography.bold},optionRow:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:7},remove:{width:40,height:44,alignItems:'center',justifyContent:'center'},error:{color:Colors.error,fontSize:Typography.footnote,lineHeight:19,marginTop:12},submit:{minHeight:50,alignItems:'center',justifyContent:'center',marginTop:20,borderRadius:BorderRadius.md,backgroundColor:Colors.primary},submitText:{color:Colors.textOnPrimary,fontSize:Typography.footnote,fontWeight:Typography.bold}});

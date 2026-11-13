import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { authService } from '../../services/authService';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import { chatRequestsEnabled, chatService } from '../../services/chatService';

export default function SettingsScreen() {
  const { user } = useApp();
  const { session } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [allowChatRequests, setAllowChatRequests] = useState(true);
  const [savingChatPrivacy, setSavingChatPrivacy] = useState(false);
  useEffect(() => { if (chatRequestsEnabled) void chatService.requestPreference().then(setAllowChatRequests).catch(() => undefined); }, []);

  const updateChatPreference = async (enabled: boolean) => {
    setSavingChatPrivacy(true);
    try { await chatService.setRequestPreference(enabled); setAllowChatRequests(enabled); }
    catch (cause) { Alert.alert('Privacy setting not saved', cause instanceof Error ? cause.message : 'Please try again.'); }
    finally { setSavingChatPrivacy(false); }
  };

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const { error } = await authService.signOut();
      if (error) throw error;
      router.replace('/login');
    } catch (cause) {
      Alert.alert('Sign out failed', cause instanceof Error ? cause.message : 'Please try again.');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.account}>
          <Avatar uri={user.avatar || session?.user.user_metadata?.avatar_url} name={user.name || session?.user.email || 'Student'} size={56} />
          <View style={styles.accountCopy}>
            <Text style={styles.name} numberOfLines={2}>{user.name || session?.user.user_metadata?.full_name || 'Student'}</Text>
            <Text style={styles.email} numberOfLines={2}>{session?.user.email || 'Signed in account'}</Text>
            <Text style={styles.school} numberOfLines={2}>{[user.college, user.degree, user.branch].filter(Boolean).join(' · ') || 'Student profile'}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        <View style={styles.group}>
          <SettingsRow icon="person-outline" label="Edit profile" detail="Update your student portfolio" onPress={() => router.push('/(tabs)/profile')} />
          <View style={styles.divider} />
          <SettingsRow icon="key-outline" label="Change password" detail="Send a password reset email" onPress={() => router.push('/forgot-password')} />
        </View>

        <Text style={styles.sectionTitle}>PRIVACY & PREFERENCES</Text>
        <View style={styles.group}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}><Ionicons name="shield-checkmark-outline" size={19} color={Colors.accentCyan} /></View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowLabel}>Message requests</Text>
              <Text style={styles.rowDetail}>{chatRequestsEnabled ? 'Allow other students to send you private chat requests.' : 'Available after messaging setup is deployed and verified.'}</Text>
            </View>
            <Switch accessibilityLabel="Allow message requests" value={allowChatRequests} disabled={!chatRequestsEnabled || savingChatPrivacy} onValueChange={(value) => void updateChatPreference(value)} trackColor={{ false: Colors.surfaceHighlight, true: Colors.primary }} thumbColor={Colors.textPrimary} />
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}><Ionicons name="color-palette-outline" size={19} color={Colors.accentPurple} /></View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowLabel}>Appearance</Text>
              <Text style={styles.rowDetail}>STUDOS currently follows its dark appearance.</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>ABOUT</Text>
        <View style={styles.group}>
          <View style={styles.infoRow}>
            <View style={styles.wordmark}><Text style={styles.wordmarkText}>S</Text></View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowLabel}>STUDOS</Text>
              <Text style={styles.rowDetail}>A place to learn, share, and build with students.</Text>
            </View>
          </View>
        </View>

        <Button title={signingOut ? 'Signing out…' : 'Sign out'} variant="outline" onPress={signOut} disabled={signingOut} loading={signingOut} icon={signingOut ? undefined : <Ionicons name="log-out-outline" size={18} color={Colors.error} />} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsRow({ icon, label, detail, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; detail: string; onPress: () => void }) {
  return (
    <TouchableOpacity accessibilityRole="button" style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.infoIcon}><Ionicons name={icon} size={19} color={Colors.textMuted} /></View>
      <View style={styles.rowCopy}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowDetail}>{detail}</Text></View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textSubtle} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.screenPadding, paddingBottom: 36, gap: 12 },
  account: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: BorderRadius.xl, backgroundColor: Colors.surface, borderColor: Colors.border, borderWidth: 1, marginBottom: 8 },
  accountCopy: { flex: 1, minWidth: 0, gap: 3 },
  name: { color: Colors.textPrimary, fontSize: Typography.title3, lineHeight: 24, fontWeight: Typography.bold },
  email: { color: Colors.textSecondary, fontSize: Typography.footnote, lineHeight: 18 },
  school: { color: Colors.textMuted, fontSize: Typography.caption, lineHeight: 17 },
  sectionTitle: { color: Colors.textMuted, fontSize: Typography.caption, lineHeight: 17, fontWeight: Typography.bold, letterSpacing: 0.8, marginTop: 5 },
  group: { backgroundColor: Colors.surface, borderColor: Colors.border, borderWidth: 1, borderRadius: BorderRadius.lg, paddingHorizontal: 12 },
  row: { minHeight: 68, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 11 },
  infoRow: { minHeight: 68, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 11 },
  infoIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: Colors.surfaceHighlight, alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1, minWidth: 0, gap: 2 },
  rowLabel: { color: Colors.textPrimary, fontSize: Typography.subhead, lineHeight: 20, fontWeight: Typography.semiBold },
  rowDetail: { color: Colors.textMuted, fontSize: Typography.caption, lineHeight: 17 },
  divider: { height: 1, marginLeft: 46, backgroundColor: Colors.divider },
  comingSoon: { color: Colors.textSubtle, fontSize: 11, fontWeight: Typography.semiBold, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 99, backgroundColor: Colors.surfaceHighlight },
  wordmark: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primarySubtle },
  wordmarkText: { color: Colors.primary, fontSize: 21, lineHeight: 25, fontWeight: Typography.bold },
});

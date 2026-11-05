import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing } from '../../constants/theme';
import { Card } from '../../components/ui/Card';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { router } from 'expo-router';

export default function SettingsScreen() {
  const { user } = useApp();
  const { session } = useAuth();

  const [publicProfile, setPublicProfile] = useState(true);
  const [allowMatching, setAllowMatching] = useState(true);
  const [notifyDeadlines, setNotifyDeadlines] = useState(true);
  const [notifyMatches, setNotifyMatches] = useState(true);
  const [notifyTeamApps, setNotifyTeamApps] = useState(true);

  const handleClearCache = () => {
    Alert.alert(
      'Reset Local Cache',
      'This will refresh your local device cache while keeping your profile safe.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset Cache', style: 'destructive', onPress: () => Alert.alert('Cache Cleared', 'Local data reloaded.') },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Account Info Card */}
        <Card variant="elevated" style={styles.accountCard}>
          <Text style={styles.sectionHeader}>STUDENT ACCOUNT</Text>
          <Text style={styles.accountName}>{user.name}</Text>
          <Text style={styles.accountEmail}>{user.college} • {user.degree}</Text>
          <Text style={styles.rankBadge}>StuDos ID: STU-849204 • Verified Student</Text>
        </Card>

        {/* Privacy & Discovery Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PRIVACY & COLLABORATOR DISCOVERY</Text>
          <Card variant="default" style={styles.settingsGroup}>
            <View style={styles.settingRow}>
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingLabel}>Public Innovation Profile</Text>
                <Text style={styles.settingDesc}>Allow other students to view your portfolio and skills</Text>
              </View>
              <Switch
                value={publicProfile}
                onValueChange={setPublicProfile}
                trackColor={{ false: Colors.surfaceHighlight, true: Colors.primary }}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingLabel}>Discover & Matching Arena</Text>
                <Text style={styles.settingDesc}>Appear in Swipe & Connect recommendations</Text>
              </View>
              <Switch
                value={allowMatching}
                onValueChange={setAllowMatching}
                trackColor={{ false: Colors.surfaceHighlight, true: Colors.primary }}
              />
            </View>
          </Card>
        </View>

        {/* Notifications Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NOTIFICATIONS & DEADLINES</Text>
          <Card variant="default" style={styles.settingsGroup}>
            <View style={styles.settingRow}>
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingLabel}>Hackathon & Opportunity Reminders</Text>
                <Text style={styles.settingDesc}>Alerts 48h and 24h before application deadlines</Text>
              </View>
              <Switch
                value={notifyDeadlines}
                onValueChange={setNotifyDeadlines}
                trackColor={{ false: Colors.surfaceHighlight, true: Colors.primary }}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingLabel}>New Match Alerts</Text>
                <Text style={styles.settingDesc}>When another student swiped right on your profile</Text>
              </View>
              <Switch
                value={notifyMatches}
                onValueChange={setNotifyMatches}
                trackColor={{ false: Colors.surfaceHighlight, true: Colors.primary }}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingLabel}>Team Application Updates</Text>
                <Text style={styles.settingDesc}>When leads accept or respond to squad requests</Text>
              </View>
              <Switch
                value={notifyTeamApps}
                onValueChange={setNotifyTeamApps}
                trackColor={{ false: Colors.surfaceHighlight, true: Colors.primary }}
              />
            </View>
          </Card>
        </View>

        {/* Data & Storage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DATA & SYSTEM</Text>
          <Card variant="default" style={styles.settingsGroup}>
            <TouchableOpacity style={styles.actionRow} onPress={handleClearCache}>
              <Ionicons name="trash-bin-outline" size={18} color={Colors.error} />
              <Text style={styles.actionRowTextDanger}>Reset Local Session & Cache</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.actionRow} onPress={async () => { const { error } = await authService.signOut(); if (error) Alert.alert('Sign out failed', error.message); else router.replace('/login'); }}>
              <Ionicons name="log-out-outline" size={18} color={Colors.error} />
              <Text style={styles.actionRowTextDanger}>Sign out{session?.user.email ? ` · ${session.user.email}` : ''}</Text>
            </TouchableOpacity>
          </Card>
        </View>

        {/* About StuDos */}
        <View style={styles.aboutFooter}>
          <Text style={styles.wordmark}>
            STU<Text style={{ color: Colors.primary }}>DOS</Text>
          </Text>
          <Text style={styles.versionText}>v1.0.0 • Student Innovation & Opportunity Network</Text>
          <Text style={styles.taglineText}>Built for student builders, innovators, and hackathon contenders.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    padding: Spacing.screenPadding,
    paddingBottom: 40,
  },
  accountCard: {
    marginBottom: 20,
    padding: 16,
  },
  sectionHeader: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  accountName: {
    fontSize: Typography.title3,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  accountEmail: {
    fontSize: Typography.subhead,
    color: Colors.textMuted,
    marginTop: 2,
  },
  rankBadge: {
    fontSize: Typography.caption,
    color: Colors.accentCyan,
    marginTop: 8,
    fontWeight: Typography.medium,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  settingsGroup: {
    padding: 14,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: Typography.body,
    fontWeight: Typography.semiBold,
    color: Colors.textPrimary,
  },
  settingDesc: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  actionRowTextDanger: {
    fontSize: Typography.body,
    color: Colors.error,
    fontWeight: Typography.semiBold,
    marginLeft: 10,
  },
  aboutFooter: {
    alignItems: 'center',
    marginTop: 20,
    paddingBottom: 20,
  },
  wordmark: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  versionText: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginTop: 4,
  },
  taglineText: {
    fontSize: 10,
    color: Colors.textSubtle,
    marginTop: 2,
    textAlign: 'center',
  },
});

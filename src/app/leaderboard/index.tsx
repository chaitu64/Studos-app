import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useApp } from '../../context/AppContext';

export default function LeaderboardScreen() {
  const { user, leaderboard } = useApp();

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {/* Current User Spotlight Rank Card */}
      <Card variant="elevated" style={styles.userRankCard}>
        <View style={styles.userRankHeader}>
          <Text style={styles.userRankLabel}>YOUR RANKING</Text>
          <Badge label="Leaderboard" variant="primary" size="sm" />
        </View>
        <View style={styles.userRankRow}>
          <View style={styles.rankBadge}>
            <Text style={styles.rankNum}>{user.leaderboardRank ? `#{user.leaderboardRank}` : '—'}</Text>
          </View>
          <Avatar uri={user.avatar} name={user.name} size={44} isVerified={user.isVerified} />
          <View style={styles.userRankInfo}>
            <Text style={styles.userRankName}>{user.name} (You)</Text>
            <Text style={styles.userRankCollege}>{user.college} • {user.branch || user.degree || ''}</Text>
          </View>
          <View style={styles.userPointsBlock}>
            <Text style={styles.userPointsValue}>{user.points}</Text>
            <Text style={styles.userGainText}>Points</Text>
          </View>
        </View>
      </Card>

      {/* Leaderboard Roster */}
      <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.rosterHeader}>TOP STUDENT INNOVATORS</Text>
        {leaderboard.map((lead) => {
          const isTop3 = lead.rank <= 3;
          return (
            <Card
              key={lead.id}
              variant="default"
              style={[
                styles.leadCard,
                lead.id === 'usr_me' ? styles.leadCardSelf : undefined,
              ]}
            >
              <View style={styles.leadCardRank}>
                {lead.rank === 1 ? (
                  <Ionicons name="trophy" size={20} color="#FBBF24" />
                ) : lead.rank === 2 ? (
                  <Ionicons name="medal" size={20} color="#94A3B8" />
                ) : lead.rank === 3 ? (
                  <Ionicons name="medal" size={20} color="#B45309" />
                ) : (
                  <Text style={styles.normalRank}>#{lead.rank}</Text>
                )}
              </View>

              <Avatar uri={lead.avatar} name={lead.name} size={42} />

              <View style={styles.leadCardInfo}>
                <View style={styles.nameBadgesRow}>
                  <Text style={styles.leadCardName}>{lead.name}</Text>
                  {isTop3 && lead.categoryRank ? (
                    <Badge label={lead.categoryRank} variant="amber" size="sm" style={{ marginLeft: 6 }} />
                  ) : null}
                </View>
                <Text style={styles.leadCardCollege}>
                  {lead.college} â€¢ {lead.role}
                </Text>
                <View style={styles.badgeTagsRow}>
                  {(lead.badges || []).slice(0, 1).map((b) => (
                    <Text key={b} style={styles.badgeTagText}>
                      ðŸŽ– {b}
                    </Text>
                  ))}
                </View>
              </View>

              <View style={styles.leadCardPoints}>
                <Text style={styles.leadCardPtsValue}>{lead.points}</Text>
                <Text style={styles.leadCardGain}>points</Text>
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  timeframeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 8,
    paddingBottom: 8,
  },
  timeframeSwitch: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 3,
  },
  switchOption: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.sm,
  },
  switchActive: {
    backgroundColor: Colors.primary,
  },
  switchText: {
    fontSize: Typography.subhead,
    color: Colors.textMuted,
    fontWeight: Typography.medium,
  },
  switchTextActive: {
    color: '#FFF',
    fontWeight: Typography.bold,
  },
  rulesToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  rulesToggleText: {
    fontSize: Typography.footnote,
    color: Colors.primary,
    marginLeft: 4,
    fontWeight: Typography.semiBold,
  },
  rulesCard: {
    marginHorizontal: Spacing.screenPadding,
    backgroundColor: Colors.surfaceElevated,
    padding: 14,
    marginBottom: 12,
  },
  rulesHeader: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  rulesSub: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginBottom: 10,
  },
  ruleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  ruleLeft: {
    flex: 1,
    marginRight: 8,
  },
  ruleTitle: {
    fontSize: Typography.footnote,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  ruleDesc: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 1,
  },
  rulePts: {
    fontSize: Typography.footnote,
    fontWeight: Typography.bold,
    color: Colors.accentAmber,
  },
  userRankCard: {
    marginHorizontal: Spacing.screenPadding,
    padding: 14,
    marginBottom: 14,
    borderColor: Colors.primaryBorder,
  },
  userRankHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userRankLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  userRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankBadge: {
    width: 34,
    alignItems: 'center',
    marginRight: 8,
  },
  rankNum: {
    fontSize: Typography.title3,
    fontWeight: Typography.bold,
    color: Colors.primary,
  },
  userRankInfo: {
    flex: 1,
    marginLeft: 10,
  },
  userRankName: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  userRankCollege: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  userPointsBlock: {
    alignItems: 'flex-end',
  },
  userPointsValue: {
    fontSize: Typography.title3,
    fontWeight: Typography.bold,
    color: Colors.accentAmber,
  },
  userGainText: {
    fontSize: 10,
    color: Colors.success,
    marginTop: 2,
  },
  listContainer: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: 30,
  },
  rosterHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  leadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
  },
  leadCardSelf: {
    borderColor: Colors.primaryBorder,
    backgroundColor: Colors.primarySubtle,
  },
  leadCardRank: {
    width: 32,
    alignItems: 'center',
    marginRight: 6,
  },
  normalRank: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: Colors.textMuted,
  },
  leadCardInfo: {
    flex: 1,
    marginLeft: 10,
  },
  nameBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leadCardName: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  leadCardCollege: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginTop: 1,
  },
  badgeTagsRow: {
    marginTop: 4,
  },
  badgeTagText: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  leadCardPoints: {
    alignItems: 'flex-end',
  },
  leadCardPtsValue: {
    fontSize: Typography.headline,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  leadCardGain: {
    fontSize: 10,
    color: Colors.success,
    marginTop: 1,
  },
});

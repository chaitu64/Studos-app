import React, { useEffect, useState } from 'react';
import { ActivityIndicator, GestureResponderEvent, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, BorderRadius, Typography } from '../../constants/theme';
import { pollService, type CommunityPoll } from '../../services/pollService';

export function CommunityPollCard({ pollId, onInteraction }: { pollId: string; onInteraction?: (event: GestureResponderEvent) => void }) {
  const [poll, setPoll] = useState<CommunityPoll | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    pollService.get(pollId).then((result) => { if (active) setPoll(result); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Poll results could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [pollId]);
  const vote = async (optionId: string) => {
    if (busy || !poll || poll.closed || poll.has_voted) return;
    setBusy(true);
    try { setPoll(await pollService.vote(pollId, optionId)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Your vote could not be saved.'); }
    finally { setBusy(false); }
  };
  if (loading) return <View style={styles.state}><ActivityIndicator size="small" color={Colors.primary}/></View>;
  if (error && !poll) return <Text accessibilityRole="alert" style={styles.error}>{error}</Text>;
  if (!poll) return null;
  const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);
  const showResults = poll.has_voted || poll.closed;
  return <View style={styles.card}>
    {poll.description ? <Text style={styles.description}>{poll.description}</Text> : null}
    {poll.external_url ? <Pressable accessibilityRole="link" onPress={(event) => { onInteraction?.(event); void Linking.openURL(poll.external_url!); }} style={styles.external}><Text style={styles.externalText}>Open survey</Text></Pressable> : poll.options.map((option) => {
      const percent = totalVotes ? Math.round(option.votes / totalVotes * 100) : 0;
      return <Pressable key={option.id} accessibilityRole="button" accessibilityState={{ disabled: busy || showResults }} disabled={busy || showResults} onPress={(event) => { onInteraction?.(event); void vote(option.id); }} style={styles.option}>
        {showResults ? <View style={[styles.resultBar, { width: `${percent}%` }]} /> : null}
        <Text style={styles.optionText}>{option.text}</Text>
        {showResults ? <Text style={styles.percent}>{percent}% · {option.votes}</Text> : null}
      </Pressable>;
    })}
    <Text style={styles.meta}>{showResults ? `${totalVotes} ${totalVotes === 1 ? 'vote' : 'votes'}` : 'Choose one answer'}{poll.closed ? ' · Closed' : poll.closes_at ? ` · Closes ${new Date(poll.closes_at).toLocaleDateString()}` : ''}</Text>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { gap: 8, padding: 12, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, backgroundColor: Colors.surface, marginTop: 10 },
  description: { color: Colors.textSecondary, fontSize: Typography.footnote, lineHeight: 19 },
  option: { minHeight: 42, justifyContent: 'center', overflow: 'hidden', paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background },
  resultBar: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: Colors.primarySubtle },
  optionText: { color: Colors.textPrimary, fontSize: Typography.footnote, fontWeight: Typography.medium },
  percent: { position: 'absolute', right: 9, color: Colors.textMuted, fontSize: Typography.caption },
  external: { minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: Colors.primarySubtle },
  externalText: { color: Colors.primary, fontSize: Typography.footnote, fontWeight: Typography.bold },
  meta: { color: Colors.textMuted, fontSize: Typography.caption },
  state: { minHeight: 50, justifyContent: 'center' },
  error: { color: Colors.error, fontSize: Typography.caption },
});

import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '../../constants/theme';
import { Header } from '../navigation/Header';
import { Avatar } from '../ui/Avatar';
import { EmptyState } from '../ui/EmptyState';
import { CardSkeleton } from '../ui/Skeleton';
import { useApp } from '../../context/AppContext';
import { StudentDirectoryProfile, CommunityPost } from '../../types';
import { StudentService } from '../../services/homeDiscoveryData';
import { studentDirectoryService } from '../../services/studentDirectoryService';
import { studentContactRequestService } from '../../services/studentContactRequestService';
import { studentServicesService } from '../../services/studentServicesService';
import { studentCommunityService, StudentTeamOpening } from '../../services/studentCommunityService';
import { DiscoveryItem, DiscoveryPerson, DiscoverySwipeCard, DiscoverySwipeCardHandle } from '../cards/DiscoverySwipeCard';

type Section = 'services' | 'teammates' | 'people';
const sections: { id: Section; title: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'services', title: 'Services', icon: 'construct-outline' },
  { id: 'teammates', title: 'Teammates', icon: 'people-outline' },
  { id: 'people', title: 'People', icon: 'person-outline' },
];
const unique = (values: (string | undefined)[]) => [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
const postFromService = (service: StudentService): CommunityPost => ({
  id: `service:${service.id}`, type: 'service', title: service.title, content: service.description,
  author: { id: service.provider.id, identity: service.provider.identity, name: service.provider.name, avatar: service.provider.avatar, college: service.provider.branchYear, role: service.provider.role },
  createdAt: service.createdAt || '', createdAtTimestamp: service.createdAt ? Date.parse(service.createdAt) : 0,
  category: service.category, skills: service.provider.skills, servicePricing: service.startingPrice == null ? undefined : `Starting at \u20B9${service.startingPrice.toLocaleString('en-IN')}`,
});

export default function ConnectExperience() {
  const { width } = useWindowDimensions();
  const routeParams = useLocalSearchParams<{ section?: string; search?: string }>();
  const { user } = useApp();
  const [serviceRows, setServiceRows] = useState<StudentService[]>([]);
  const [openingRows, setOpeningRows] = useState<StudentTeamOpening[]>([]);
  const [serviceState, setServiceState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [openingState, setOpeningState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [serviceError, setServiceError] = useState('');
  const [openingError, setOpeningError] = useState('');
  const initialSection: Section = routeParams.section === 'teammates' || routeParams.section === 'people' ? routeParams.section : 'services';
  const [section, setSection] = useState<Section>(initialSection);
  const [profiles, setProfiles] = useState<StudentDirectoryProfile[]>([]);
  const [peopleState, setPeopleState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [peopleError, setPeopleError] = useState('');
  const [search, setSearch] = useState(typeof routeParams.search === 'string' ? routeParams.search : '');
  const [filter, setFilter] = useState('All');
  const [skipped, setSkipped] = useState<string[]>([]);
  const [requested, setRequested] = useState<string[]>([]);
  const [browseAll, setBrowseAll] = useState(false);
  const [detailItem, setDetailItem] = useState<DiscoveryItem | null>(null);
  const [requestItem, setRequestItem] = useState<DiscoveryItem | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [requestUnavailable, setRequestUnavailable] = useState('');
  const card = useRef<DiscoverySwipeCardHandle>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (routeParams.section === 'services' || routeParams.section === 'teammates' || routeParams.section === 'people') setSection(routeParams.section);
      if (typeof routeParams.search === 'string') setSearch(routeParams.search);
    }, 0);
    return () => clearTimeout(timer);
  }, [routeParams.section, routeParams.search]);

  const loadDiscoveryRecords = React.useCallback(async () => {
    setServiceState('loading'); setOpeningState('loading'); setServiceError(''); setOpeningError('');
    const [servicesResult, openingsResult] = await Promise.allSettled([studentServicesService.listDiscoverable(), studentCommunityService.teamOpenings()]);
    if (servicesResult.status === 'fulfilled') { setServiceRows(servicesResult.value); setServiceState('ready'); }
    else { setServiceError(servicesResult.reason instanceof Error ? servicesResult.reason.message : 'Student services could not be loaded.'); setServiceRows([]); setServiceState('error'); }
    if (openingsResult.status === 'fulfilled') { setOpeningRows(openingsResult.value); setOpeningState('ready'); }
    else { setOpeningError(openingsResult.reason instanceof Error ? openingsResult.reason.message : 'Openings could not be loaded.'); setOpeningRows([]); setOpeningState('error'); }
  }, []);
  React.useEffect(() => { const timer = setTimeout(() => { void loadDiscoveryRecords(); }, 0); return () => clearTimeout(timer); }, [loadDiscoveryRecords]);

  React.useEffect(() => {
    let alive = true;
    studentDirectoryService.list({ limit: 300 }).then((page) => {
      if (alive) { setProfiles(page.students.filter((profile) => !(profile.identity.type === 'real' && profile.id === user.id))); setPeopleState('ready'); }
    }).catch((error) => {
      if (alive) { console.error('Connect student directory failed:', error); setPeopleError(error instanceof Error ? error.message : 'Student profiles could not be loaded.'); setPeopleState('error'); }
    });
    return () => { alive = false; };
  }, [user.id]);

  const services = useMemo(() => serviceRows.filter((service) => service.isActive === true).map(postFromService), [serviceRows]);
  const teamPosts = useMemo(() => openingRows.map((opening): CommunityPost => ({
    id: `opening:${opening.id}`, type: 'event_collab', title: opening.roleTitle,
    content: opening.description,
    author: { id: opening.author.id, identity: opening.author.identity, name: opening.author.name, avatar: opening.author.avatar, college: [opening.author.college, opening.author.degree, opening.author.branch].filter(Boolean).join(' · '), role: opening.author.branch || opening.author.degree },
    createdAt: opening.createdAt, createdAtTimestamp: Date.parse(opening.createdAt) || 0,
    category: 'Team opening', tags: opening.skillsNeeded, skills: opening.skillsNeeded,
    rolesNeeded: [opening.roleTitle] as CommunityPost['rolesNeeded'], eventName: opening.eventName, eventRoleNeeded: opening.roleTitle, openPositions: opening.openings,
  })), [openingRows]);
  const people = useMemo<DiscoveryPerson[]>(() => profiles.map((profile) => ({
    id: `${profile.identity.type}:${profile.id}`, identity: profile.identity, profile,
    author: { id: profile.id, identity: profile.identity, name: profile.name, avatar: profile.avatar, college: [profile.college, profile.degree, profile.branch].filter(Boolean).join(' · '), role: profile.branch || profile.degree },
    posts: [], skills: profile.skills,
  })), [profiles]);
  const allItems = useMemo<DiscoveryItem[]>(() => {
    const posts = section === 'services' ? services : teamPosts;
    if (section === 'people') return people.map((person) => ({ kind: 'person', id: `person:${person.id}`, person }));
    return posts.map((post) => ({ kind: 'post', id: post.id, post }));
  }, [people, section, services, teamPosts]);
  const filterOptions = useMemo(() => section === 'people'
    ? unique(people.flatMap((person) => [...person.skills, ...(person.profile?.interests || []), person.profile?.college, person.profile?.branch]))
    : section === 'services'
      ? unique(services.map((service) => service.category))
      : unique(teamPosts.flatMap((post) => [post.eventName, ...(post.skills || [])])), [people, section, services, teamPosts]);
  const candidates = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allItems.filter((item) => {
      if (skipped.includes(item.id) || requested.includes(item.id)) return false;
      const tags = item.kind === 'person'
        ? [...item.person.skills, ...(item.person.profile?.interests || []), item.person.profile?.college || '', item.person.profile?.branch || '']
        : [...(item.post.skills || []), item.post.category || '', item.post.eventName || ''];
      const text = item.kind === 'person'
        ? [item.person.author.name, item.person.profile?.college, item.person.profile?.branch, item.person.profile?.shortBio, ...tags].join(' ')
        : [item.post.title, item.post.content, item.post.category, item.post.eventName, ...tags].join(' ');
      return (!term || text.toLowerCase().includes(term)) && (filter === 'All' || tags.includes(filter));
    });
  }, [allItems, filter, requested, search, skipped]);
  const current = candidates[0];
  const contactTarget = (item: DiscoveryItem): { id?: string; serviceId?: string; demo: boolean } => {
    if (item.kind === 'person') return { id: item.person.identity?.type === 'real' ? item.person.identity.id : undefined, demo: item.person.identity?.type !== 'real' };
    const identity = item.post.author.identity;
    if (item.post.type === 'service') return { id: identity?.type === 'real' ? identity.id : undefined, serviceId: item.post.id.replace(/^service:/, ''), demo: identity?.type !== 'real' };
    return { id: identity?.type === 'real' ? identity.id : undefined, demo: identity?.type !== 'real' };
  };
  const error = section === 'people' ? peopleState === 'error' ? peopleError : '' : section === 'services' ? serviceState === 'error' ? serviceError : '' : openingState === 'error' ? openingError : '';
  const loading = section === 'people' ? peopleState === 'loading' : section === 'services' ? serviceState === 'loading' : openingState === 'loading';
  const sectionTitle = section === 'services' ? 'Student services' : section === 'teammates' ? 'Open teammate roles' : 'Student directory';
  const actionTitle = section === 'services' ? 'Interested' : section === 'teammates' ? 'Request to join' : 'Connect';
  const actionButtonLabel = section === 'teammates' ? 'Join' : actionTitle;

  const pass = (item: DiscoveryItem) => setSkipped((currentIds) => currentIds.includes(item.id) ? currentIds : [...currentIds, item.id]);
  const beginRequest = (item: DiscoveryItem) => {
    if (section === 'teammates' && item.kind === 'post') {
      setRequestUnavailable(item.post.author.identity?.type === 'demo'
        ? 'This is a demonstration opening. It is view-only and does not accept applications.'
        : 'Secure requests for student team openings are not available yet. No request or membership will be created.');
      setRequestItem(item); setMessage(''); return;
    }
    setRequestUnavailable('');
    const target = contactTarget(item);
    if (!target.id) {
      Alert.alert('Messaging unavailable', target.demo ? 'This demonstration profile is viewable, but it is not linked to a contactable STUDOS account.' : 'The provider does not resolve to a contactable student account.');
      return;
    }
    setRequestItem(item);
    setMessage(section === 'services' ? 'Hi, I’m interested in this service. I’d like to discuss my requirements, timeline, and budget.' : 'Hi, I’d like to connect and learn more about your skills and interests.');
  };
  const submitRequest = async () => {
    if (!requestItem || busy) return;
    setBusy(true);
    try {
      if (section === 'teammates') throw new Error('Team opening requests are not connected to an authorized backend workflow.');
      else {
        const target = contactTarget(requestItem);
        if (!target.id) throw new Error('This student does not have a contactable account.');
        await studentContactRequestService.send({ targetUserId: target.id, serviceId: target.serviceId, message });
      }
      setRequested((ids) => ids.includes(requestItem.id) ? ids : [...ids, requestItem.id]);
      setRequestItem(null); setMessage('');
      Alert.alert('Request sent', 'Your request is pending. This does not confirm acceptance, membership, purchase, or payment.');
    } catch (cause) {
      Alert.alert('Request not sent', cause instanceof Error ? cause.message : 'Please try again.');
    } finally { setBusy(false); }
  };
  const openDetails = (item: DiscoveryItem) => {
    if (item.kind === 'person') router.push(`/student/${item.person.identity?.type || 'demo'}/${item.person.profile?.id || item.person.author.id}` as never);
    else setDetailItem(item);
  };
  const retryCurrent = () => {
    if (section !== 'people') { void loadDiscoveryRecords(); return; }
    setPeopleState('loading'); setPeopleError('');
    void studentDirectoryService.list({ limit: 300 }).then((page) => { setProfiles(page.students.filter((profile) => !(profile.identity.type === 'real' && profile.id === user.id))); setPeopleState('ready'); })
      .catch((cause) => { setPeopleError(cause instanceof Error ? cause.message : 'Student profiles could not be loaded.'); setPeopleState('error'); });
  };
  const displayName = (item: DiscoveryItem) => item.kind === 'person' ? item.person.author.name : item.post.type === 'service' ? item.post.title : item.post.eventName || item.post.title;

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <Header hideGreeting showSearch={false} />
    <View style={styles.connectHeading}><Text style={styles.pageTitle}>Connect</Text><Text style={styles.pageSubtitle}>Find people, discover skills, build together.</Text></View>
    <View style={styles.segmentRow}>{sections.map((entry) => <Pressable key={entry.id} accessibilityRole="tab" accessibilityState={{ selected: section === entry.id }} onPress={() => { setSection(entry.id); setFilter('All'); setSkipped([]); setRequested([]); }} style={[styles.segment, section === entry.id && styles.segmentActive]}><Ionicons name={entry.icon} size={16} color={section === entry.id ? Colors.primary : Colors.textMuted}/><Text style={[styles.segmentText, section === entry.id && styles.segmentTextActive]}>{entry.title}</Text></Pressable>)}</View>
    <View style={styles.searchControls}>
      <View style={styles.searchRow}><Ionicons name="search-outline" size={17} color={Colors.textMuted}/><TextInput value={search} onChangeText={setSearch} placeholder={`Search ${sectionTitle.toLowerCase()}...`} placeholderTextColor={Colors.textMuted} style={styles.search}/>{search ? <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => { setSearch(''); setFilter('All'); }}><Ionicons name="close-circle" size={18} color={Colors.textMuted}/></Pressable> : null}</View>
      <Pressable accessibilityRole="button" accessibilityLabel={browseAll ? 'Switch to swipe deck' : 'Browse all suggestions'} accessibilityState={{ selected: browseAll }} onPress={() => setBrowseAll((value) => !value)} style={styles.browseButton}><Ionicons name={browseAll ? 'albums-outline' : 'list-outline'} size={16} color={Colors.textPrimary}/><Text style={styles.browseText}>{browseAll ? 'Swipe' : 'Browse'}</Text></Pressable>
    </View>
    {filterOptions.length > 0 ? <View style={styles.filterRow}><ScrollView horizontal style={styles.filterScroll} showsHorizontalScrollIndicator contentContainerStyle={styles.filters}>{['All', ...filterOptions].map((option) => <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: filter === option }} onPress={() => setFilter(option)} style={[styles.filterPill, filter === option && styles.filterPillActive]}><Text style={[styles.filterText, filter === option && styles.filterTextActive]}>{option}</Text></Pressable>)}</ScrollView></View> : <View style={styles.filtersSpacer}/ >}
    <View style={styles.deckArea}>
      {loading ? <CardSkeleton/> : error ? <EmptyState icon="cloud-offline-outline" title={`Couldn't load ${sectionTitle.toLowerCase()}`} description={error} actionTitle="Retry" onAction={retryCurrent} style={styles.empty}/> : candidates.length === 0 ? <EmptyState icon="sparkles-outline" title={allItems.length ? 'You’ve explored all current suggestions.' : section === 'services' ? 'No active student services found' : section === 'teammates' ? 'No open teammate roles found' : 'No students to discover'} description={allItems.length ? 'Review skipped suggestions, adjust filters, or browse all available records.' : 'New opportunities will appear here when students share them.'} actionTitle={skipped.length ? 'Review skipped' : filter !== 'All' || search ? 'Clear filters' : 'Refresh'} onAction={() => { if (skipped.length) { setSkipped([]); setRequested([]); } else if (filter !== 'All' || search) { setFilter('All'); setSearch(''); } else retryCurrent(); }} style={styles.empty}/> : browseAll ? <ScrollView contentContainerStyle={styles.browseList}>{candidates.map((item) => <Pressable key={item.id} onPress={() => openDetails(item)} style={styles.browseCard}><Avatar uri={item.kind === 'person' ? item.person.author.avatar : item.post.author.avatar} name={item.kind === 'person' ? item.person.author.name : item.post.author.name} size={42}/><View style={{ flex: 1, minWidth: 0 }}><Text style={styles.browseTitle} numberOfLines={2}>{displayName(item)}</Text><Text style={styles.browseSub} numberOfLines={2}>{item.kind === 'person' ? item.person.profile?.college : item.post.content}</Text></View><Ionicons name="chevron-forward" size={18} color={Colors.textMuted}/></Pressable>)}</ScrollView> : current ? <View style={[styles.cardWrap, { maxWidth: width > 720 ? 480 : 520 }]}><DiscoverySwipeCard key={current.id} ref={card} item={current} disabled={busy} onSkip={() => pass(current)} onInterest={() => beginRequest(current)}/><View style={styles.actions}><Pressable accessibilityRole="button" accessibilityLabel="Pass suggestion" onPress={() => card.current?.swipeLeft()} style={styles.action}><Ionicons name="close" size={20} color={Colors.textMuted}/><Text style={styles.actionText}>Pass</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="View full details" onPress={() => openDetails(current)} style={[styles.action, styles.detailAction]}><Ionicons name="document-text-outline" size={18} color={Colors.textPrimary}/><Text style={styles.actionText}>Details</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={actionTitle} onPress={() => card.current?.swipeRight()} style={[styles.action, styles.interested]}><Ionicons name="arrow-forward" size={18} color={Colors.textOnPrimary}/><Text style={styles.interestedText}>{actionButtonLabel}</Text></Pressable></View>{skipped.length > 0 ? <Pressable accessibilityRole="button" accessibilityLabel="Undo last pass" onPress={() => setSkipped((ids) => ids.slice(0, -1))} style={styles.undo}><Ionicons name="arrow-undo-outline" size={15} color={Colors.primary}/><Text style={styles.undoText}>Undo last pass</Text></Pressable> : null}</View> : null}
    </View>
    <Modal visible={Boolean(requestItem)} transparent animationType="slide" onRequestClose={() => { setRequestItem(null); setRequestUnavailable(''); }}><View style={styles.scrim}><View style={styles.sheet}><View style={styles.sheetHandle}/><View style={styles.sheetHeader}><Text style={styles.sheetTitle}>{section === 'services' ? 'Interested in this service?' : section === 'teammates' ? 'Request to join' : 'Send a connect request'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => { setRequestItem(null); setRequestUnavailable(''); }}><Ionicons name="close" size={22} color={Colors.textMuted}/></Pressable></View>{requestItem ? <><Text style={styles.sheetSub}>{displayName(requestItem)}</Text>{requestItem.kind === 'post' && requestItem.post.servicePricing ? <Text style={styles.sheetMuted}>{requestItem.post.servicePricing} · No purchase or payment is created by this request.</Text> : null}{requestItem.kind === 'person' && requestItem.person.identity?.type === 'demo' ? <Text style={styles.sheetMuted}>This demo profile cannot receive a request through STUDOS.</Text> : null}{requestUnavailable ? <Text style={styles.unavailableNotice}>{requestUnavailable}</Text> : null}<Text style={styles.inputLabel}>{section === 'teammates' ? 'Introduce your relevant skills' : 'Message'}</Text><TextInput value={message} onChangeText={setMessage} placeholder={section === 'services' ? 'Describe what you need, timeline, and details…' : 'Share a short introduction…'} placeholderTextColor={Colors.textMuted} multiline maxLength={2000} style={styles.messageInput}/><Text style={styles.sheetMuted}>A request stays pending until the recipient responds. It does not create membership or a purchase.</Text><Pressable accessibilityRole="button" onPress={() => void submitRequest()} disabled={section === 'teammates' || busy || !message.trim() || (requestItem.kind === 'person' && requestItem.person.identity?.type !== 'real')} style={[styles.submit, (section === 'teammates' || busy || !message.trim() || (requestItem.kind === 'person' && requestItem.person.identity?.type !== 'real')) && styles.disabled]}>{busy ? <ActivityIndicator color={Colors.textOnPrimary}/> : <Text style={styles.submitText}>Send Request</Text>}</Pressable></> : null}</View></View></Modal>
    <Modal visible={Boolean(detailItem)} transparent animationType="fade" onRequestClose={() => setDetailItem(null)}><View style={styles.scrim}><View style={styles.detailSheet}><Pressable accessibilityRole="button" onPress={() => setDetailItem(null)} style={styles.closeDetail}><Ionicons name="close" size={21} color={Colors.textMuted}/></Pressable>{detailItem ? <><Text style={styles.sheetTitle}>{displayName(detailItem)}</Text><Text style={styles.sheetSub}>{detailItem.kind === 'person' ? [detailItem.person.profile?.degree, detailItem.person.profile?.branch, detailItem.person.profile?.college].filter(Boolean).join(' · ') : [detailItem.post.category, detailItem.post.author.name].filter(Boolean).join(' · ')}</Text><ScrollView style={{ maxHeight: 360 }}><Text style={styles.detailBody}>{detailItem.kind === 'person' ? detailItem.person.profile?.shortBio || 'No public biography has been added.' : detailItem.post.content}</Text>{detailItem.kind === 'person' ? <Text style={styles.detailBody}>{unique(detailItem.person.skills).join(' · ')}</Text> : <Text style={styles.detailBody}>{unique(detailItem.post.skills || []).join(' · ')}</Text>}</ScrollView></> : null}</View></View></Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  connectHeading: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: Spacing.screenPadding, paddingTop: 7, paddingBottom: 7 },
  pageTitle: { color: Colors.textPrimary, fontSize: Typography.title2, lineHeight: 29, fontWeight: Typography.bold },
  pageSubtitle: { color: Colors.textMuted, fontSize: Typography.caption, lineHeight: 18, marginTop: 2 },
  searchControls: { maxWidth: 720, width: '100%', alignSelf: 'center', paddingHorizontal: Spacing.screenPadding, paddingTop: 12, paddingBottom: 2, flexDirection: 'row', alignItems: 'center', gap: 8 },
  browseButton: { minHeight: 42, borderRadius: 13, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface },
  browseText: { color: Colors.textPrimary, fontSize: Typography.caption, fontWeight: Typography.semiBold },
  segmentRow: { maxWidth: 720, width: '100%', alignSelf: 'center', flexDirection: 'row', paddingHorizontal: Spacing.screenPadding, gap: 6, marginTop: 8 },
  segment: { flex: 1, minWidth: 0, minHeight: 42, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  segmentActive: { borderBottomColor: Colors.primary },
  segmentText: { color: Colors.textMuted, fontSize: 11, fontWeight: Typography.semiBold },
  segmentTextActive: { color: Colors.textPrimary },
  searchRow: { flex: 1, minWidth: 0, minHeight: 42, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 13, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  search: { flex: 1, minWidth: 0, color: Colors.textPrimary, fontSize: 13, paddingVertical: 8, outlineStyle: 'none' as any },
  filterRow: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: Spacing.screenPadding, marginTop: 10, marginBottom: 8 },
  filterScroll: { width: '100%', flexGrow: 0 },
  filters: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 2, paddingRight: 4 },
  filterPill: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  filterPillActive: { backgroundColor: Colors.primarySubtle, borderColor: Colors.primary },
  filterText: { color: Colors.textMuted, fontSize: 11, fontWeight: Typography.medium },
  filterTextActive: { color: Colors.primary, fontWeight: Typography.semiBold },
  filtersSpacer: { height: 8 },
  deckArea: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6 },
  cardWrap: { flex: 1, minHeight: 0, width: '100%', gap: 12 },
  actions: { minHeight: 48, flexDirection: 'row', gap: 8 },
  action: { flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: 4, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 },
  detailAction: { flex: 1.2 },
  actionText: { color: Colors.textPrimary, fontSize: 10, fontWeight: Typography.semiBold },
  interested: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  interestedText: { color: Colors.textOnPrimary, fontSize: 11, fontWeight: Typography.bold },
  undo: { alignSelf: 'center', minHeight: 32, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5 },
  undoText: { color: Colors.primary, fontSize: 11, fontWeight: Typography.medium },
  empty: { width: '100%', maxWidth: 520, alignSelf: 'center' },
  browseList: { width: '100%', maxWidth: 640, gap: 9, paddingVertical: 6 },
  browseCard: { minHeight: 76, padding: 12, borderRadius: 15, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, flexDirection: 'row', alignItems: 'center', gap: 11 },
  browseTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: Typography.semiBold },
  browseSub: { color: Colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: Colors.overlay },
  sheet: { width: '100%', maxWidth: 680, alignSelf: 'center', maxHeight: '88%', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border },
  sheetHandle: { width: 38, height: 4, borderRadius: 4, backgroundColor: Colors.textMuted, opacity: 0.4, alignSelf: 'center', marginBottom: 18 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sheetTitle: { color: Colors.textPrimary, fontSize: 20, lineHeight: 27, fontWeight: Typography.bold, flex: 1 },
  sheetSub: { color: Colors.primary, fontSize: 14, fontWeight: Typography.semiBold, marginTop: 10 },
  sheetMuted: { color: Colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 8 },
  unavailableNotice: { color: Colors.accentAmber, fontSize: 12, lineHeight: 19, marginTop: 12, padding: 11, borderRadius: 11, backgroundColor: Colors.accentAmberSubtle },
  inputLabel: { color: Colors.textPrimary, fontSize: 12, fontWeight: Typography.semiBold, marginTop: 18, marginBottom: 7 },
  messageInput: { minHeight: 110, maxHeight: 180, borderWidth: 1, borderColor: Colors.border, borderRadius: 13, backgroundColor: Colors.background, color: Colors.textPrimary, padding: 12, textAlignVertical: 'top', fontSize: 14 },
  submit: { minHeight: 50, marginTop: 18, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: Colors.textOnPrimary, fontSize: 14, fontWeight: Typography.bold },
  disabled: { opacity: 0.45 },
  detailSheet: { alignSelf: 'center', width: '100%', maxWidth: 620, maxHeight: '86%', padding: 22, borderTopLeftRadius: 23, borderTopRightRadius: 23, backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border },
  closeDetail: { alignSelf: 'flex-end', width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  detailBody: { color: Colors.textSecondary, fontSize: 14, lineHeight: 22, marginTop: 14 },
});

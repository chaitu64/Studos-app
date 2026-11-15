import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommunityPost, StudyResource } from '../types';
import { postService } from '../services/postService';
import { listSavedResources } from '../services/resourceApi';
import { resourceReaderRoute } from '../navigation/resourceReader';

export default function SavedContentScreen() {
  const [posts, setPosts] = useState<CommunityPost[]>([]); const [resources, setResources] = useState<StudyResource[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => { let active = true; void Promise.all([postService.saved(), listSavedResources()]).then(([savedPosts, savedResources]) => { if (active) { setPosts(savedPosts); setResources(savedResources); } }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load saved content.'); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.heading}>Saved content</Text><Text style={styles.subtitle}>Posts and study resources you bookmarked.</Text>
    {loading ? <View style={styles.state}><ActivityIndicator color="#FF3B30"/><Text style={styles.subtitle}>Loading saved content…</Text></View> : error ? <Text style={styles.error}>{error}</Text> : null}
    {!loading && !error ? <>
      <Text style={styles.section}>SAVED POSTS · {posts.length}</Text>
      {posts.map((post) => <TouchableOpacity key={post.id} style={styles.card} onPress={() => router.push({ pathname: '/post/[id]', params: { id: post.id } })}><Text style={styles.cardTitle}>{post.title}</Text><Text style={styles.cardBody} numberOfLines={3}>{post.content}</Text><Text style={styles.meta}>{post.author.name} · {post.author.college || 'STUDOS'}</Text></TouchableOpacity>)}
      {!posts.length ? <Text style={styles.empty}>No saved posts yet.</Text> : null}
      <Text style={[styles.section, { marginTop: 22 }]}>SAVED STUDY RESOURCES · {resources.length}</Text>
      {resources.map((resource) => <TouchableOpacity key={resource.id} style={styles.card} onPress={() => router.push(resourceReaderRoute(resource))}><Text style={styles.cardTitle}>{resource.pdfFileName || resource.title}</Text><Text style={styles.cardBody}>{[resource.subject, resource.studyYear ? `Year ${resource.studyYear}` : null, resource.semester ? `Semester ${resource.semester}` : null, resource.fileSizeMb != null ? `${resource.fileSizeMb.toFixed(2)} MB` : null].filter(Boolean).join(' · ')}</Text><Text style={styles.meta}>{resource.uploader.name}</Text></TouchableOpacity>)}
      {!resources.length ? <Text style={styles.empty}>No saved study resources yet.</Text> : null}
    </> : null}
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#090B0F' }, content: { padding: 20, paddingBottom: 36 }, heading: { color: '#FFF', fontSize: 26, fontWeight: '800' }, subtitle: { color: '#A5ACBA', fontSize: 13, marginTop: 5 }, section: { color: '#FF7770', fontWeight: '800', fontSize: 11, letterSpacing: .8, marginTop: 24, marginBottom: 10 }, card: { backgroundColor: '#121624', borderColor: '#252C3D', borderWidth: 1, borderRadius: 13, padding: 14, marginBottom: 9 }, cardTitle: { color: '#FFF', fontWeight: '700', fontSize: 15 }, cardBody: { color: '#C3C8D2', lineHeight: 19, fontSize: 13, marginTop: 6 }, meta: { color: '#7F8797', fontSize: 11, marginTop: 8 }, empty: { color: '#A5ACBA', paddingVertical: 12, fontSize: 13 }, state: { padding: 24, alignItems: 'center', gap: 10 }, error: { color: '#FF8C86', marginTop: 20 } });

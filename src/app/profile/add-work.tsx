import React, { useEffect } from 'react';
import { router } from 'expo-router';
import { PostComposerModal } from '../../components/modals/PostComposerModal';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import type { CommunityPost } from '../../types';

type NewPost = Omit<CommunityPost, 'id' | 'createdAt' | 'createdAtTimestamp' | 'likesCount' | 'commentsCount' | 'author'>;

export default function AddPortfolioWorkRoute() {
  const { addCommunityPost } = useApp();
  const { session } = useAuth();
  useEffect(() => { if (!session) router.replace('/login' as never); }, [session]);
  const close = () => router.canGoBack() ? router.back() : router.replace('/(tabs)/profile' as never);
  return <PostComposerModal visible={Boolean(session)} initialType="project" allowedTypes={['project']} onClose={close} onSubmit={(post: NewPost) => addCommunityPost(post)} />;
}

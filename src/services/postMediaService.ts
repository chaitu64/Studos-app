import { ImagePickerAsset } from 'expo-image-picker';
import { requireSupabase } from './supabase';

const bucket = 'studos-media';

export async function uploadPostImages(assets: ImagePickerAsset[]): Promise<string[]> {
  if (!assets.length) return [];
  const db = requireSupabase();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error('Sign in to attach images.');
  const paths: string[] = [];
  for (const asset of assets) {
    const response = await fetch(asset.uri);
    if (!response.ok) throw new Error('Could not read a selected image.');
    const blob = await response.blob();
    const extension = (asset.fileName?.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase();
    const path = `${user.id}/posts/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
    const { error } = await db.storage.from(bucket).upload(path, blob, { contentType: asset.mimeType || 'image/jpeg', upsert: false });
    if (error) throw error;
    paths.push(path);
  }
  return paths;
}

export async function signPostImagePaths(paths: string[]): Promise<string[]> {
  const db = requireSupabase();
  return Promise.all(paths.map(async (path) => {
    if (/^https?:\/\//i.test(path)) return path;
    const { data, error } = await db.storage.from(bucket).createSignedUrl(path, 3600);
    if (error) return '';
    return data.signedUrl;
  })).then((urls) => urls.filter(Boolean));
}

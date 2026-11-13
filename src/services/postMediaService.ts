import { ImagePickerAsset } from 'expo-image-picker';
import { requireSupabase } from './supabase';

const bucket = 'studos-media';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function uploadPostImages(assets: ImagePickerAsset[]): Promise<string[]> {
  if (!assets.length) return [];
  const db = requireSupabase();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error('Sign in to attach images.');
  const paths: string[] = [];
  for (const asset of assets) {
    const fileName = asset.fileName || asset.uri.split(/[?#]/)[0].split('/').pop() || '';
    const extension = fileName.split('.').pop()?.toLowerCase();
    const inferredMimeType = extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : '';
    const mimeType = (asset.mimeType || inferredMimeType).toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(mimeType)) throw new Error('Choose a JPEG, PNG, or WebP image.');
    if (typeof asset.fileSize === 'number' && asset.fileSize > MAX_IMAGE_BYTES) throw new Error('Images must be 10 MB or smaller.');
    const response = await fetch(asset.uri);
    if (!response.ok) throw new Error('Could not read a selected image.');
    const blob = await response.blob();
    if (blob.size > MAX_IMAGE_BYTES) throw new Error('Images must be 10 MB or smaller.');
    const safeExtension = (fileName.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase();
    const path = `${user.id}/posts/${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExtension}`;
    const { error } = await db.storage.from(bucket).upload(path, blob, { contentType: mimeType, upsert: false });
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

import type { StudyResourceLinkType } from '../types';

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export function normalizeResourceLinkUrl(type: StudyResourceLinkType, rawUrl: string): string {
  let url: URL;
  try { url = new URL(rawUrl.trim()); } catch { throw new Error('Enter a valid HTTPS link.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error('Use a public HTTPS link without account credentials.');

  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (type === 'youtube') {
    if (!['youtube.com', 'm.youtube.com', 'youtu.be'].includes(host)) throw new Error('Use a youtube.com or youtu.be video link.');
    let videoId = '';
    if (host === 'youtu.be') videoId = url.pathname.split('/').filter(Boolean)[0] || '';
    else if (url.pathname === '/watch') videoId = url.searchParams.get('v') || '';
    else videoId = url.pathname.match(/^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})\/?$/)?.[1] || '';
    if (!VIDEO_ID.test(videoId)) throw new Error('Enter a direct YouTube video link, not a search or channel page.');
    return `https://www.youtube.com/watch?v=${videoId}`;
  }

  if (!['chatgpt.com', 'chat.openai.com'].includes(host)) throw new Error('Use a public ChatGPT shared-conversation link.');
  const shareId = url.pathname.match(/^\/share\/([A-Za-z0-9_-]{8,})\/?$/)?.[1];
  if (!shareId) throw new Error('Use a ChatGPT link with a /share/ path. Private conversation links are not supported.');
  return `https://chatgpt.com/share/${shareId}`;
}

export function validateStudyResourceLinkDraft(type: StudyResourceLinkType, title: string, url: string) {
  if (type !== 'youtube' && type !== 'chatgpt') throw new Error('Choose YouTube Video or ChatGPT Shared Conversation.');
  const safeTitle = title.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
  if (safeTitle.length < 3 || safeTitle.length > 120) throw new Error('Title must be between 3 and 120 characters.');
  if (url.trim().length > 2048) throw new Error('The URL is too long.');
  return { title: safeTitle, url: normalizeResourceLinkUrl(type, url) };
}

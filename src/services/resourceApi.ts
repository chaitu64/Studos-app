import { Platform } from 'react-native';
import { StudyResource } from '../types';

const localHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
export const RESOURCE_API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${localHost}:5001`;

type BackendResource = {
  id: string; type: StudyResource['type']; title: string; description: string; subject: string;
  academicYear: string; semester?: string; branch?: string; pdfUrl: string; thumbnailUrl?: string | null;
  pageCount: number; fileSize: number; fileType: 'application/pdf'; fileName: string; aiSummary?: string | null;
  summaryStatus?: StudyResource['summaryStatus']; keyTopics?: string[]; createdAt?: string;
  thumbnailStatus: StudyResource['thumbnailStatus'];
};

export type PdfUpload = { uri: string; name: string; mimeType?: string; size?: number };

export const toStudyResource = (resource: BackendResource, uploader: StudyResource['uploader']): StudyResource => ({
  id: resource.id, type: resource.type || 'notes', title: resource.title, description: resource.description,
  subject: resource.subject, academicYear: resource.academicYear, semester: resource.semester, branch: resource.branch,
  pdfUrl: resource.pdfUrl, thumbnailUrl: resource.thumbnailUrl || undefined, pageCount: resource.pageCount,
  fileSize: resource.fileSize, fileType: 'application/pdf', fileName: resource.fileName,
  aiSummary: resource.aiSummary || undefined, summaryStatus: resource.summaryStatus,
  topics: resource.keyTopics || [], thumbnailStatus: resource.thumbnailStatus,
  uploader, uploadedAt: resource.createdAt || 'Just now',
});

export async function uploadPdfResource(file: PdfUpload, fields: Record<string, string>, uploader: StudyResource['uploader']) {
  const body = new FormData();
  body.append('pdf', { uri: file.uri, name: file.name, type: file.mimeType || 'application/pdf' } as never);
  Object.entries(fields).forEach(([key, value]) => body.append(key, value));
  const response = await fetch(`${RESOURCE_API_URL}/api/resources`, { method: 'POST', body });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'PDF upload failed');
  return toStudyResource(payload, uploader);
}

export async function fetchResource(resourceId: string, uploader: StudyResource['uploader']) {
  const response = await fetch(`${RESOURCE_API_URL}/api/resources/${encodeURIComponent(resourceId)}`);
  if (!response.ok) throw new Error('Resource unavailable');
  return toStudyResource(await response.json(), uploader);
}

export const pageImageUrl = (resourceId: string, page: number) => `${RESOURCE_API_URL}/api/resources/${encodeURIComponent(resourceId)}/pages/${page}.png`;

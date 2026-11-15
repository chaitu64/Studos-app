import type { Href } from 'expo-router';
import type { StudyResource } from '../types';
import { normalizeDriveUrl } from '../services/driveUrl';

export function resourceReaderRoute(resource: StudyResource): Href {
  const fileName = resource.pdfFileName || resource.fileName || resource.title;
  const looksLikePdf = resource.resourceKind === 'pdf'
    || resource.driveMimeType === 'application/pdf'
    || /\.pdf(?:$|[?#])/i.test(fileName);
  if (!looksLikePdf || !resource.pdfUrl) return { pathname: '/resource/[id]', params: { id: resource.id } };

  try {
    const drive = normalizeDriveUrl(resource.pdfUrl);
    if (drive.kind !== 'file') return { pathname: '/resource/[id]', params: { id: resource.id } };
    return {
      pathname: '/resource/[id]',
      params: {
        id: resource.id,
        pdfUrl: drive.url,
        driveFileId: resource.driveFileId || drive.id,
        title: resource.title,
        subject: resource.subject,
        fileName,
        pdfFileName: resource.pdfFileName || fileName,
        youtubeLink: resource.youtubeLink || '',
        createdAt: resource.createdAt || '',
        type: resource.type,
        academicYear: resource.academicYear,
        studyYear: resource.studyYear || '',
        semester: resource.semester || '',
        regulation: resource.regulation || '',
        college: resource.college || '',
      },
    };
  } catch {
    return { pathname: '/resource/[id]', params: { id: resource.id } };
  }
}

export function normalizeDriveUrl(input: string) {
  let url: URL;
  try { url = new URL(input.trim()); } catch { throw new Error('Enter a valid Google Drive sharing URL.'); }
  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'drive.google.com' || url.port || url.username || url.password) throw new Error('Use an HTTPS Google Drive file link.');
  const folderMatch = url.pathname.match(/^\/drive\/folders\/([A-Za-z0-9_-]+)\/?$/);
  const folderId = folderMatch?.[1];
  if (folderId && /^[A-Za-z0-9_-]{10,}$/.test(folderId)) {
    return { id: folderId, url: `https://drive.google.com/drive/folders/${folderId}`, kind: 'folder' as const };
  }
  let id: string | null = null;
  const pathMatch = url.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]+)\/(?:view)?\/?$/);
  if (pathMatch) id = pathMatch[1];
  else if (url.pathname === '/open' || url.pathname === '/uc') id = url.searchParams.get('id');
  if (!id || !/^[A-Za-z0-9_-]{10,}$/.test(id)) throw new Error('This link does not contain a valid Google Drive file ID.');
  return { id, url: `https://drive.google.com/file/d/${id}/view`, kind: 'file' as const };
}

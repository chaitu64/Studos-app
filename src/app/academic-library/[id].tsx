import { useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';

export default function AcademicLibraryResourceRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  useEffect(() => {
    if (id) router.replace({ pathname: '/resource/[id]', params: { id: String(id) } });
  }, [id]);
  return null;
}

import { router } from 'expo-router';

/** Navigate back when this screen has history; otherwise return to the Home tabs. */
export function safeBack(fallback = '/(tabs)') {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallback as never);
}

/**
 * Utility functions for managing Supabase auth storage.
 * Provides selective cleanup of auth tokens without clearing other app data.
 */

/**
 * Clears only Supabase authentication keys from localStorage.
 * This is safer than localStorage.clear() as it preserves app preferences.
 */
export function clearSupabaseAuthKeys(storage: Storage = localStorage): void {
  const keysToRemove: string[] = [];

  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && isSupabaseAuthKey(key)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => storage.removeItem(key));
}

/**
 * Checks if a storage key is a Supabase auth-related key.
 */
function isSupabaseAuthKey(key: string): boolean {
  // supabase-js v2: sb-<projectRef>-auth-token
  if (key.startsWith("sb-") && key.includes("-auth-token")) {
    return true;
  }
  // Legacy key format
  if (key === "supabase.auth.token") {
    return true;
  }
  // Code verifier for PKCE flow
  if (key.startsWith("sb-") && key.includes("code-verifier")) {
    return true;
  }
  return false;
}

/**
 * Builds the current path for redirect (pathname + search + hash).
 * Returns the full path ready to be used as a redirect target.
 */
export function getCurrentPathForRedirect(location: {
  pathname: string;
  search: string;
  hash: string;
}): string {
  return `${location.pathname}${location.search}${location.hash}`;
}

/**
 * Sanitizes a redirect path to ensure it's internal (starts with "/")
 * and not pointing to /auth (to avoid loops).
 * Returns "/" as fallback for invalid paths.
 */
export function sanitizeRedirectPath(redirect: string | null): string {
  if (!redirect) return "/";
  
  // Must be internal path (starts with /)
  if (!redirect.startsWith("/")) return "/";
  
  // Avoid redirect loops to /auth
  if (redirect.startsWith("/auth")) return "/";
  
  return redirect;
}

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'public_site_favorites';
const SYNC_EVENT = 'public_favorites_changed';

function getFavorites(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    // Ensure it's a valid array of strings
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id: unknown) => typeof id === 'string' && id.length > 0);
  } catch {
    return [];
  }
}

function saveFavorites(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  // Dispatch custom event for same-tab sync between hook instances
  window.dispatchEvent(new CustomEvent(SYNC_EVENT));
}

export function usePublicFavorites() {
  const [favorites, setFavorites] = useState<string[]>(getFavorites);

  // Sync across tabs (StorageEvent) AND within the same tab (custom event)
  useEffect(() => {
    const syncFromStorage = () => {
      setFavorites(getFavorites());
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) syncFromStorage();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(SYNC_EVENT, syncFromStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(SYNC_EVENT, syncFromStorage);
    };
  }, []);

  const toggleFavorite = useCallback((propertyId: string) => {
    const current = getFavorites(); // Read fresh from localStorage
    const next = current.includes(propertyId)
      ? current.filter(id => id !== propertyId)
      : [...current, propertyId];
    saveFavorites(next);
    setFavorites(next);
  }, []);

  const isFavorite = useCallback((propertyId: string) => {
    return favorites.includes(propertyId);
  }, [favorites]);

  return { favorites, toggleFavorite, isFavorite, count: favorites.length };
}

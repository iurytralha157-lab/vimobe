import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'public_site_favorites';

function getFavorites(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveFavorites(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function usePublicFavorites() {
  const [favorites, setFavorites] = useState<string[]>(getFavorites);

  // Sync across tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setFavorites(getFavorites());
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const toggleFavorite = useCallback((propertyId: string) => {
    setFavorites(prev => {
      const next = prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId];
      saveFavorites(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback((propertyId: string) => {
    return favorites.includes(propertyId);
  }, [favorites]);

  return { favorites, toggleFavorite, isFavorite, count: favorites.length };
}

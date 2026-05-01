import { useState, useCallback, useRef } from 'react';
import { fetchCacheStatus, fetchCachedResult } from '@/lib/supabase';
import type { CachedProject } from '@/lib/supabase';

/**
 * Hook centralizado para manejar el estado de caché de proyectos.
 * Consulta Supabase en lote cuando cambia la lista de carpetas visibles.
 */
export function useProjectCache() {
  const [cacheMap, setCacheMap] = useState<Record<string, CachedProject>>({});
  const [loadingCache, setLoadingCache] = useState(false);
  // Evitar consultas duplicadas para el mismo conjunto de IDs
  const lastQueried = useRef<string>('');

  const loadCacheStatus = useCallback(async (folderIds: string[]) => {
    if (!folderIds.length) return;
    const key = [...folderIds].sort().join(',');
    if (key === lastQueried.current) return; // mismo set, no re-consultar
    lastQueried.current = key;

    setLoadingCache(true);
    try {
      const map = await fetchCacheStatus(folderIds);
      setCacheMap(prev => ({ ...prev, ...map }));
    } finally {
      setLoadingCache(false);
    }
  }, []);

  /**
   * Carga instantánea del resultado cacheado de un proyecto.
   * Retorna { result_json, processed_at } o null si no está en caché.
   */
  const loadCachedResult = useCallback(async (folderId: string) => {
    return fetchCachedResult(folderId);
  }, []);

  /**
   * Invalida la caché local de un folder (para forzar re-consulta tras nuevo proceso).
   */
  const invalidate = useCallback((folderId: string) => {
    setCacheMap(prev => {
      const next = { ...prev };
      delete next[folderId];
      return next;
    });
    lastQueried.current = '';
  }, []);

  return { cacheMap, loadingCache, loadCacheStatus, loadCachedResult, invalidate };
}

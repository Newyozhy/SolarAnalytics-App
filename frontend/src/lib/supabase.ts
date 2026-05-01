import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://gdahzpiydxlkzrowihlz.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkYWh6cGl5ZHhsa3pyb3dpaGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1OTgxMjUsImV4cCI6MjA5MzE3NDEyNX0.Ibv8kqG-72_YvRxcAVQbbiJZTdEB2bqQI9a7qH8YekY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface CachedProject {
  id: string;
  folder_id: string;
  folder_name: string;
  processed_at: string;
  metadata: {
    total_records?: number;
    csv_files?: string[];
    processing_date?: string;
  };
}

/**
 * Consulta Supabase directamente para saber cuáles folder_ids ya están cacheados.
 * Retorna un mapa { folder_id -> CachedProject }
 */
export async function fetchCacheStatus(folderIds: string[]): Promise<Record<string, CachedProject>> {
  if (!folderIds.length) return {};

  const { data, error } = await supabase
    .from('processed_projects')
    .select('id, folder_id, folder_name, processed_at, metadata')
    .in('folder_id', folderIds);

  if (error) {
    console.warn('Supabase cache lookup error:', error.message);
    return {};
  }

  const map: Record<string, CachedProject> = {};
  for (const row of data ?? []) {
    map[row.folder_id] = row;
  }
  return map;
}

/**
 * Obtiene los proyectos procesados más recientes (para el panel "Recientes").
 */
export async function fetchRecentProjects(limit = 8): Promise<CachedProject[]> {
  const { data, error } = await supabase
    .from('processed_projects')
    .select('id, folder_id, folder_name, processed_at, metadata')
    .order('processed_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('Supabase recent projects error:', error.message);
    return [];
  }

  return data ?? [];
}

/**
 * Obtiene el result_json completo de un proyecto cacheado.
 * Úsalo cuando el usuario quiere ver un proyecto ya procesado sin volver a descargarlo.
 */
export async function fetchCachedResult(folderId: string): Promise<any | null> {
  const { data, error } = await supabase
    .from('processed_projects')
    .select('result_json, processed_at')
    .eq('folder_id', folderId)
    .single();

  if (error || !data) return null;
  return data;
}

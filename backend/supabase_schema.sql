-- ══════════════════════════════════════════════════
-- ZTE SPU Solar Analytics — Supabase Schema
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ══════════════════════════════════════════════════

-- Tabla principal de proyectos procesados (caché)
CREATE TABLE IF NOT EXISTS processed_projects (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    folder_id       TEXT NOT NULL UNIQUE,        -- ID de carpeta en Google Drive
    folder_name     TEXT NOT NULL,               -- Nombre legible del proyecto
    processed_at    TIMESTAMPTZ DEFAULT NOW(),   -- Última vez que fue procesado
    result_json     JSONB,                       -- Datos completos (daily_gen, battery_soc, etc.)
    metadata        JSONB DEFAULT '{}'::JSONB,   -- Datos extra (num_rows, duración, etc.)
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para lookups rápidos por folder_id
CREATE INDEX IF NOT EXISTS idx_processed_projects_folder_id
    ON processed_projects (folder_id);

-- Índice para ordenar por fecha (listado reciente)
CREATE INDEX IF NOT EXISTS idx_processed_projects_processed_at
    ON processed_projects (processed_at DESC);

-- RLS (Row Level Security) — activar para producción
ALTER TABLE processed_projects ENABLE ROW LEVEL SECURITY;

-- Política: lectura pública (anon key puede leer)
CREATE POLICY "Allow public read" ON processed_projects
    FOR SELECT USING (true);

-- Política: escritura solo desde service_role (backend)
CREATE POLICY "Allow service role write" ON processed_projects
    FOR ALL USING (auth.role() = 'service_role');

-- Vista auxiliar: últimos 10 proyectos procesados
CREATE OR REPLACE VIEW recent_projects AS
SELECT
    id,
    folder_id,
    folder_name,
    processed_at,
    metadata
FROM processed_projects
ORDER BY processed_at DESC
LIMIT 10;

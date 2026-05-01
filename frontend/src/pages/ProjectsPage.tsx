import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { FolderTree } from '@/components/explorer/FolderTree';
import { FolderContent } from '@/components/explorer/FolderContent';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ResultsDashboard } from '@/components/dashboard/ResultsDashboard';
import { projectsApi } from '@/api/projects';
import type { Folder } from '@/api/projects';
import { useProjectCache } from '@/hooks/useProjectCache';
import { cn } from '@/lib/utils';

interface BreadcrumbItem { id: string; name: string; }


// Processing status step
const processingSteps = [
  { key: 'downloading', label: 'Descargando datos de Drive' },
  { key: 'processing', label: 'Analizando CSVs' },
  { key: 'saving', label: 'Guardando en caché' },
  { key: 'completed', label: 'Completado' },
];

export function ProjectsPage() {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Navigation state — split-pane Windows Explorer
  const [rootFolders, setRootFolders] = useState<Folder[]>([]);
  const [currentFolders, setCurrentFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: 'root', name: 'Paneles Solares' }
  ]);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Cache
  const { cacheMap, loadCacheStatus, loadCachedResult, invalidate } = useProjectCache();

  // Processing
  const [processingFolder, setProcessingFolder] = useState<Folder | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>('pending');
  const [jobResult, setJobResult] = useState<any>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [fromCache, setFromCache] = useState(false);

  // Load folders at current breadcrumb level
  const loadFolders = useCallback(async (parentId: string) => {
    setLoading(true);
    try {
      const res = parentId === 'root'
        ? await projectsApi.getRootFolders()
        : await projectsApi.getSubfolders(parentId);
      const folders = res.folders || [];
      setCurrentFolders(folders);
      if (parentId === 'root') setRootFolders(folders);
      // Load cache status for the visible folders in parallel
      if (folders.length > 0) {
        loadCacheStatus(folders.map(f => f.id));
      }
    } catch {
      setCurrentFolders([]);
    } finally {
      setLoading(false);
    }
  }, [loadCacheStatus]);

  useEffect(() => {
    const current = breadcrumbs[breadcrumbs.length - 1];
    loadFolders(current.id);
  }, [breadcrumbs, loadFolders]);

  // Load cached result instantly from Supabase (no processing needed)
  const handleViewCached = useCallback(async (folder: Folder) => {
    const cached = await loadCachedResult(folder.id);
    if (cached?.result_json) {
      setJobResult(cached.result_json);
      setProcessingFolder(folder);
      setFromCache(true);
      setShowResults(true);
    }
  }, [loadCachedResult]);

  const handleNavigate = (folder: Folder) => {
    setSelectedFolder(null);
    setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleBreadcrumbClick = (index: number) => {
    setSelectedFolder(null);
    setBreadcrumbs(prev => prev.slice(0, index + 1));
  };

  // Tree panel lazy-load
  const handleTreeExpand = async (folder: Folder): Promise<Folder[]> => {
    try {
      const res = await projectsApi.getSubfolders(folder.id);
      return res.folders || [];
    } catch {
      return [];
    }
  };

  // Start processing
  const handleProcess = async (folder: Folder) => {
    setProcessingFolder(folder);
    setJobError(null);
    setJobResult(null);
    setJobStatus('pending');
    try {
      const res = await projectsApi.processProject({
        folder_id: folder.id,
        folder_name: folder.name,
      });
      setJobId(res.job_id);
    } catch (e: any) {
      setJobError(e?.message || 'Error al iniciar');
      setProcessingFolder(null);
    }
  };

  // Polling
  useEffect(() => {
    if (!jobId) return;
    const interval = setInterval(async () => {
      try {
        const data = await projectsApi.getJobStatus(jobId);
        setJobStatus(data.status);
        if (data.status === 'completed') {
          clearInterval(interval);
          setJobResult(data.result);
          setFromCache(data.from_cache ?? false);
          setJobId(null);
          setShowResults(true);
          // Refresh cache badge for this folder
          if (processingFolder) {
            invalidate(processingFolder.id);
            loadCacheStatus(currentFolders.map(f => f.id));
          }
        } else if (data.status === 'failed') {
          clearInterval(interval);
          setJobError(data.error || 'Error desconocido');
          setJobId(null);
          setProcessingFolder(null);
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [jobId, processingFolder, invalidate, loadCacheStatus, currentFolders]);

  const filteredFolders = currentFolders.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentStepIndex = processingSteps.findIndex(s => s.key === jobStatus);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-background">
      <Header
        breadcrumbs={breadcrumbs}
        onBreadcrumbClick={handleBreadcrumbClick}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Windows Explorer Layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT — Tree panel */}
        <div className="w-60 flex-shrink-0 border-r border-border bg-sidebar/50 overflow-y-auto overflow-x-hidden">
          <div className="px-3 py-2 border-b border-border">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Navegador
            </span>
          </div>
          <FolderTree
            roots={rootFolders}
            selectedId={selectedFolder?.id ?? null}
            onSelect={f => { setSelectedFolder(f); }}
            onExpand={handleTreeExpand}
          />
        </div>

        {/* RIGHT — Content panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {showResults && jobResult ? (
            <ResultsDashboard
              result={jobResult}
              fromCache={fromCache}
              onClose={() => { setShowResults(false); setJobResult(null); setFromCache(false); }}
            />
          ) : (
            <FolderContent
              folders={filteredFolders}
              loading={loading}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              selectedId={selectedFolder?.id ?? null}
              onSelect={setSelectedFolder}
              onNavigate={handleNavigate}
              onProcess={handleProcess}
              onViewCached={handleViewCached}
              processedMap={Object.fromEntries(
                Object.entries(cacheMap).map(([id, v]) => [
                  id,
                  { processedAt: new Date(v.processed_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) }
                ])
              )}
            />
          )}
        </div>
      </div>

      {/* Processing Modal */}
      <AnimatePresence>
        {(!!jobId || !!jobError) && (
          <Dialog open onOpenChange={() => {}}>
            <DialogContent
              className="sm:max-w-sm"
              showCloseButton={false}
            >
              <DialogHeader>
                <DialogTitle className="text-base font-display">
                  {jobError ? 'Error de procesamiento' : t('processing.title')}
                </DialogTitle>
              </DialogHeader>

              <div className="py-4 space-y-5">
                {/* Folder name */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,142,211,0.12)' }}>
                    <Loader2 className={cn('w-4 h-4 text-zte-blue', jobId && 'animate-spin')} />
                  </div>
                  <span className="text-sm font-medium truncate">{processingFolder?.name}</span>
                </div>

                {jobError ? (
                  <div className="flex items-start gap-2 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>{jobError}</p>
                  </div>
                ) : (
                  /* Step progress */
                  <div className="space-y-3">
                    {processingSteps.map((step, i) => {
                      const isDone = i < currentStepIndex || jobStatus === 'completed';
                      const isActive = step.key === jobStatus || (i === 2 && jobStatus === 'completed');
                      return (
                        <div key={step.key} className="flex items-center gap-3">
                          <div className={cn(
                            'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all',
                            isDone ? 'bg-zte-green border-zte-green' :
                            isActive ? 'border-zte-blue' : 'border-border'
                          )}>
                            {isDone
                              ? <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                              : isActive
                                ? <motion.div
                                    animate={{ scale: [1, 1.3, 1] }}
                                    transition={{ repeat: Infinity, duration: 1 }}
                                    className="w-2 h-2 rounded-full bg-zte-blue"
                                  />
                                : <div className="w-2 h-2 rounded-full bg-border" />
                            }
                          </div>
                          <span className={cn(
                            'text-sm',
                            isDone ? 'text-muted-foreground line-through' :
                            isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
                          )}>{step.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {jobError && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => { setJobError(null); setProcessingFolder(null); }}
                  >
                    Cerrar
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}

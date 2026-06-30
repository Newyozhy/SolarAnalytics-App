import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { FolderTree } from '@/components/explorer/FolderTree';
import { FolderContent } from '@/components/explorer/FolderContent';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AnalysisDashboard } from '@/components/analysis/AnalysisDashboard';
import { projectsApi } from '@/api/projects';
import type { Folder, SiteInfo } from '@/api/projects';
import { useProjectCache } from '@/hooks/useProjectCache';
import { useUIContext } from '@/App';
import { cn } from '@/lib/utils';

interface BreadcrumbItem { id: string; name: string; }

// processingSteps built inside component to use t()

export function ProjectsPage() {
  const { t } = useTranslation();
  const { setIsAnalysisView } = useUIContext();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const processingSteps = [
    { key: 'downloading', label: t('processing.downloading') },
    { key: 'processing',  label: t('processing.processing')  },
    { key: 'saving',      label: t('processing.saving')      },
    { key: 'completed',   label: t('processing.completed')   },
  ];

  // Tree panel collapse state (independent from sidebar)
  const [treePanelCollapsed, setTreePanelCollapsed] = useState(false);

  // Navigation state — split-pane Windows Explorer
  const [rootFolders, setRootFolders] = useState<Folder[]>([]);
  const [currentFolders, setCurrentFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: 'root', name: t('explorer.rootFolder') }
  ]);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Cache
  const { cacheMap, loadCacheStatus, loadCachedResult, invalidate } = useProjectCache();

  // Site info map: folder_id → SiteInfo (detecta si es sitio global)
  const [siteInfoMap, setSiteInfoMap] = useState<Record<string, SiteInfo>>({});

  // Processing
  const [processingFolder, setProcessingFolder] = useState<Folder | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>('pending');
  const [jobResult, setJobResult] = useState<any>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [batchResult, setBatchResult] = useState<any | null>(null);

  // Analysis dashboard state
  const [analysisTarget, setAnalysisTarget] = useState<{ id: string; name: string } | null>(null);

  // Sync analysis view with global context (triggers sidebar auto-collapse)
  useEffect(() => {
    setIsAnalysisView(!!analysisTarget);
    if (analysisTarget) {
      // Also auto-collapse the tree panel when entering analysis
      setTreePanelCollapsed(true);
    }
  }, [analysisTarget, setIsAnalysisView]);

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
        // Detectar sitios globales en segundo plano (sin bloquear la UI)
        folders.forEach(folder => {
          projectsApi.getSiteInfo(folder.id, folder.name)
            .then(info => {
              if (info.site_type === 'site') {
                setSiteInfoMap(prev => ({ ...prev, [folder.id]: info }));
              }
            })
            .catch(() => { /* Ignorar errores de detección */ });
        });
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
      setFromCache(true);
      setAnalysisTarget({ id: folder.id, name: folder.name });
    }
  }, [loadCachedResult]);

  const handleNavigate = (folder: Folder) => {
    setSelectedFolder(null);
    setSiteInfoMap({});  // Limpiar mapa al navegar (nueva carga)
    setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleBreadcrumbClick = (index: number) => {
    setSelectedFolder(null);
    setSiteInfoMap({});  // Limpiar mapa al navegar
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

  // Start processing (proyecto individual o sitio global — el backend detecta)
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

  // Analizar globalmente un sitio (misma llamada; el backend detecta que es 'site')
  const handleProcessGlobal = async (folder: Folder) => {
    handleProcess(folder);
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
          if (processingFolder) {
            if (data.result && data.result.project_type === 'dc_load_batch') {
              setBatchResult(data.result);
            } else {
              setAnalysisTarget({ id: processingFolder.id, name: processingFolder.name });
            }
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

  // Processed IDs set for FolderTree
  const processedIds = new Set(Object.keys(cacheMap));

  // Invalidar siteInfoMap de un folder cuando se reprocesa
  const handleInvalidateSiteInfo = (folderId: string) => {
    setSiteInfoMap(prev => {
      const next = { ...prev };
      delete next[folderId];
      return next;
    });
  };

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

        {/* LEFT — Tree panel (collapsible) */}
        <motion.div
          animate={{ width: treePanelCollapsed ? 44 : 240 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="flex-shrink-0 border-r border-border bg-sidebar/50 overflow-hidden"
        >
          <FolderTree
            roots={rootFolders}
            selectedId={selectedFolder?.id ?? null}
            onSelect={f => { setSelectedFolder(f); }}
            onExpand={handleTreeExpand}
            processedIds={processedIds}
            onOpenAnalysis={handleViewCached}
            isCollapsed={treePanelCollapsed}
            onToggleCollapse={() => setTreePanelCollapsed(v => !v)}
          />
        </motion.div>

        {/* RIGHT — Content panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {analysisTarget ? (
            <AnalysisDashboard
              projectId={analysisTarget.id}
              projectName={analysisTarget.name}
              jobResult={jobResult}
              fromCache={fromCache}
              onBack={() => setAnalysisTarget(null)}
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
              onProcessGlobal={handleProcessGlobal}
              onViewCached={handleViewCached}
              onOpenAnalysis={handleViewCached}
              siteInfoMap={siteInfoMap}
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
                  {jobError ? t('processing.error') : t('processing.title')}
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
                    {t('common.close')}
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* Batch Result Modal */}
      <AnimatePresence>
        {batchResult && (
          <Dialog open onOpenChange={() => setBatchResult(null)}>
            <DialogContent className="sm:max-w-md" showCloseButton={true}>
              <DialogHeader>
                <DialogTitle className="text-base font-display flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-zte-green" />
                  Ingesta de Consumo DC Completada
                </DialogTitle>
              </DialogHeader>
              <div className="py-2 space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Se procesó la carpeta <strong>{batchResult.project_name}</strong> de consumo DC con éxito. 
                  Los datos de consumo se han integrado o registrado de la siguiente manera:
                </p>
                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total de filas procesadas:</span>
                    <span className="font-semibold">{batchResult.total_records}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ubicaciones asociadas automáticamente:</span>
                    <span className="font-semibold text-emerald-400">{batchResult.matched_to_existing}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Proyectos provisionales creados:</span>
                    <span className="font-semibold text-amber-400">{batchResult.created_provisional}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Sitios importados</p>
                  <div className="max-h-32 overflow-y-auto border border-border rounded-lg bg-background p-2 text-xs divide-y divide-border">
                    {batchResult.locations_processed.map((loc: string) => (
                      <div key={loc} className="py-1.5 truncate text-muted-foreground">
                        {loc}
                      </div>
                    ))}
                  </div>
                </div>
                <Button
                  className="w-full bg-[#008ED3] text-white hover:bg-[#006FA8]"
                  onClick={() => setBatchResult(null)}
                >
                  Entendido
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  Loader2, FileDown, X, Zap, Battery, TrendingUp, Clock,
  CheckCircle2, AlertCircle
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { FolderTree } from '@/components/explorer/FolderTree';
import { FolderContent } from '@/components/explorer/FolderContent';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { projectsApi } from '@/api/projects';
import type { Folder } from '@/api/projects';
import Plot from 'react-plotly.js';
import { cn } from '@/lib/utils';

interface BreadcrumbItem { id: string; name: string; }

// KPI summary card
function KpiCard({ icon: Icon, label, value, color }: { icon: any, label: string, value: string, color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
    >
      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-display font-semibold text-foreground">{value}</p>
      </div>
    </motion.div>
  );
}

// Processing status step
const processingSteps = [
  { key: 'downloading', label: 'Descargando datos de Drive' },
  { key: 'processing', label: 'Analizando CSVs' },
  { key: 'completed', label: 'Generando reportes' },
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

  // Processing
  const [processingFolder, setProcessingFolder] = useState<Folder | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>('pending');
  const [jobResult, setJobResult] = useState<any>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

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
    } catch {
      setCurrentFolders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const current = breadcrumbs[breadcrumbs.length - 1];
    loadFolders(current.id);
  }, [breadcrumbs, loadFolders]);

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
          setJobId(null);
          setShowResults(true);
        } else if (data.status === 'failed') {
          clearInterval(interval);
          setJobError(data.error || 'Error desconocido');
          setJobId(null);
          setProcessingFolder(null);
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [jobId]);

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
            /* ═══ RESULTS DASHBOARD ═══ */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 overflow-auto p-6 space-y-6"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="font-display text-2xl font-bold text-foreground">
                    {jobResult.project_name}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-0.5">Reporte de análisis solar</p>
                </div>
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { setShowResults(false); setJobResult(null); }}>
                  <X className="w-4 h-4" /> Cerrar
                </Button>
              </div>

              {/* KPI Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard icon={Zap} label="Generación Total" value="– kWh" color="#008ED3" />
                <KpiCard icon={TrendingUp} label="Promedio Diario" value="– kWh" color="#00A86B" />
                <KpiCard icon={Battery} label="Batería máx SOC" value="–%" color="#F59E0B" />
                <KpiCard icon={Clock} label="Período analizado" value="–d" color="#8B5CF6" />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {jobResult.daily_generation?.length > 0 && (
                  <div className="rounded-xl border border-border bg-card p-4">
                    <h3 className="text-sm font-semibold mb-4 text-foreground">Generación Diaria (kWh)</h3>
                    <div className="h-[260px]">
                      <Plot
                        data={[{
                          x: jobResult.daily_generation.map((d: any) => d.Date || d.time),
                          y: jobResult.daily_generation.map((d: any) => d.Daily_Generation || d.value),
                          type: 'bar',
                          marker: { color: '#008ED3', opacity: 0.9 }
                        }]}
                        layout={{
                          autosize: true, margin: { t: 8, r: 8, l: 40, b: 40 },
                          paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
                          font: { color: '#9ca3af', size: 11 },
                          xaxis: { gridcolor: 'rgba(255,255,255,0.05)', linecolor: 'transparent' },
                          yaxis: { gridcolor: 'rgba(255,255,255,0.05)', linecolor: 'transparent' }
                        }}
                        useResizeHandler style={{ width: '100%', height: '100%' }}
                        config={{ responsive: true, displayModeBar: false }}
                      />
                    </div>
                  </div>
                )}

                {jobResult.battery_soc?.length > 0 && (
                  <div className="rounded-xl border border-border bg-card p-4">
                    <h3 className="text-sm font-semibold mb-4 text-foreground">Estado de Batería (SOC %)</h3>
                    <div className="h-[260px]">
                      <Plot
                        data={[{
                          x: jobResult.battery_soc.map((d: any) => d.Time || d.time),
                          y: jobResult.battery_soc.map((d: any) => d.Battery_SOC || d.value),
                          type: 'scatter', mode: 'lines',
                          line: { color: '#00A86B', width: 2 },
                          fill: 'tozeroy', fillcolor: 'rgba(0,168,107,0.12)'
                        }]}
                        layout={{
                          autosize: true, margin: { t: 8, r: 8, l: 40, b: 40 },
                          paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
                          font: { color: '#9ca3af', size: 11 },
                          xaxis: { gridcolor: 'rgba(255,255,255,0.05)', linecolor: 'transparent' },
                          yaxis: { gridcolor: 'rgba(255,255,255,0.05)', linecolor: 'transparent', range: [0, 105] }
                        }}
                        useResizeHandler style={{ width: '100%', height: '100%' }}
                        config={{ responsive: true, displayModeBar: false }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Downloads */}
              <div className="flex gap-3">
                <Button className="gap-2 h-9" style={{ background: 'var(--zte-blue)', color: 'white' }}>
                  <FileDown className="w-4 h-4" /> Descargar Excel
                </Button>
                <Button variant="outline" className="gap-2 h-9">
                  <FileDown className="w-4 h-4" /> Descargar PPTX
                </Button>
              </div>
            </motion.div>
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
            />
          )}
        </div>
      </div>

      {/* Processing Modal */}
      <AnimatePresence>
        {(!!jobId || !!jobError) && (
          <Dialog open onOpenChange={() => {}}>
            <DialogContent
              className="sm:max-w-sm [&>button]:hidden"
              onInteractOutside={e => e.preventDefault()}
              onEscapeKeyDown={e => e.preventDefault()}
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

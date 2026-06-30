import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Variants } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  Folder, FolderOpen, LayoutGrid, List as ListIcon,
  Play, CheckCircle2, Clock, BarChart2, Globe2, Layers
} from 'lucide-react';
import type { Folder as FolderType, SiteInfo } from '@/api/projects';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ProcessedStatus {
  processedAt?: string;
}

interface FolderContentProps {
  folders: FolderType[];
  loading: boolean;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  selectedId: string | null;
  onSelect: (folder: FolderType) => void;
  onNavigate: (folder: FolderType) => void;
  onProcess: (folder: FolderType) => void;
  onProcessGlobal?: (folder: FolderType) => void;
  onViewCached?: (folder: FolderType) => void;
  onOpenAnalysis?: (folder: FolderType) => void;
  processedMap?: Record<string, ProcessedStatus>;
  siteInfoMap?: Record<string, SiteInfo>;
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 8, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: i * 0.04, duration: 0.25, ease: 'easeOut' }
  }),
};

function FolderCard({
  folder, index, isSelected, isProcessed, processedAt, isSite,
  mergedCached, mergedProcessedAt,
  onSelect, onNavigate, onProcess, onProcessGlobal, onViewCached, onOpenAnalysis,
}: {
  folder: FolderType;
  index: number;
  isSelected: boolean;
  isProcessed: boolean;
  processedAt?: string;
  isSite: boolean;
  mergedCached: boolean;
  mergedProcessedAt?: string;
  onSelect: (f: FolderType) => void;
  onNavigate: (f: FolderType) => void;
  onProcess: (f: FolderType) => void;
  onProcessGlobal?: (f: FolderType) => void;
  onViewCached?: (f: FolderType) => void;
  onOpenAnalysis?: (f: FolderType) => void;
}) {
  const { t } = useTranslation();

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      layout
      whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,142,211,0.12)' }}
      onClick={() => onSelect(folder)}
      onDoubleClick={() => onNavigate(folder)}
      className={cn(
        'group relative flex flex-col rounded-xl border cursor-pointer',
        'transition-colors duration-150 overflow-hidden',
        isSelected
          ? 'border-zte-blue bg-zte-blue/8 shadow-zte'
          : 'border-border bg-card hover:border-zte-blue/40'
      )}
    >
      {/* Status badges */}
      <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
        {isSite && (
          <span className="flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-400/10 border border-amber-400/25 rounded-full px-2 py-0.5">
            <Layers className="w-2.5 h-2.5" />
            {t('explorer.site')}
          </span>
        )}
        {isProcessed && (
          <span className="flex items-center gap-1 text-[10px] font-medium text-zte-green bg-zte-green/10 border border-zte-green/20 rounded-full px-2 py-0.5">
            <CheckCircle2 className="w-2.5 h-2.5" />
            {t('explorer.processed')}
          </span>
        )}
      </div>

      {/* Folder icon area */}
      <div className="flex-1 flex flex-col items-center justify-center pt-6 pb-3 gap-2">
        <div className="relative">
          {isSite
            ? <Layers className={cn('w-12 h-12', isSelected ? 'text-zte-blue' : 'text-amber-400')} style={isSelected ? { filter: 'drop-shadow(0 4px 8px rgba(0,142,211,0.3))' } : {}} />
            : isSelected
              ? <FolderOpen className="w-12 h-12 text-zte-blue" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,142,211,0.3))' }} />
              : <Folder className="w-12 h-12 text-amber-400 fill-amber-400/20 group-hover:text-zte-blue group-hover:fill-zte-blue/15 transition-colors" />
          }
        </div>
        <span
          className={cn(
            'text-xs font-medium text-center line-clamp-2 px-2 leading-snug',
            isSelected ? 'text-zte-blue' : 'text-foreground'
          )}
          title={folder.name}
        >
          {folder.name}
        </span>
        {isProcessed && processedAt && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="w-2.5 h-2.5" />
            {processedAt}
          </span>
        )}
      </div>

      {/* Action bar */}
      <div className={cn(
        'border-t px-2 py-2 flex gap-1 flex-wrap',
        isSelected ? 'border-zte-blue/20 bg-zte-blue/5' : 'border-border bg-muted/20'
      )}>
        {/* Botón Analizar Global — solo para sitios */}
        {isSite && (
          <Button
            size="sm"
            className="w-full h-7 text-xs gap-1 mb-0.5"
            style={{
              background: mergedCached ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.9)',
              color: mergedCached ? '#F59E0B' : 'white',
              border: mergedCached ? '1px solid rgba(245,158,11,0.4)' : 'none',
            }}
            title={mergedCached && mergedProcessedAt ? `${t('explorer.globalAnalysis')} · ${new Date(mergedProcessedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}` : t('explorer.globalAnalysis')}
            onClick={e => { e.stopPropagation(); onProcessGlobal?.(folder); }}
          >
            <Globe2 className="w-3 h-3" />
            {mergedCached ? t('explorer.viewGlobal') : t('explorer.globalAnalysis')}
          </Button>
        )}

        {isProcessed ? (
          <>
            <Button
              size="sm"
              className="flex-1 h-7 text-xs gap-1"
              style={{ background: 'var(--zte-green, #00A86B)', color: 'white' }}
              onClick={e => { e.stopPropagation(); onViewCached?.(folder); }}
            >
              <CheckCircle2 className="w-3 h-3" />
              {t('explorer.open')}
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs gap-1 px-2"
              style={{ background: 'rgba(0,142,211,0.15)', color: '#008ED3', border: '1px solid rgba(0,142,211,0.3)' }}
              title={t('analysis.back')}
              onClick={e => { e.stopPropagation(); onOpenAnalysis?.(folder); }}>
              <BarChart2 className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2 text-muted-foreground"
              title={t('explorer.process')}
              onClick={e => { e.stopPropagation(); onProcess(folder); }}
            >
              ↺
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
              onClick={e => { e.stopPropagation(); onNavigate(folder); }}
            >
              <FolderOpen className="w-3 h-3" />
              {t('explorer.open')}
            </Button>
            {!isSite && (
              <Button
                size="sm"
                className="flex-1 h-7 text-xs gap-1"
                style={{ background: 'var(--zte-blue)', color: 'white' }}
                onClick={e => { e.stopPropagation(); onProcess(folder); }}
              >
                <Play className="w-3 h-3" />
                {t('explorer.process')}
              </Button>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

export function FolderContent({
  folders, loading, viewMode, onViewModeChange,
  selectedId, onSelect, onNavigate, onProcess, onProcessGlobal,
  onViewCached, onOpenAnalysis, processedMap = {}, siteInfoMap = {}
}: FolderContentProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border flex-shrink-0">
        <span className="text-xs text-muted-foreground">
          {loading ? '…' : `${folders.length} ${folders.length === 1 ? t('explorer.items') : t('explorer.items_plural')}`}
        </span>
        <div className="flex items-center gap-0.5 border border-border rounded-md p-0.5 bg-muted/30">
          <button
            onClick={() => onViewModeChange('grid')}
            className={cn(
              'p-1.5 rounded transition-colors',
              viewMode === 'grid' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={cn(
              'p-1.5 rounded transition-colors',
              viewMode === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <ListIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : folders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
            <Folder className="w-16 h-16 opacity-10" />
            <p className="text-sm">{t('explorer.noFolders')}</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            <AnimatePresence>
              {folders.map((folder, i) => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  index={i}
                  isSelected={selectedId === folder.id}
                  isProcessed={!!processedMap[folder.id]}
                  processedAt={processedMap[folder.id]?.processedAt}
                  isSite={siteInfoMap[folder.id]?.site_type === 'site'}
                  mergedCached={siteInfoMap[folder.id]?.merged_cached ?? false}
                  mergedProcessedAt={siteInfoMap[folder.id]?.merged_processed_at}
                  onSelect={onSelect}
                  onNavigate={onNavigate}
                  onProcess={onProcess}
                  onProcessGlobal={onProcessGlobal}
                  onViewCached={onViewCached}
                  onOpenAnalysis={onOpenAnalysis}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          /* LIST VIEW */
          <div className="space-y-1">
            <AnimatePresence>
              {folders.map((folder, i) => {
                const isSelected = selectedId === folder.id;
                const isProcessed = !!processedMap[folder.id];
                const isSite = siteInfoMap[folder.id]?.site_type === 'site';
                const mergedCached = siteInfoMap[folder.id]?.merged_cached ?? false;
                const mergedProcessedAt = siteInfoMap[folder.id]?.merged_processed_at;
                return (
                  <motion.div
                    key={folder.id}
                    custom={i}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    onClick={() => onSelect(folder)}
                    onDoubleClick={() => onNavigate(folder)}
                    className={cn(
                      'flex items-center justify-between px-3 py-2.5 rounded-lg border cursor-pointer',
                      'transition-colors duration-100',
                      isSelected
                        ? 'border-zte-blue bg-zte-blue/8'
                        : 'border-border bg-card hover:border-zte-blue/30 hover:bg-muted/30'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isSite
                        ? <Layers className={cn('w-5 h-5 flex-shrink-0', isSelected ? 'text-zte-blue' : 'text-amber-400')} />
                        : <Folder className={cn('w-5 h-5 flex-shrink-0', isSelected ? 'text-zte-blue' : 'text-amber-400 fill-amber-400/20')} />
                      }
                      <span className="text-sm font-medium truncate">{folder.name}</span>
                      {isSite && (
                        <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/25 rounded-full px-2 py-0.5 flex-shrink-0">
                          <Layers className="w-2.5 h-2.5" /> {t('explorer.site')}
                        </span>
                      )}
                      {isProcessed && (
                        <span className="flex items-center gap-1 text-[10px] text-zte-green bg-zte-green/10 border border-zte-green/20 rounded-full px-2 py-0.5 flex-shrink-0">
                          <CheckCircle2 className="w-2.5 h-2.5" /> {t('explorer.processed')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      {/* Botón Analizar Global — solo para sitios */}
                      {isSite && (
                        <Button
                          size="sm"
                          className="h-7 text-xs gap-1"
                          style={{
                            background: mergedCached ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.9)',
                            color: mergedCached ? '#F59E0B' : 'white',
                            border: mergedCached ? '1px solid rgba(245,158,11,0.4)' : 'none',
                          }}
                          title={mergedCached && mergedProcessedAt ? `${t('explorer.globalAnalysis')} · ${new Date(mergedProcessedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}` : t('explorer.globalAnalysis')}
                          onClick={e => { e.stopPropagation(); onProcessGlobal?.(folder); }}
                        >
                          <Globe2 className="w-3 h-3" />
                          {mergedCached ? t('explorer.viewGlobal') : t('explorer.globalAnalysis')}
                        </Button>
                      )}
                      {isProcessed ? (
                        <>
                          <Button
                            size="sm"
                            className="h-7 text-xs gap-1"
                            style={{ background: '#00A86B', color: 'white' }}
                            onClick={e => { e.stopPropagation(); onViewCached?.(folder); }}
                          >
                            <CheckCircle2 className="w-3 h-3" /> {t('explorer.open')}
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 text-xs gap-1 px-2"
                            style={{ background: 'rgba(0,142,211,0.15)', color: '#008ED3', border: '1px solid rgba(0,142,211,0.3)' }}
                            title={t('analysis.tabs.generation')}
                            onClick={e => { e.stopPropagation(); onOpenAnalysis?.(folder); }}>
                            <BarChart2 className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 text-xs px-2 text-muted-foreground"
                            title={t('explorer.process')}
                            onClick={e => { e.stopPropagation(); onProcess(folder); }}
                          >
                            ↺
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 text-xs gap-1 text-muted-foreground"
                            onClick={e => { e.stopPropagation(); onNavigate(folder); }}
                          >
                            <FolderOpen className="w-3 h-3" /> {t('explorer.open')}
                          </Button>
                          {!isSite && (
                            <Button
                              size="sm"
                              className="h-7 text-xs gap-1"
                              style={{ background: 'var(--zte-blue)', color: 'white' }}
                              onClick={e => { e.stopPropagation(); onProcess(folder); }}
                            >
                              <Play className="w-3 h-3" /> {t('explorer.process')}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

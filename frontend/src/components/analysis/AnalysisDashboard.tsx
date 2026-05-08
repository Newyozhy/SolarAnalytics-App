// AnalysisDashboard — Main tabbed analysis view with 5 categories
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  Sun, Zap, Battery, Cpu, Bell,
  ChevronLeft, ArrowRight, LayoutDashboard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResultsDashboard } from '../dashboard/ResultsDashboard';
import { PanelA1Generation } from './PanelA1Generation';
import { PanelA2HourlyProfile } from './PanelA2HourlyProfile';
import { PanelA3CalendarHeatmap } from './PanelA3CalendarHeatmap';
import { PanelB1ConsumptionProfile } from './PanelB1ConsumptionProfile';
import { PanelB2Savings } from './PanelB2Savings';
import { PanelC1Battery } from './PanelC1Battery';
import { PanelD1SpuChannels } from './PanelD1SpuChannels';
import { PanelD2SystemPower } from './PanelD2SystemPower';
import { PanelE1Alarms } from './PanelE1Alarms';

// ─── Tab definitions ─────────────────────────────────────────

interface Tab {
  id: string;
  labelKey: string;
  icon: React.ElementType;
  color: string;
  available: boolean;
  phase: string;
}

const TABS: Tab[] = [
  { id: 'resumen',     labelKey: 'analysis.tabs.resumen',     icon: LayoutDashboard, color: '#008ED3', available: true,  phase: 'Fase 1' },
  { id: 'generation',  labelKey: 'analysis.tabs.generation',  icon: Sun,             color: '#008ED3', available: true,  phase: 'Fase 2' },
  { id: 'consumption', labelKey: 'analysis.tabs.consumption', icon: Zap,             color: '#00A86B', available: true,  phase: 'Fase 3' },
  { id: 'batteries',   labelKey: 'analysis.tabs.batteries',   icon: Battery,         color: '#F59E0B', available: true,  phase: 'Fase 4' },
  { id: 'system',      labelKey: 'analysis.tabs.system',      icon: Cpu,             color: '#8B5CF6', available: true,  phase: 'Fase 5' },
  { id: 'alarms',      labelKey: 'analysis.tabs.alarms',      icon: Bell,            color: '#EF4444', available: true,  phase: 'Fase 5' },
];

// ─── Coming Soon placeholder ─────────────────────────────────

function ComingSoon({ tab }: { tab: Tab }) {
  const { t } = useTranslation();
  const Icon = tab.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center h-80 gap-4 text-center"
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: `${tab.color}15` }}
      >
        <Icon className="w-8 h-8" style={{ color: tab.color }} />
      </div>
      <div>
        <p className="text-base font-semibold text-foreground">{t(tab.labelKey)}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {t('analysis.availableIn')} <span className="font-semibold" style={{ color: tab.color }}>{tab.phase}</span>
        </p>
      </div>
      <div
        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full"
        style={{ background: `${tab.color}10`, color: tab.color }}
      >
        <ArrowRight className="w-3 h-3" />
        {t('analysis.comingSoon')}
      </div>
    </motion.div>
  );
}

// ─── Category A — Solar Generation ─────────────────────────

function CategoryGeneration({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <PanelA1Generation projectId={projectId} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <PanelA2HourlyProfile projectId={projectId} />
        <div className="rounded-2xl border border-border/40 border-dashed bg-muted/10 flex flex-col items-center justify-center gap-3 p-8 min-h-[300px]">
          <Zap className="w-8 h-8 text-muted-foreground opacity-30" />
          <p className="text-xs text-muted-foreground opacity-60 text-center">
            {t('analysis.consumptionVsGeneration')}<br /><span className="text-[10px]">{t('analysis.viewInConsumption')}</span>
          </p>
        </div>
      </div>
      <PanelA3CalendarHeatmap projectId={projectId} />
    </motion.div>
  );
}

// ─── Category B — Consumption & Savings ──────────────────────────

function CategoryConsumption({ projectId }: { projectId: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PanelB1ConsumptionProfile projectId={projectId} />
      <PanelB2Savings projectId={projectId} />
    </motion.div>
  );
}

// ─── Category C+D — Batteries & SPU ───────────────────────

function CategoryBatteries({ projectId }: { projectId: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PanelC1Battery projectId={projectId} />
      <PanelD1SpuChannels projectId={projectId} />
    </motion.div>
  );
}

// ─── Category D — System & Equipment ────────────────────────

function CategorySystem({ projectId }: { projectId: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PanelD2SystemPower projectId={projectId} />
    </motion.div>
  );
}

// ─── Category E — Alarms & Events ────────────────────────

function CategoryAlarms({ projectId }: { projectId: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PanelE1Alarms projectId={projectId} />
    </motion.div>
  );
}

// ─── Main AnalysisDashboard ──────────────────────────────────

interface AnalysisDashboardProps {
  projectId: string;
  projectName: string;
  jobResult: any;
  fromCache: boolean;
  onBack: () => void;
}

export function AnalysisDashboard({ projectId, projectName, jobResult, fromCache, onBack }: AnalysisDashboardProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('resumen');
  const activeTabData = TABS.find(tab => tab.id === activeTab)!;

  return (
    <div className="flex flex-col h-full">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-5 py-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('analysis.back')}
          </button>
          <span className="text-border">·</span>
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(0,142,211,0.12)' }}
            >
              <Sun className="w-4 h-4 text-[#008ED3]" />
            </div>
            <p className="text-sm font-semibold text-foreground truncate">{projectName}</p>
          </div>
          <span className="ml-auto text-[10px] text-muted-foreground font-mono px-2 py-0.5 rounded-md bg-muted/50">
            {projectId.slice(0, 12)}…
          </span>
        </div>

        {/* Tab bar */}
        <div className="flex items-end gap-0 px-5 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'relative flex items-center gap-2 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-all',
                  'border-b-2 -mb-px',
                  active
                    ? 'text-foreground border-current'
                    : 'text-muted-foreground border-transparent hover:text-foreground hover:border-border'
                )}
                style={active ? { color: tab.color, borderColor: tab.color } : {}}
              >
                <Icon className="w-3.5 h-3.5" />
                {t(tab.labelKey)}
                {!tab.available && (
                  <span className="ml-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground">
                    {tab.phase}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content area ── */}
      <div className="flex-1 overflow-auto">
        <div className="px-5 py-5 max-w-screen-2xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
            >
              {activeTab === 'resumen' && activeTabData.available
                ? (
                  jobResult ? (
                    <div className="-m-5">
                      <ResultsDashboard
                        result={jobResult}
                        fromCache={fromCache}
                        onClose={onBack}
                        isEmbedded={true}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">
                      {t('dashboard.loadingResume')}
                    </div>
                  )
                )
                : activeTab === 'generation' && activeTabData.available
                ? <CategoryGeneration projectId={projectId} />
                : activeTab === 'consumption' && activeTabData.available
                ? <CategoryConsumption projectId={projectId} />
                : activeTab === 'batteries' && activeTabData.available
                ? <CategoryBatteries projectId={projectId} />
                : activeTab === 'system' && activeTabData.available
                ? <CategorySystem projectId={projectId} />
                : activeTab === 'alarms' && activeTabData.available
                ? <CategoryAlarms projectId={projectId} />
                : <ComingSoon tab={activeTabData} />
              }
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="h-8" />
      </div>
    </div>
  );
}

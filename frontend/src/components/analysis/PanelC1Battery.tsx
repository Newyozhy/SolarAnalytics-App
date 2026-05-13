// Panel C-1 — Estado de Baterías: SOC / SOH / Voltaje DC
// Toggle métrica: SOC % | SOH % | Voltaje V
// Toggle granularidad: Días / Semanas / Meses
// Alerta automática cuando SOH < 80%
// Líneas de umbral en modo voltaje (LLVD1=47V / BLVD=46V)
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Battery, BatteryWarning, AlertTriangle, Info,
  Zap, TrendingDown, Activity, AlertCircle,
} from 'lucide-react';
import PlotlyChart from 'react-plotly.js';
import { motion, AnimatePresence } from 'motion/react';
import { ChartPanel } from '@/components/ui/ChartPanel';
import { GranularityToggle } from '@/components/ui/GranularityToggle';
import { MetricToggle } from '@/components/ui/MetricToggle';
import { analysisApi } from '@/api/analysis';
import type { BatteryMetric, BatteryResponse, Granularity } from '@/api/analysis';
import { cn } from '@/lib/utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Plot = (PlotlyChart as any).default ?? PlotlyChart;

// ─── Device color palette ────────────────────────────────────
const DEVICE_COLORS = [
  '#008ED3', '#00A86B', '#F59E0B', '#EF4444',
  '#8B5CF6', '#06B6D4', '#EC4899', '#10B981',
];

// ─── Metric configuration ────────────────────────────────────
const METRIC_OPTIONS: { value: BatteryMetric; label: string; icon: React.ElementType }[] = [
  { value: 'soc',     label: 'SOC (%)',      icon: Battery        },
  { value: 'soh',     label: 'SOH (%)',      icon: BatteryWarning },
  { value: 'voltage', label: 'Voltaje (V)',   icon: Zap            },
];
// Note: built as static labels since these are technical abbreviations

interface MetricCfg {
  yTitle: string;
  yRange?: [number, number];
  tickSuffix: string;
  criticalLine?: { y: number; label: string; color: string }[];
}

// METRIC_CFG built with translated labels inside component
// (static values only; translated strings resolved at render time)

// ─── Alert banner ────────────────────────────────────────────

function AlertBanner({ alerts }: { alerts: BatteryResponse['alerts'] }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  if (!alerts.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-red-500/30 bg-red-500/5 overflow-hidden"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-7 h-7 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-red-300">
            {alerts.length} {alerts.length > 1 ? t('panels.c1.alertBatteriesPlural') : t('panels.c1.alertBatteries')} {t('panels.c1.alertMsg')}
          </p>
          <p className="text-[11px] text-red-400/70 mt-0.5">
            {t('panels.c1.alertSub')}
          </p>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-[11px] text-red-400/80 hover:text-red-300 px-2 py-1.5 rounded-lg hover:bg-red-500/10 transition-all"
        >
          {expanded ? t('panels.c1.hideDetail') : t('panels.c1.showDetail')}
        </button>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-red-500/20"
          >
            <div className="px-4 pb-3 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {alerts.map((a, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg bg-red-500/8 border border-red-500/15 px-3 py-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-[11px] font-mono font-semibold text-red-300">{a.device}</p>
                    <p className="text-[11px] text-red-400/80 mt-0.5">SOH: {a.soh}%</p>
                    <p className="text-[10px] text-red-500/60 mt-0.5 leading-tight">{a.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Summary KPI pills ────────────────────────────────────────

function SummaryPills({ data, summary }: { data: BatteryResponse; summary: BatteryResponse['summary'] }) {
  const devices = summary?.devices ?? [];
  if (!devices.length || !data.data.length) return null;

  // Last period values per device
  const lastRow = data.data[data.data.length - 1];
  return (
    <div className="flex flex-wrap gap-2">
      {devices.map((dev, i) => {
        const val = lastRow?.[dev];
        const numVal = typeof val === 'number' ? val : null;
        const unit = summary?.unit ?? '';
        const color = DEVICE_COLORS[i % DEVICE_COLORS.length];
        const isCritical = summary?.metric === 'soh' && numVal !== null && numVal < 80;
        const isWarning  = summary?.metric === 'voltage' && numVal !== null && numVal < 47;
        return (
          <div
            key={dev}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px]',
              isCritical ? 'border-red-500/40 bg-red-500/8' :
              isWarning  ? 'border-amber-500/40 bg-amber-500/8' :
                           'border-border bg-card/60'
            )}
          >
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
            <span className="font-mono text-muted-foreground text-[10px] truncate max-w-[100px]" title={dev}>
              {dev.replace('Battery_', 'Bat.')}
            </span>
            <span className={cn(
              'font-display font-bold',
              isCritical ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-foreground'
            )}>
              {numVal !== null ? `${numVal.toFixed(1)}${unit}` : '—'}
            </span>
            {isCritical && <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />}
            {isWarning  && <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />}
          </div>
        );
      })}
    </div>
  );
}

// ─── No-data info ─────────────────────────────────────────────

function NoBatteryData({ metric }: { metric: BatteryMetric }) {
  const { t } = useTranslation();
  const labels: Record<BatteryMetric, string> = {
    soc:     'Battery Present SOC',
    soh:     'Battery SOH',
    voltage: 'Battery Voltage',
  };
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
      <div className="w-12 h-12 rounded-2xl bg-muted/30 flex items-center justify-center">
        <Info className="w-6 h-6 opacity-30" />
      </div>
      <div className="text-center">
        <p className="text-xs font-medium">{t('panels.c1.noData')}</p>
        <p className="text-[11px] opacity-60 mt-1">
          {t('panels.c1.noDataSub')} <code className="font-mono bg-muted/40 px-1 rounded">{labels[metric]}</code>
          <br />in <code className="font-mono bg-muted/40 px-1 rounded">history_data.csv</code>
        </p>
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────

interface PanelC1Props { projectId: string; }

export function PanelC1Battery({ projectId }: PanelC1Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [metric, setMetric]           = useState<BatteryMetric>('soc');
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [data, setData]               = useState<BatteryResponse | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    setData(null);
    setError(null);
    analysisApi
      .getBattery(projectId, { metric, granularity })
      .then(setData)
      .catch((err) => {
        console.error(err);
        setError(err?.message ?? 'Error cargando datos de baterías');
      })
      .finally(() => setLoading(false));
  }, [projectId, metric, granularity]);

  // ── METRIC_CFG must be declared BEFORE plotTraces useMemo ──
  // (using it inside useMemo before declaration causes a ReferenceError)
  const METRIC_CFG: Record<BatteryMetric, MetricCfg> = useMemo(() => ({
    soc:     { yTitle: 'SOC (%)',     yRange: [0, 105], tickSuffix: '%' },
    soh:     { yTitle: 'SOH (%)',     yRange: [0, 105], tickSuffix: '%',
               criticalLine: [{ y: 80, label: t('panels.c1.minRecommended'), color: '#EF4444' }] },
    voltage: { yTitle: t('panels.c1.voltageLabel'), tickSuffix: 'V',
               criticalLine: [
                 { y: 47, label: 'LLVD1 (47V)', color: '#F59E0B' },
                 { y: 46, label: 'BLVD (46V)',  color: '#EF4444' },
               ] },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [lang]); // lang triggers recalc on language change

  // ── Plotly traces — one line per device ──
  const plotTraces = useMemo(() => {
    if (!data?.data.length || !data.summary?.devices?.length) return [];
    const devices = data.summary.devices;
    const rows    = data.data;
    const cfg     = METRIC_CFG[metric];

    const traces: any[] = devices.map((dev, i) => ({
      type: 'scatter',
      mode: 'lines',
      name: dev.replace('Battery_', 'Bat.'),
      x: rows.map(r => r.label),
      y: rows.map(r => {
        const v = r[dev];
        return typeof v === 'number' ? v : null;
      }),
      line: { color: DEVICE_COLORS[i % DEVICE_COLORS.length], width: 2, shape: 'spline' },
      connectgaps: false,
      hovertemplate:
        `<b>${dev.replace('Battery_', 'Bat.')}</b><br>` +
        `%{x}<br><b>%{y:.1f}${cfg.tickSuffix}</b><extra></extra>`,
    }));

    // Threshold lines (SOH 80% / LLVD1 / BLVD)
    if (cfg.criticalLine) {
      cfg.criticalLine.forEach(thr => {
        traces.push({
          type: 'scatter',
          mode: 'lines',
          name: thr.label,
          x: rows.map(r => r.label),
          y: Array(rows.length).fill(thr.y),
          line: { color: thr.color, width: 1.5, dash: 'dot' },
          hoverinfo: 'skip',
          showlegend: true,
        });
      });
    }

    return traces;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, metric, lang]); // lang triggers recalc on language change

  const cfg     = METRIC_CFG[metric];
  const summary = data?.summary;
  const alerts  = data?.alerts ?? [];

  const insight = useMemo(() => {
    if (!data?.data.length || !summary?.devices?.length) return undefined;
    const devices  = summary.devices;
    const lastRow  = data.data[data.data.length - 1];
    const vals     = devices.map(d => lastRow[d]).filter(v => typeof v === 'number') as number[];
    if (!vals.length) return undefined;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const unit = summary.unit;
    const alertNote = alerts.length > 0
      ? ` · ⚠️ ${alerts.length} ${alerts.length > 1 ? t('panels.c1.alertBatteriesPlural') : t('panels.c1.alertBatteries')} ${t('panels.c1.belowMin')}`
      : '';
    return `${t('panels.c1.lastPeriod')} — ${t('panels.c1.avg')}: ${avg.toFixed(1)}${unit} · ${t('panels.c1.min')}: ${min.toFixed(1)}${unit} · ${t('panels.c1.max')}: ${max.toFixed(1)}${unit} · ${devices.length} ${devices.length > 1 ? t('panels.c1.monitoredPlural') : t('panels.c1.monitored')}${alertNote}.`;
  }, [data, summary, alerts, metric, lang]);

  return (
    <div className="space-y-4">
      {/* SOH alerts */}
      {metric === 'soh' && alerts.length > 0 && (
        <AlertBanner alerts={alerts} />
      )}

      {/* Voltage threshold info */}
      {metric === 'voltage' && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-[11px] text-amber-400/80"
        >
          <Activity className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{t('panels.c1.voltageInfo')}</span>
        </motion.div>
      )}

      {/* Summary pills */}
      {data && summary && (
        <SummaryPills data={data} summary={summary} />
      )}

      {/* Main chart */}
      <ChartPanel
        index={0}
        title={`${t('panels.c1.title')} — ${METRIC_OPTIONS.find(m => m.value === metric)?.label}`}
        subtitle={`${t('analysis.tabs.batteries')} — ${metric === 'soc' ? t('panels.c1.socLabel') : metric === 'soh' ? t('panels.c1.sohLabel') : t('panels.c1.voltageLabel')}`}
        insight={insight}
        loading={loading}
        height={340}
        controls={
          <>
            <MetricToggle options={METRIC_OPTIONS} value={metric} onChange={setMetric} />
            <GranularityToggle value={granularity} onChange={setGranularity} />
          </>
        }
      >
        {error ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <AlertCircle className="w-8 h-8 text-red-400 opacity-60" />
            <p className="text-xs text-red-400/80 text-center max-w-xs">{error}</p>
          </div>
        ) : plotTraces.length > 0 ? (
          <Plot
            data={plotTraces}
            layout={{
              autosize: true,
              margin: { t: 8, r: 12, l: 52, b: 44 },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              font: { color: '#6b7280', size: 11, family: 'Inter, system-ui, sans-serif' },
              xaxis: {
                gridcolor: 'rgba(255,255,255,0.04)',
                linecolor: 'rgba(255,255,255,0.08)',
                tickfont: { size: 10 },
                tickangle: granularity === 'day' ? -45 : 0,
              },
              yaxis: {
                gridcolor: 'rgba(255,255,255,0.06)',
                linecolor: 'transparent',
                tickfont: { size: 10 },
                zeroline: false,
                title: { text: cfg.yTitle, font: { size: 11 } },
                ticksuffix: cfg.tickSuffix,
                ...(cfg.yRange ? { range: cfg.yRange } : {}),
              },
              hoverlabel: {
                bgcolor: '#1e2530',
                bordercolor: '#008ED3',
                font: { size: 12, color: '#f3f4f6' },
              },
              legend: {
                bgcolor: 'transparent', borderwidth: 0,
                font: { size: 11 }, orientation: 'h', y: -0.22,
              },
              hovermode: 'x unified',
            }}
            useResizeHandler
            style={{ width: '100%', height: '100%' }}
            config={{ responsive: true, displayModeBar: false }}
          />
        ) : !loading ? (
          <NoBatteryData metric={metric} />
        ) : null}
      </ChartPanel>
    </div>
  );
}

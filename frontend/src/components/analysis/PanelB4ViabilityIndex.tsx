// Panel B-4 — KPI de Viabilidad del Sitio (Índice de Sobredimensionamiento/Déficit)
import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, CheckCircle2, TrendingDown, TrendingUp, Info } from 'lucide-react';
import PlotlyChart from 'react-plotly.js';
import { motion } from 'motion/react';
import { ChartPanel } from '@/components/ui/ChartPanel';
import { MetricToggle } from '@/components/ui/MetricToggle';
import { analysisApi } from '@/api/analysis';
import type { ViabilityResponse, ViabilityStatus } from '@/api/analysis';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Plot = (PlotlyChart as any).default ?? PlotlyChart;

const STATUS_CONFIG: Record<ViabilityStatus, { label: string; color: string; icon: React.ElementType; desc: string }> = {
  oversized:  { label: 'Sobredimensionado', color: '#00A86B', icon: TrendingUp,   desc: 'El sistema genera más de lo que consume' },
  autonomous: { label: 'Autónomo',          color: '#008ED3', icon: CheckCircle2, desc: 'Cubre la mayor parte del consumo' },
  deficit:    { label: 'Déficit',           color: '#EF4444', icon: TrendingDown, desc: 'Requiere red comercial o ampliación solar' },
};

const GRAN_OPTIONS = [
  { value: 'month' as const, label: 'Meses' },
  { value: 'week'  as const, label: 'Semanas' },
];

interface Props { projectId: string; }

export function PanelB4ViabilityIndex({ projectId }: Props) {
  const [granularity, setGranularity] = useState<'week' | 'month'>('month');
  const [data, setData]               = useState<ViabilityResponse | null>(null);
  const [loading, setLoading]         = useState(false);

  const fetchData = useCallback(() => {
    if (!projectId) return;
    setLoading(true);
    analysisApi
      .getViabilityIndex(projectId, { granularity })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId, granularity]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const summary   = data?.summary;
  const hasData   = data?.has_real_data;
  const rows      = data?.data ?? [];
  const statusCfg = summary ? STATUS_CONFIG[summary.status] : null;

  /* ── Plotly — Combo bar + línea de referencia ────────────── */
  const plotData = rows.length > 0 ? [
    {
      type: 'bar', name: 'Ratio Generación/Consumo',
      x: rows.map(r => r.label),
      y: rows.map(r => r.viability_ratio),
      marker: {
        color: rows.map(r =>
          r.status === 'oversized' ? '#00A86B99'
          : r.status === 'autonomous' ? '#008ED399'
          : '#EF444499'
        ),
        line: {
          color: rows.map(r =>
            r.status === 'oversized' ? '#00A86B'
            : r.status === 'autonomous' ? '#008ED3'
            : '#EF4444'
          ),
          width: 1.5,
        },
      },
      hovertemplate:
        '<b>%{x}</b><br>Ratio: <b>%{y:.2f}</b><br>' +
        'Solar: <b>%{customdata[0]:.1f} kWh</b><br>' +
        'Consumo: <b>%{customdata[1]:.1f} kWh</b><extra></extra>',
      customdata: rows.map(r => [r.solar_kwh, r.consumption_kwh]),
    },
    // Línea de referencia: ratio 1.0 (equilibrio perfecto)
    {
      type: 'scatter', mode: 'lines', name: 'Equilibrio (1.0)',
      x: rows.map(r => r.label),
      y: rows.map(() => 1.0),
      line: { color: '#F59E0B', width: 1.5, dash: 'dash' },
      hoverinfo: 'skip',
    },
    // Línea de referencia: ratio 0.8 (mínimo viable)
    {
      type: 'scatter', mode: 'lines', name: 'Mínimo viable (0.8)',
      x: rows.map(r => r.label),
      y: rows.map(() => 0.8),
      line: { color: '#EF4444', width: 1, dash: 'dot' },
      hoverinfo: 'skip',
    },
  ] : [];

  return (
    <div className="space-y-4">
      {/* Badge */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
          Viabilidad Solar
        </span>
        <span className="text-[10px] text-muted-foreground">
          Índice de sobredimensionamiento / déficit por período
        </span>
        <div className="ml-auto">
          <MetricToggle options={GRAN_OPTIONS} value={granularity} onChange={setGranularity} />
        </div>
      </div>

      {/* Sin datos */}
      {!loading && hasData === false && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <Info className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-300">Sin datos DC Load vinculados</p>
            <p className="text-xs text-muted-foreground mt-1">
              {data?.message ?? 'Vincula datos de DC Load Consumption para ver el índice de viabilidad.'}
            </p>
          </div>
        </div>
      )}

      {/* Global status card */}
      {summary && statusCfg && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl border p-4 flex items-start gap-4"
          style={{ borderColor: `${statusCfg.color}40`, background: `${statusCfg.color}08` }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${statusCfg.color}18` }}
          >
            <statusCfg.icon className="w-6 h-6" style={{ color: statusCfg.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-bold" style={{ color: statusCfg.color }}>
                {statusCfg.label}
              </span>
              <span className="text-xs font-mono bg-muted/60 px-2 py-0.5 rounded-md text-foreground">
                Ratio global: {summary.global_ratio.toFixed(2)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {summary.aligned_days} días analizados
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              {summary.interpretation}
            </p>
          </div>
        </motion.div>
      )}

      {/* Legend */}
      {rows.length > 0 && (
        <div className="flex flex-wrap gap-3 px-1">
          {(Object.entries(STATUS_CONFIG) as [ViabilityStatus, typeof STATUS_CONFIG['oversized']][]).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: cfg.color }} />
              <span className="text-[10px] text-muted-foreground">{cfg.label}</span>
            </div>
          ))}
          <span className="text-[10px] text-muted-foreground ml-2 border-l border-border pl-2">
            -- Equilibrio (1.0) · ··· Mínimo (0.8)
          </span>
        </div>
      )}

      {/* Chart */}
      <ChartPanel
        index={3}
        title="Índice de Viabilidad Solar por Período"
        subtitle="Ratio Generación Solar / Consumo DC real"
        loading={loading}
        height={280}
      >
        {plotData.length > 0 ? (
          <Plot
            data={plotData}
            layout={{
              autosize: true,
              margin: { t: 8, r: 12, l: 52, b: 44 },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              font: { color: '#6b7280', size: 11, family: 'Inter, system-ui, sans-serif' },
              bargap: 0.3,
              xaxis: { gridcolor: 'rgba(255,255,255,0.04)', tickfont: { size: 10 }, tickangle: granularity === 'week' ? -45 : 0 },
              yaxis: {
                gridcolor: 'rgba(255,255,255,0.06)', linecolor: 'transparent',
                tickfont: { size: 10 }, zeroline: false,
                range: [0, Math.max(2.0, ...(rows.map(r => r.viability_ratio))) + 0.1],
                title: { text: 'Ratio (Gen/Cons)', font: { size: 10 } },
              },
              hoverlabel: { bgcolor: '#1e2530', bordercolor: '#8B5CF6', font: { size: 12, color: '#f3f4f6' } },
              legend: { bgcolor: 'transparent', borderwidth: 0, font: { size: 11 }, orientation: 'h', y: -0.22 },
              shapes: [
                { type: 'line', x0: 0, x1: 1, xref: 'paper', y0: 1.0, y1: 1.0, line: { color: '#F59E0B', width: 1.5, dash: 'dash' } },
                { type: 'line', x0: 0, x1: 1, xref: 'paper', y0: 0.8, y1: 0.8, line: { color: '#EF4444', width: 1, dash: 'dot' } },
              ],
            }}
            useResizeHandler
            style={{ width: '100%', height: '100%' }}
            config={{ responsive: true, displayModeBar: false }}
          />
        ) : !loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
            <AlertCircle className="w-8 h-8 opacity-20" />
            <p className="text-xs">Sin datos de viabilidad disponibles</p>
          </div>
        ) : null}
      </ChartPanel>
    </div>
  );
}

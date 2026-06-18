// Panel B-5 — Curva de Demanda vs Envolvente de Carga (Max/Min/Avg kW vs Solar)
import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import PlotlyChart from 'react-plotly.js';
import { motion } from 'motion/react';
import { ChartPanel } from '@/components/ui/ChartPanel';
import { MetricToggle } from '@/components/ui/MetricToggle';
import { analysisApi } from '@/api/analysis';
import type { DemandEnvelopeResponse } from '@/api/analysis';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Plot = (PlotlyChart as any).default ?? PlotlyChart;

const GRAN_OPTIONS = [
  { value: 'month' as const, label: 'Meses' },
  { value: 'week'  as const, label: 'Semanas' },
];

interface Props { projectId: string; }

export function PanelB5DemandEnvelope({ projectId }: Props) {
  const [granularity, setGranularity] = useState<'week' | 'month'>('month');
  const [data, setData]               = useState<DemandEnvelopeResponse | null>(null);
  const [loading, setLoading]         = useState(false);

  const fetchData = useCallback(() => {
    if (!projectId) return;
    setLoading(true);
    analysisApi
      .getDemandEnvelope(projectId, { granularity })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId, granularity]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const summary   = data?.summary;
  const hasData   = data?.has_real_data;
  const rows      = data?.data ?? [];

  const peakExceedCount = rows.filter(r => r.peak_exceeds_solar).length;

  const hasMax = rows.some(r => r.max_load_kw !== undefined);
  const hasMin = rows.some(r => r.min_load_kw !== undefined);
  const hasAvg = rows.some(r => r.avg_load_kw !== undefined);

  /* ── Plotly traces ─────────────────────────────────────────── */
  const plotData = rows.length > 0 ? [
    // Envolvente sombreada (fill entre max y min)
    ...(hasMax && hasMin ? [
      {
        type: 'scatter', mode: 'lines', name: 'Pico Carga (Max)',
        x: rows.map(r => r.label),
        y: rows.map(r => r.max_load_kw ?? null),
        line: { color: '#EF4444', width: 1.5, dash: 'dot' },
        fill: 'tonexty',
        fillcolor: 'rgba(239,68,68,0.08)',
        hovertemplate: '<b>%{x}</b><br>Pico: <b>%{y:.3f} kW</b><extra></extra>',
      },
      {
        type: 'scatter', mode: 'lines', name: 'Valle Carga (Min)',
        x: rows.map(r => r.label),
        y: rows.map(r => r.min_load_kw ?? null),
        line: { color: '#EF444466', width: 1, dash: 'dot' },
        hovertemplate: '<b>%{x}</b><br>Valle: <b>%{y:.3f} kW</b><extra></extra>',
      },
    ] : []),
    // Carga promedio
    ...(hasAvg ? [{
      type: 'scatter', mode: 'lines+markers', name: 'Carga Promedio (kW)',
      x: rows.map(r => r.label),
      y: rows.map(r => r.avg_load_kw ?? null),
      line: { color: '#EF4444', width: 2.5 },
      marker: { color: '#EF4444', size: 5 },
      hovertemplate: '<b>%{x}</b><br>Carga Avg: <b>%{y:.3f} kW</b><extra></extra>',
    }] : []),
    // Solar promedio
    {
      type: 'scatter', mode: 'lines+markers', name: 'Solar Promedio (kW)',
      x: rows.map(r => r.label),
      y: rows.map(r => r.solar_avg_kw),
      line: { color: '#00A86B', width: 2.5 },
      marker: {
        color: rows.map(r => r.peak_exceeds_solar ? '#EF4444' : '#00A86B'),
        size: rows.map(r => r.peak_exceeds_solar ? 8 : 5),
        symbol: rows.map(r => r.peak_exceeds_solar ? 'triangle-up' : 'circle'),
      },
      hovertemplate: '<b>%{x}</b><br>Solar Avg: <b>%{y:.4f} kW</b>%{customdata}<extra></extra>',
      customdata: rows.map(r => r.peak_exceeds_solar ? '<br>⚠️ Pico supera solar' : ''),
    },
  ] : [];

  return (
    <div className="space-y-4">
      {/* Badge + toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
          Envolvente de Carga
        </span>
        <span className="text-[10px] text-muted-foreground">
          Potencia solar promedio vs picos / valles de consumo DC
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
              {data?.message ?? 'Vincula datos de DC Load Consumption para ver la envolvente de carga.'}
            </p>
          </div>
        </div>
      )}

      {/* Summary KPIs */}
      {summary && hasData && (
        <div className="flex flex-wrap gap-3">
          {summary.avg_solar_kw !== null && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="flex-1 min-w-[130px] rounded-xl border border-border bg-card/80 p-3"
            >
              <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Solar Avg</p>
              <p className="text-lg font-bold text-[#00A86B] mt-0.5">{summary.avg_solar_kw?.toFixed(3)} kW</p>
            </motion.div>
          )}
          {summary.avg_load_kw !== null && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
              className="flex-1 min-w-[130px] rounded-xl border border-border bg-card/80 p-3"
            >
              <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Carga Avg</p>
              <p className="text-lg font-bold text-[#EF4444] mt-0.5">{summary.avg_load_kw?.toFixed(3)} kW</p>
            </motion.div>
          )}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
            className="flex-1 min-w-[130px] rounded-xl border border-border bg-card/80 p-3"
          >
            <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Días analizados</p>
            <p className="text-lg font-bold text-foreground mt-0.5">{summary.aligned_days}</p>
          </motion.div>
          {peakExceedCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
              className="flex-1 min-w-[150px] rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] uppercase font-semibold tracking-wider text-amber-400">Períodos críticos</p>
                <p className="text-lg font-bold text-amber-300 mt-0.5">{peakExceedCount}</p>
                <p className="text-[10px] text-muted-foreground">pico supera solar</p>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Chart */}
      <ChartPanel
        index={4}
        title="Curva de Demanda vs Envolvente de Carga"
        subtitle="Solar promedio (kW) · Pico / Valle / Promedio de consumo DC"
        loading={loading}
        height={300}
      >
        {plotData.length > 0 ? (
          <Plot
            data={plotData}
            layout={{
              autosize: true,
              margin: { t: 8, r: 12, l: 58, b: 44 },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              font: { color: '#6b7280', size: 11, family: 'Inter, system-ui, sans-serif' },
              xaxis: { gridcolor: 'rgba(255,255,255,0.04)', tickfont: { size: 10 }, tickangle: granularity === 'week' ? -45 : 0 },
              yaxis: {
                gridcolor: 'rgba(255,255,255,0.06)', linecolor: 'transparent',
                tickfont: { size: 10 }, zeroline: false,
                title: { text: 'Potencia (kW)', font: { size: 10 } },
              },
              hoverlabel: { bgcolor: '#1e2530', bordercolor: '#EF4444', font: { size: 12, color: '#f3f4f6' } },
              legend: { bgcolor: 'transparent', borderwidth: 0, font: { size: 11 }, orientation: 'h', y: -0.22 },
            }}
            useResizeHandler
            style={{ width: '100%', height: '100%' }}
            config={{ responsive: true, displayModeBar: false }}
          />
        ) : !loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
            <AlertCircle className="w-8 h-8 opacity-20" />
            <p className="text-xs">Sin datos de envolvente disponibles</p>
          </div>
        ) : null}
      </ChartPanel>
    </div>
  );
}

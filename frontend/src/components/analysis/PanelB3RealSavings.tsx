// Panel B-3 — Ahorro Real Cruzado (DC Load Consumption vs Generación Solar)
// Requiere que el proyecto tenga dc_load_consumption vinculado.
import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, Zap, Leaf, TrendingUp, AlertCircle, Info, ToggleLeft, ToggleRight } from 'lucide-react';
import PlotlyChart from 'react-plotly.js';
import { motion } from 'motion/react';
import { ChartPanel } from '@/components/ui/ChartPanel';
import { MetricToggle } from '@/components/ui/MetricToggle';
import { analysisApi } from '@/api/analysis';
import type { RealSavingsResponse } from '@/api/analysis';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Plot = (PlotlyChart as any).default ?? PlotlyChart;

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
  index: number;
}
function KpiCard({ icon: Icon, label, value, sub, color, index }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.3 }}
      className="relative flex-1 min-w-[140px] flex flex-col gap-1.5 rounded-xl border border-border bg-card/80 p-4 overflow-hidden"
    >
      <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-10 blur-xl" style={{ background: color }} />
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}1a` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-foreground leading-tight mt-0.5">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

interface Props { projectId: string; }

const GRAN_OPTIONS = [
  { value: 'month' as const, label: 'Meses' },
  { value: 'week'  as const, label: 'Semanas' },
];

export function PanelB3RealSavings({ projectId }: Props) {
  const [granularity, setGranularity] = useState<'week' | 'month'>('month');
  const [tariff, setTariff]           = useState(0.15);
  const [tariffInput, setTariffInput] = useState('0.15');
  const [solarZeroCost, setSolarZeroCost] = useState(false);
  const [data, setData]               = useState<RealSavingsResponse | null>(null);
  const [loading, setLoading]         = useState(false);

  const fetchData = useCallback(() => {
    if (!projectId) return;
    setLoading(true);
    analysisApi
      .getRealSavings(projectId, {
        tariff_per_kwh: tariff,
        granularity,
        supply_mode_zero_cost: solarZeroCost,
      })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId, tariff, granularity, solarZeroCost]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApply = () => {
    const t = parseFloat(tariffInput);
    if (!isNaN(t) && t > 0) setTariff(t);
  };

  const kpis = data?.kpis;
  const hasRealData = data?.has_real_data;
  const rows = data?.data ?? [];

  const plotData = rows.length > 0 ? [
    {
      type: 'bar', name: 'Solar (kWh)',
      x: rows.map(r => r.label),
      y: rows.map(r => r.solar_kwh),
      marker: { color: '#00A86B', opacity: 0.85 },
      hovertemplate: '<b>%{x}</b><br>Solar: <b>%{y:.2f} kWh</b><extra></extra>',
    },
    {
      type: 'bar', name: 'Consumo DC (kWh)',
      x: rows.map(r => r.label),
      y: rows.map(r => r.consumption_kwh),
      marker: { color: '#008ED3', opacity: 0.75 },
      hovertemplate: '<b>%{x}</b><br>Consumo: <b>%{y:.2f} kWh</b><extra></extra>',
    },
    {
      type: 'bar', name: 'Neto Red (kWh)',
      x: rows.map(r => r.label),
      y: rows.map(r => r.net_kwh),
      marker: { color: '#EF4444', opacity: 0.7 },
      hovertemplate: '<b>%{x}</b><br>Red neta: <b>%{y:.2f} kWh</b><extra></extra>',
    },
    {
      type: 'scatter', mode: 'lines+markers', name: 'Autonomía (%)',
      x: rows.map(r => r.label),
      y: rows.map(r => r.autonomy_pct),
      yaxis: 'y2',
      line: { color: '#F59E0B', width: 2, dash: 'dot' },
      marker: { color: '#F59E0B', size: 5 },
      hovertemplate: '<b>%{x}</b><br>Autonomía: <b>%{y:.1f}%%</b><extra></extra>',
    },
  ] : [];

  return (
    <div className="space-y-4">
      {/* Header badge */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Datos Reales DC Load
        </span>
        <span className="text-[10px] text-muted-foreground">
          Cruce de generación solar medida vs consumo DC registrado
        </span>
      </div>

      {/* Config bar */}
      <div className="flex flex-wrap items-end gap-3 px-1">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tarifa comercial (USD/kWh)
          </label>
          <div className="flex gap-1.5">
            <input
              type="number" step="0.001" min="0.001"
              value={tariffInput}
              onChange={e => setTariffInput(e.target.value)}
              className="w-24 h-8 px-2.5 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#008ED3]/50"
            />
            <button
              onClick={handleApply}
              className="h-8 px-4 rounded-lg bg-[#008ED3] text-white text-xs font-semibold hover:bg-[#006FA8] transition-colors"
            >
              Calcular
            </button>
          </div>
        </div>

        {/* Toggle 100% solar mode */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Modo Solar = Costo 0
          </label>
          <button
            onClick={() => setSolarZeroCost(v => !v)}
            className={`flex items-center gap-2 h-8 px-3 rounded-lg border text-xs font-semibold transition-all ${
              solarZeroCost
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                : 'border-border bg-background text-muted-foreground hover:text-foreground'
            }`}
          >
            {solarZeroCost
              ? <ToggleRight className="w-4 h-4" />
              : <ToggleLeft className="w-4 h-4" />}
            {solarZeroCost ? 'Activo' : 'Inactivo'}
          </button>
        </div>

        <div className="ml-auto">
          <MetricToggle options={GRAN_OPTIONS} value={granularity} onChange={setGranularity} />
        </div>
      </div>

      {/* No data message */}
      {!loading && hasRealData === false && data?.message && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <Info className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-300">Sin datos DC Load vinculados</p>
            <p className="text-xs text-muted-foreground mt-1">{data.message}</p>
          </div>
        </div>
      )}

      {/* KPI row */}
      {kpis && hasRealData && (
        <div className="flex flex-wrap gap-3">
          <KpiCard index={0} icon={Zap}       label="Solar generado"    value={`${kpis.total_solar_kwh.toFixed(1)} kWh`}       sub={`${kpis.aligned_days} días alineados`}                    color="#008ED3" />
          <KpiCard index={1} icon={TrendingUp} label="Consumo DC real"  value={`${kpis.total_consumption_kwh.toFixed(1)} kWh`} sub="Total registrado"                                          color="#6366F1" />
          <KpiCard index={2} icon={Leaf}       label="kWh ahorrados"    value={`${kpis.total_saved_kwh.toFixed(1)} kWh`}       sub={`${kpis.pct_autonomy.toFixed(1)}% autonomía`}             color="#00A86B" />
          <KpiCard index={3} icon={DollarSign} label="Costo neto red"   value={`USD ${kpis.total_cost_usd.toFixed(2)}`}        sub={`@${kpis.tariff_per_kwh} USD/kWh${solarZeroCost ? ' · Modo Solar 0$' : ''}`} color="#F59E0B" />
        </div>
      )}

      {/* Chart */}
      <ChartPanel
        index={2}
        title="Ahorro Real: Solar vs Consumo DC"
        subtitle="Basado en datos medidos de DC Load Consumption"
        loading={loading}
        height={300}
      >
        {plotData.length > 0 ? (
          <Plot
            data={plotData}
            layout={{
              autosize: true,
              margin: { t: 8, r: 54, l: 52, b: 44 },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              font: { color: '#6b7280', size: 11, family: 'Inter, system-ui, sans-serif' },
              barmode: 'group',
              bargap: 0.22,
              bargroupgap: 0.06,
              xaxis: { gridcolor: 'rgba(255,255,255,0.04)', tickfont: { size: 10 }, tickangle: granularity === 'week' ? -45 : 0 },
              yaxis: { gridcolor: 'rgba(255,255,255,0.06)', linecolor: 'transparent', tickfont: { size: 10 }, zeroline: false, title: { text: 'kWh', font: { size: 11 } } },
              yaxis2: { overlaying: 'y', side: 'right', range: [0, 110], tickfont: { size: 10 }, title: { text: '%', font: { size: 11 } }, showgrid: false },
              hoverlabel: { bgcolor: '#1e2530', bordercolor: '#008ED3', font: { size: 12, color: '#f3f4f6' } },
              legend: { bgcolor: 'transparent', borderwidth: 0, font: { size: 11 }, orientation: 'h', y: -0.22 },
            }}
            useResizeHandler
            style={{ width: '100%', height: '100%' }}
            config={{ responsive: true, displayModeBar: false }}
          />
        ) : !loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
            <AlertCircle className="w-8 h-8 opacity-20" />
            <p className="text-xs">Sin datos de cruce disponibles</p>
          </div>
        ) : null}
      </ChartPanel>
    </div>
  );
}

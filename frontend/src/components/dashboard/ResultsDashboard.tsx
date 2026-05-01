import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import type { Variants } from 'motion/react';
import {
  Zap, TrendingUp, Battery, Calendar,
  Clock, Sun, BarChart3, Activity, X, History, FileDown,
  ArrowUp, ArrowDown, Minus
} from 'lucide-react';
import Plot from 'react-plotly.js';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface DailyGenRecord {
  date: string;
  total_generation_kwh: number;
  total_duration_min: number;
}

interface BatterySocRecord {
  save_time: string;
  device_name: string;
  value: number;
}

interface DailyLoadRecord {
  date: string;
  daily_consumption_kwh: number;
}

interface ProjectResult {
  project_id: string;
  project_name: string;
  daily_generation: DailyGenRecord[];
  battery_soc: BatterySocRecord[];
  daily_load?: DailyLoadRecord[];
  raw_data_summary: Record<string, number>;
}

interface ResultsDashboardProps {
  result: ProjectResult;
  fromCache: boolean;
  onClose: () => void;
}

// ─── Shared Plotly layout base ────────────────────────────────────────────

const baseLayout: Partial<Plotly.Layout> = {
  autosize: true,
  margin: { t: 12, r: 12, l: 46, b: 48 },
  paper_bgcolor: 'transparent',
  plot_bgcolor: 'transparent',
  font: { color: '#6b7280', size: 11, family: 'Inter, system-ui, sans-serif' },
  xaxis: {
    gridcolor: 'rgba(255,255,255,0.04)',
    linecolor: 'rgba(255,255,255,0.08)',
    tickfont: { size: 10 },
    showgrid: true,
  },
  yaxis: {
    gridcolor: 'rgba(255,255,255,0.06)',
    linecolor: 'transparent',
    tickfont: { size: 10 },
    showgrid: true,
  },
  legend: {
    bgcolor: 'transparent',
    borderwidth: 0,
    font: { size: 11 },
  },
  hoverlabel: {
    bgcolor: '#1e2530',
    bordercolor: '#008ED3',
    font: { size: 12, color: '#f3f4f6' },
  },
};

const plotConfig: Partial<Plotly.Config> = {
  responsive: true,
  displayModeBar: false,
};

// ─── KPI Card ────────────────────────────────────────────────────────────────

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: i * 0.07, duration: 0.35, ease: [0.16, 1, 0.3, 1] }
  }),
};

interface KpiProps {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
  index: number;
}

function KpiCard({ icon: Icon, label, value, sub, color, trend, index }: KpiProps) {
  const TrendIcon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus;
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="relative flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 overflow-hidden"
    >
      {/* Background glow */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 blur-2xl"
        style={{ background: color }}
      />
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}1a` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {trend && (
          <span className={cn(
            'flex items-center gap-0.5 text-[11px] font-medium rounded-full px-2 py-0.5',
            trend === 'up' ? 'text-[#00A86B] bg-[#00A86B]/10' :
            trend === 'down' ? 'text-red-400 bg-red-400/10' :
            'text-muted-foreground bg-muted/50'
          )}>
            <TrendIcon className="w-3 h-3" />
          </span>
        )}
      </div>
      <div>
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-display font-bold text-foreground leading-none">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-1.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

// ─── Chart Card wrapper ───────────────────────────────────────────────────

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  index: number;
  fullWidth?: boolean;
}

function ChartCard({ title, subtitle, children, index, fullWidth }: ChartCardProps) {
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'rounded-2xl border border-border bg-card p-5',
        fullWidth && 'col-span-full'
      )}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="h-[280px]">{children}</div>
    </motion.div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export function ResultsDashboard({ result, fromCache, onClose }: ResultsDashboardProps) {

  // ── KPI computations ──
  const kpis = useMemo(() => {
    const daily = result.daily_generation ?? [];
    const soc = result.battery_soc ?? [];

    const totalKwh = daily.reduce((s, d) => s + (d.total_generation_kwh ?? 0), 0);
    const avgKwh = daily.length > 0 ? totalKwh / daily.length : 0;
    const maxSoc = soc.length > 0 ? Math.max(...soc.map(d => d.value ?? 0)) : null;
    const minSoc = soc.length > 0 ? Math.min(...soc.map(d => d.value ?? 0)) : null;
    const days = daily.length;
    const totalDurationH = daily.reduce((s, d) => s + (d.total_duration_min ?? 0), 0) / 60;

    // Period label
    const dates = daily.map(d => d.date).sort();
    const periodLabel = dates.length >= 2
      ? `${dates[0]} → ${dates[dates.length - 1]}`
      : dates[0] ?? '—';

    return { totalKwh, avgKwh, maxSoc, minSoc, days, totalDurationH, periodLabel };
  }, [result]);

  // ── Chart data ──

  // Generation bar chart
  const genChartData: Plotly.Data[] = useMemo(() => {
    const daily = result.daily_generation ?? [];
    if (!daily.length) return [];
    return [{
      type: 'bar',
      x: daily.map(d => d.date),
      y: daily.map(d => d.total_generation_kwh ?? 0),
      name: 'Generación kWh',
      marker: {
        color: daily.map(d => {
          const v = d.total_generation_kwh ?? 0;
          const max = Math.max(...daily.map(x => x.total_generation_kwh ?? 0));
          const ratio = max > 0 ? v / max : 0;
          return `rgba(0,${Math.round(142 + ratio * 30)},${Math.round(211 - ratio * 40)},${0.6 + ratio * 0.4})`;
        }),
      },
      hovertemplate: '<b>%{x}</b><br>%{y:.2f} kWh<extra></extra>',
    }];
  }, [result.daily_generation]);

  // Duration area chart
  const durationChartData: Plotly.Data[] = useMemo(() => {
    const daily = result.daily_generation ?? [];
    if (!daily.length) return [];
    return [{
      type: 'scatter',
      mode: 'lines',
      x: daily.map(d => d.date),
      y: daily.map(d => (d.total_duration_min ?? 0) / 60),
      name: 'Horas activo',
      line: { color: '#8B5CF6', width: 2.5, shape: 'spline' },
      fill: 'tozeroy',
      fillcolor: 'rgba(139,92,246,0.08)',
      hovertemplate: '<b>%{x}</b><br>%{y:.1f} h activo<extra></extra>',
    }];
  }, [result.daily_generation]);

  // Battery SOC multi-device
  const batteryChartData: Plotly.Data[] = useMemo(() => {
    const soc = result.battery_soc ?? [];
    if (!soc.length) return [];
    const devices = [...new Set(soc.map(d => d.device_name))].slice(0, 6);
    const colors = ['#00A86B', '#008ED3', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
    return devices.map((device, i) => {
      const rows = soc
        .filter(d => d.device_name === device)
        .sort((a, b) => a.save_time.localeCompare(b.save_time));
      return {
        type: 'scatter',
        mode: 'lines',
        name: device ?? `Unidad ${i + 1}`,
        x: rows.map(d => d.save_time),
        y: rows.map(d => d.value ?? 0),
        line: { color: colors[i % colors.length], width: 2, shape: 'spline' },
        hovertemplate: `<b>${device}</b><br>%{x}<br>SOC: %{y:.1f}%<extra></extra>`,
      } as Plotly.Data;
    });
  }, [result.battery_soc]);

  // Daily load consumption
  const loadChartData: Plotly.Data[] = useMemo(() => {
    const load = result.daily_load ?? [];
    if (!load.length) return [];
    return [{
      type: 'bar',
      x: load.map(d => d.date),
      y: load.map(d => d.daily_consumption_kwh ?? 0),
      name: 'Consumo kWh',
      marker: { color: '#F59E0B', opacity: 0.85 },
      hovertemplate: '<b>%{x}</b><br>%{y:.2f} kWh consumo<extra></extra>',
    }];
  }, [result.daily_load]);

  const hasSoc = batteryChartData.length > 0;
  const hasLoad = loadChartData.length > 0;
  const hasGen = genChartData.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 overflow-auto bg-background"
    >
      {/* ── Sticky top bar ── */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {/* Project icon */}
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(0,142,211,0.12)' }}>
            <Sun className="w-5 h-5 text-[#008ED3]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-lg font-bold text-foreground truncate">
                {result.project_name}
              </h1>
              {fromCache && (
                <span className="flex-shrink-0 flex items-center gap-1 text-[10px] font-semibold text-[#00A86B] bg-[#00A86B]/10 border border-[#00A86B]/20 rounded-full px-2 py-0.5">
                  <History className="w-3 h-3" /> Caché
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">{kpis.periodLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button size="sm" className="gap-1.5 h-8 text-xs" style={{ background: '#008ED3', color: 'white' }}>
            <FileDown className="w-3.5 h-3.5" /> Excel
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
            <FileDown className="w-3.5 h-3.5" /> PPTX
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="p-6 space-y-6">

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            index={0} icon={Zap}
            label="Generación Total"
            value={`${kpis.totalKwh.toFixed(1)} kWh`}
            sub={`${kpis.days} días de datos`}
            color="#008ED3" trend="up"
          />
          <KpiCard
            index={1} icon={TrendingUp}
            label="Promedio Diario"
            value={`${kpis.avgKwh.toFixed(2)} kWh`}
            sub="Por día calendario"
            color="#00A86B" trend="neutral"
          />
          <KpiCard
            index={2} icon={Battery}
            label="SOC Máximo"
            value={kpis.maxSoc !== null ? `${kpis.maxSoc.toFixed(1)}%` : '—'}
            sub={kpis.minSoc !== null ? `Mín: ${kpis.minSoc.toFixed(1)}%` : undefined}
            color="#F59E0B" trend={kpis.maxSoc !== null && kpis.maxSoc >= 80 ? 'up' : 'down'}
          />
          <KpiCard
            index={3} icon={Calendar}
            label="Horas Activo"
            value={`${kpis.totalDurationH.toFixed(0)} h`}
            sub={`${(kpis.totalDurationH / (kpis.days || 1)).toFixed(1)} h/día promedio`}
            color="#8B5CF6" trend="neutral"
          />
        </div>

        {/* Charts grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

          {/* 1 — Generación diaria (bar) */}
          {hasGen && (
            <ChartCard
              index={4}
              title="Generación Diaria"
              subtitle="kWh netos por día (final_kwh − initial_kwh)"
            >
              <Plot
                data={genChartData}
                layout={{
                  ...baseLayout,
                  yaxis: { ...baseLayout.yaxis, title: { text: 'kWh', font: { size: 11 } } },
                  bargap: 0.25,
                } as Partial<Plotly.Layout>}
                useResizeHandler
                style={{ width: '100%', height: '100%' }}
                config={plotConfig}
              />
            </ChartCard>
          )}

          {/* 2 — Horas activo (area) */}
          {hasGen && (
            <ChartCard
              index={5}
              title="Horas de Operación Diaria"
              subtitle="Tiempo acumulado activo por día"
            >
              <Plot
                data={durationChartData}
                layout={{
                  ...baseLayout,
                  yaxis: { ...baseLayout.yaxis, title: { text: 'Horas', font: { size: 11 } } },
                } as Partial<Plotly.Layout>}
                useResizeHandler
                style={{ width: '100%', height: '100%' }}
                config={plotConfig}
              />
            </ChartCard>
          )}

          {/* 3 — Battery SOC multi-device (full width if only chart) */}
          {hasSoc && (
            <ChartCard
              index={6}
              title="Estado de Carga de Baterías (SOC)"
              subtitle={`${batteryChartData.length} unidad${batteryChartData.length > 1 ? 'es' : ''} — promedio horario`}
              fullWidth={!hasLoad && !hasGen}
            >
              <Plot
                data={batteryChartData}
                layout={{
                  ...baseLayout,
                  yaxis: {
                    ...baseLayout.yaxis,
                    range: [0, 105],
                    title: { text: 'SOC %', font: { size: 11 } },
                    ticksuffix: '%',
                  },
                  legend: { ...baseLayout.legend, x: 1, xanchor: 'right', y: 1 },
                } as Partial<Plotly.Layout>}
                useResizeHandler
                style={{ width: '100%', height: '100%' }}
                config={plotConfig}
              />
            </ChartCard>
          )}

          {/* 4 — Consumo diario load power */}
          {hasLoad && (
            <ChartCard
              index={7}
              title="Consumo Diario de Carga"
              subtitle="kWh de potencia de carga (Load Power)"
            >
              <Plot
                data={loadChartData}
                layout={{
                  ...baseLayout,
                  yaxis: { ...baseLayout.yaxis, title: { text: 'kWh', font: { size: 11 } } },
                  bargap: 0.3,
                } as Partial<Plotly.Layout>}
                useResizeHandler
                style={{ width: '100%', height: '100%' }}
                config={plotConfig}
              />
            </ChartCard>
          )}
        </div>

        {/* ── Raw data summary ── */}
        {Object.keys(result.raw_data_summary ?? {}).length > 0 && (
          <motion.div
            custom={8}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Archivos Procesados</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {Object.entries(result.raw_data_summary).map(([file, rows]) => (
                <div key={file} className="flex flex-col gap-1 rounded-xl bg-muted/30 border border-border px-3 py-2.5">
                  <span className="text-[10px] font-mono text-muted-foreground truncate" title={file}>{file}.csv</span>
                  <span className="text-base font-display font-bold text-foreground">{rows.toLocaleString()}</span>
                  <span className="text-[10px] text-muted-foreground">filas</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── No data state ── */}
        {!hasGen && !hasSoc && !hasLoad && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <Activity className="w-16 h-16 opacity-10" />
            <p className="text-sm">No se encontraron datos suficientes para graficar.</p>
            <p className="text-xs opacity-60">Verifica que la carpeta contenga los archivos CSV requeridos.</p>
          </div>
        )}

        {/* Bottom padding */}
        <div className="h-8" />
      </div>
    </motion.div>
  );
}

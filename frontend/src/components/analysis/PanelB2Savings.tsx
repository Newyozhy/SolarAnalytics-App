// Panel B-2 — KPIs de Ahorro por Período + Barras Agrupadas
// Tarifa editable por proyecto, toggle Semanas/Meses
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DollarSign, Zap, Leaf, TrendingUp, AlertCircle } from 'lucide-react';
import PlotlyChart from 'react-plotly.js';
import { motion } from 'motion/react';
import { ChartPanel } from '@/components/ui/ChartPanel';
import { MetricToggle } from '@/components/ui/MetricToggle';
import { analysisApi } from '@/api/analysis';
import type { SavingsResponse } from '@/api/analysis';
import { cn } from '@/lib/utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Plot = (PlotlyChart as any).default ?? PlotlyChart;

interface KpiMiniProps {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
  index: number;
}

function KpiMini({ icon: Icon, label, value, sub, color, index }: KpiMiniProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      className="relative flex-1 min-w-[140px] flex flex-col gap-1.5 rounded-xl border border-border bg-card/80 p-4 overflow-hidden"
    >
      <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-10 blur-xl" style={{ background: color }} />
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}1a` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-xl font-display font-bold text-foreground leading-tight mt-0.5">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

// GRAN_OPTIONS built inside component to use t()

interface PanelB2Props { projectId: string; }

export function PanelB2Savings({ projectId }: PanelB2Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const GRAN_OPTIONS = [
    { value: 'month' as const, label: t('panels.b2.months') },
    { value: 'week'  as const, label: t('panels.b2.weeks') },
  ];
  const [granularity, setGranularity]         = useState<'week' | 'month'>('month');
  const [baseConsumption, setBaseConsumption] = useState<number>(5);
  const [tariff, setTariff]                   = useState<number>(0.15);
  const [baseInput, setBaseInput]             = useState('5');
  const [tariffInput, setTariffInput]         = useState('0.15');
  const [data, setData]                       = useState<SavingsResponse | null>(null);
  const [loading, setLoading]                 = useState(false);

  const fetchData = useCallback(() => {
    if (!projectId) return;
    setLoading(true);
    analysisApi
      .getSavings(projectId, {
        base_consumption_kwh_per_hour: baseConsumption,
        tariff_per_kwh: tariff,
        granularity,
      })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId, granularity, baseConsumption, tariff]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApply = () => {
    const b = parseFloat(baseInput);
    const t = parseFloat(tariffInput);
    if (!isNaN(b) && b > 0) setBaseConsumption(b);
    if (!isNaN(t) && t > 0) setTariff(t);
  };

  const plotData = useMemo(() => {
    if (!data?.data.length) return [];
    const rows = data.data;
    return [
      {
        type: 'bar', name: t('panels.b2.solarKwh'),
        x: rows.map(r => r.label),
        y: rows.map(r => r.solar_kwh),
        marker: { color: '#00A86B', opacity: 0.85 },
        hovertemplate: `<b>%{x}</b><br>${t('panels.b2.solarKwh')}: <b>%{y:.2f} kWh</b><extra></extra>`,
      },
      {
        type: 'bar', name: t('panels.b2.netKwh'),
        x: rows.map(r => r.label),
        y: rows.map(r => r.net_kwh),
        marker: { color: '#EF4444', opacity: 0.75 },
        hovertemplate: `<b>%{x}</b><br>${t('panels.b2.netKwh')}: <b>%{y:.2f} kWh</b><extra></extra>`,
      },
    ];
  }, [data, lang]); // lang triggers recalc on language change

  const kpis = data?.kpis;
  const currency = kpis?.currency ?? 'USD';

  return (
    <div className="space-y-4">
      {/* Config bar */}
      <div className="flex flex-wrap items-end gap-3 px-1">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('panels.b2.baseConsumption')}</label>
          <div className="flex gap-1.5">
            <input
              type="number" step="0.01" min="0.01"
              value={baseInput}
              onChange={e => setBaseInput(e.target.value)}
              className="w-24 h-8 px-2.5 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#008ED3]/50"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('panels.b2.tariff')} ({currency}/kWh)</label>
          <div className="flex gap-1.5">
            <input
              type="number" step="0.001" min="0.001"
              value={tariffInput}
              onChange={e => setTariffInput(e.target.value)}
              className="w-24 h-8 px-2.5 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#008ED3]/50"
            />
          </div>
        </div>
        <button
          onClick={handleApply}
          className="h-8 px-4 rounded-lg bg-[#008ED3] text-white text-xs font-semibold hover:bg-[#006FA8] transition-colors mb-0"
        >
          {t('panels.b2.calculate')}
        </button>
        <div className="ml-auto">
          <MetricToggle options={GRAN_OPTIONS} value={granularity} onChange={setGranularity} />
        </div>
      </div>

      {/* KPI row */}
      {kpis && (
        <div className="flex flex-wrap gap-3">
          <KpiMini index={0} icon={Zap}       label={t('panels.b2.totalSolar')}    value={`${kpis.total_solar_kwh.toFixed(1)} kWh`}     sub={`${kpis.pct_autonomy.toFixed(1)}% ${t('panels.b2.solarAutonomy')}`} color="#008ED3" />
          <KpiMini index={1} icon={Leaf}       label={t('panels.b2.savedKwh')}     value={`${kpis.total_saved_kwh.toFixed(1)} kWh`}     sub={t('panels.b2.fromGrid')} color="#00A86B" />
          <KpiMini index={2} icon={DollarSign} label={t('panels.b2.totalSaving')}  value={`${currency} ${kpis.total_saved_usd.toFixed(2)}`} sub={`@${kpis.tariff_per_kwh} ${currency}/kWh`} color="#F59E0B" />
          <KpiMini index={3} icon={TrendingUp} label={t('panels.b2.gridConsumption')} value={`${(kpis.total_base_kwh - kpis.total_saved_kwh).toFixed(1)} kWh`} sub={t('panels.b2.netConsumptionTotal')} color="#EF4444" />
        </div>
      )}

      {/* Chart */}
      <ChartPanel
        index={1}
        title={t('panels.b2.title')}
        subtitle={t('panels.b2.subtitle')}
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
              barmode: 'group',
              bargap: 0.25,
              bargroupgap: 0.08,
              xaxis: {
                gridcolor: 'rgba(255,255,255,0.04)',
                tickfont: { size: 10 },
                tickangle: granularity === 'week' ? -45 : 0,
              },
              yaxis: {
                gridcolor: 'rgba(255,255,255,0.06)',
                linecolor: 'transparent',
                tickfont: { size: 10 },
                zeroline: false,
                title: { text: 'kWh', font: { size: 11 } },
              },
              hoverlabel: { bgcolor: '#1e2530', bordercolor: '#008ED3', font: { size: 12, color: '#f3f4f6' } },
              legend: { bgcolor: 'transparent', borderwidth: 0, font: { size: 11 }, orientation: 'h', y: -0.2 },
            }}
            useResizeHandler
            style={{ width: '100%', height: '100%' }}
            config={{ responsive: true, displayModeBar: false }}
          />
        ) : !loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
            <AlertCircle className="w-8 h-8 opacity-20" />
            <p className="text-xs">{t('panels.b2.noData')}</p>
          </div>
        ) : null}
      </ChartPanel>
    </div>
  );
}

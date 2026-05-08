// Panel A-1 — Producción Solar por Período (kWh o Duración)
// Toggle: Días / Semanas / Meses + kWh / Duración
// Indicador automático de días fragmentados (≥3 sesiones)
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, Clock, AlertCircle } from 'lucide-react';
import PlotlyChart from 'react-plotly.js';
import { ChartPanel } from '@/components/ui/ChartPanel';
import { GranularityToggle } from '@/components/ui/GranularityToggle';
import { MetricToggle } from '@/components/ui/MetricToggle';
import { OutlierBanner } from '@/components/ui/OutlierBanner';
import { analysisApi } from '@/api/analysis';
import type { Granularity, GenerationMetric, GenerationResponse } from '@/api/analysis';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Plot = (PlotlyChart as any).default ?? PlotlyChart;

const baseLayout: Record<string, any> = {
  autosize: true,
  margin: { t: 8, r: 12, l: 50, b: 44 },
  paper_bgcolor: 'transparent',
  plot_bgcolor: 'transparent',
  font: { color: '#6b7280', size: 11, family: 'Inter, system-ui, sans-serif' },
  xaxis: { gridcolor: 'rgba(255,255,255,0.04)', linecolor: 'rgba(255,255,255,0.08)', tickfont: { size: 10 } },
  yaxis: { gridcolor: 'rgba(255,255,255,0.06)', linecolor: 'transparent', tickfont: { size: 10 }, zeroline: false },
  hoverlabel: { bgcolor: '#1e2530', bordercolor: '#008ED3', font: { size: 12, color: '#f3f4f6' } },
  bargap: 0.28,
};

// METRIC_OPTIONS are built inside the component to use t()

interface PanelA1Props { projectId: string; }

export function PanelA1Generation({ projectId }: PanelA1Props) {
  const { t } = useTranslation();
  const METRIC_OPTIONS: { value: GenerationMetric; label: string; icon: React.ElementType }[] = [
    { value: 'kwh',      label: t('panels.a1.metricEnergy'), icon: Zap  },
    { value: 'duration', label: t('panels.a1.metricDuration'), icon: Clock },
  ];
  const [granularity, setGranularity]   = useState<Granularity>('week');
  const [metric, setMetric]             = useState<GenerationMetric>('kwh');
  const [showOutliers, setShowOutliers] = useState(true);
  const [data, setData]                 = useState<GenerationResponse | null>(null);
  const [loading, setLoading]           = useState(false);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    analysisApi
      .getGeneration(projectId, { granularity, metric, include_outliers: showOutliers })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId, granularity, metric, showOutliers]);

  const plotData = useMemo(() => {
    if (!data?.data.length) return [];
    const rows = data.data;
    const maxVal = Math.max(...rows.map(r => r.value));

    // Main bars
    const bars: any = {
      type: 'bar',
      x: rows.map(r => r.label),
      y: rows.map(r => r.value),
      name: metric === 'kwh' ? t('panels.a1.kwh') : t('panels.a1.hours'),
      marker: {
        color: rows.map(r => {
          const ratio = maxVal > 0 ? r.value / maxVal : 0;
          return `rgba(0,${Math.round(142 + ratio * 30)},${Math.round(211 - ratio * 40)},${0.55 + ratio * 0.45})`;
        }),
        line: { color: 'rgba(0,142,211,0.2)', width: 1 },
      },
      customdata: rows.map(r => [r.avg_per_day, r.n_days, r.fragmented_days, r.max_sessions]),
      hovertemplate: [
        '<b>%{x}</b>',
        metric === 'kwh'
          ? '%{y:.2f} kWh totales<br>Promedio: %{customdata[0]:.2f} kWh/día'
          : '%{y:.1f} h totales<br>Promedio: %{customdata[0]:.1f} h/día',
        '%{customdata[1]} días · %{customdata[2]} días con interrupciones',
        '<extra></extra>',
      ].join('<br>'),
    };

    // Fragmented days scatter markers
    const fragmented = rows.filter(r => r.fragmented_days > 0);
    const markers: any = fragmented.length > 0 ? {
      type: 'scatter',
      mode: 'markers+text',
      x: fragmented.map(r => r.label),
      y: fragmented.map(r => r.value),
      text: fragmented.map(r => `${r.fragmented_days}✕`),
      textposition: 'top center',
      textfont: { size: 9, color: '#F59E0B' },
      marker: { symbol: 'circle', size: 8, color: '#F59E0B', line: { color: '#F59E0B80', width: 1 } },
      name: t('panels.a1.fragDays'),
      hovertemplate: '<b>%{x}</b><br>%{customdata} días fragmentados<extra></extra>',
      customdata: fragmented.map(r => r.fragmented_days),
      showlegend: true,
    } : null;

    return markers ? [bars, markers] : [bars];
  }, [data, metric]);

  const insight = useMemo(() => {
    if (!data?.summary) return undefined;
    const s = data.summary;
    const fragCount = s.fragmented_days_count;
    return `${s.total_kwh.toFixed(1)} kWh generados en ${s.total_days} días (${s.avg_kwh_per_day.toFixed(2)} kWh/día promedio)${fragCount > 0 ? ` · ${fragCount} días con interrupciones múltiples (posibles días nublados)` : ''}.`;
  }, [data]);

  const yAxisTitle = metric === 'kwh' ? 'kWh' : 'Horas';

  return (
    <div className="space-y-3">
      {/* Outlier banner */}
      {data?.outliers && data.outliers.length > 0 && (
        <OutlierBanner
          outliers={data.outliers}
          showOutliers={showOutliers}
          onToggleOutliers={setShowOutliers}
        />
      )}

      <ChartPanel
        index={0}
        title={t('panels.a1.title')}
        subtitle={t('panels.a1.subtitle')}
        insight={insight}
        loading={loading}
        height={320}
        controls={
          <>
            <MetricToggle options={METRIC_OPTIONS} value={metric} onChange={setMetric} />
            <GranularityToggle value={granularity} onChange={setGranularity} />
          </>
        }
      >
        {plotData.length > 0 ? (
          <Plot
            data={plotData}
            layout={{
              ...baseLayout,
              yaxis: { ...baseLayout.yaxis, title: { text: yAxisTitle, font: { size: 11 } } },
              legend: { bgcolor: 'transparent', borderwidth: 0, font: { size: 11 }, orientation: 'h', y: -0.15 },
            }}
            useResizeHandler
            style={{ width: '100%', height: '100%' }}
            config={{ responsive: true, displayModeBar: false }}
          />
        ) : !loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
            <AlertCircle className="w-8 h-8 opacity-20" />
            <p className="text-xs">{t('panels.a1.noData')}</p>
          </div>
        ) : null}
      </ChartPanel>
    </div>
  );
}

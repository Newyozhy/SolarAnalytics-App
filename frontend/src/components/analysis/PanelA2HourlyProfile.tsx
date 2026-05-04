// Panel A-2 — Perfil Horario de Generación (00:00–23:00)
// Toggle métrica: minutos / kWh promedio / kWh acumulado
import React, { useState, useEffect, useMemo } from 'react';
import { Clock, Zap, BarChart3, AlertCircle } from 'lucide-react';
import PlotlyChart from 'react-plotly.js';
import { ChartPanel } from '@/components/ui/ChartPanel';
import { MetricToggle } from '@/components/ui/MetricToggle';
import { analysisApi } from '@/api/analysis';
import type { HourlyMetric, HourlyProfile } from '@/api/analysis';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Plot = (PlotlyChart as any).default ?? PlotlyChart;

const METRIC_OPTIONS: { value: HourlyMetric; label: string; icon: React.ElementType }[] = [
  { value: 'minutes',        label: 'Minutos activos', icon: Clock   },
  { value: 'kwh',            label: 'kWh promedio',    icon: Zap     },
  { value: 'kwh_cumulative', label: 'kWh acumulado',   icon: BarChart3 },
];

const METRIC_CONFIG: Record<HourlyMetric, { yTitle: string; color: string; gradientStart: string }> = {
  minutes:        { yTitle: 'Min / hora',      color: '#8B5CF6', gradientStart: 'rgba(139,92,246,0.30)' },
  kwh:            { yTitle: 'kWh promedio',    color: '#008ED3', gradientStart: 'rgba(0,142,211,0.30)'  },
  kwh_cumulative: { yTitle: 'kWh acumulados',  color: '#00A86B', gradientStart: 'rgba(0,168,107,0.30)' },
};

const METRIC_LABELS: Record<HourlyMetric, string> = {
  minutes:        'minutos promedio activos',
  kwh:            'kWh generados promedio',
  kwh_cumulative: 'kWh acumulados totales',
};

interface PanelA2Props { projectId: string; }

export function PanelA2HourlyProfile({ projectId }: PanelA2Props) {
  const [metric, setMetric]   = useState<HourlyMetric>('kwh');
  const [data, setData]       = useState<HourlyProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    analysisApi
      .getHourlyProfile(projectId, { metric })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId, metric]);

  const plotData = useMemo(() => {
    if (!data?.data.length) return [];
    const cfg = METRIC_CONFIG[metric];
    const rows = data.data;

    return [{
      type: 'scatter',
      mode: 'lines',
      x: rows.map(r => r.hour_label),
      y: rows.map(r => r.value),
      name: METRIC_LABELS[metric],
      line: { color: cfg.color, width: 2.5, shape: 'spline' },
      fill: 'tozeroy',
      fillcolor: cfg.gradientStart,
      customdata: rows.map(r => [r.avg_minutes, r.avg_kwh, r.total_kwh]),
      hovertemplate:
        '<b>%{x}</b><br>' +
        '%{y:.3f} ' + METRIC_LABELS[metric] + '<br>' +
        '%{customdata[0]:.1f} min activos · %{customdata[1]:.3f} kWh avg<extra></extra>',
    }];
  }, [data, metric]);

  const insight = useMemo(() => {
    if (!data?.summary) return undefined;
    const s = data.summary;
    const peakLabel = `${s.peak_hour.toString().padStart(2, '0')}:00`;
    return `Hora pico: ${peakLabel} con ${s.peak_value.toFixed(3)} ${METRIC_LABELS[metric]}. Análisis sobre ${s.n_days} días (${s.period_start} → ${s.period_end}).`;
  }, [data, metric]);

  return (
    <ChartPanel
      index={1}
      title="Perfil Horario de Generación"
      subtitle="Distribución promedio de generación solar a lo largo del día (00:00 – 23:00)"
      insight={insight}
      loading={loading}
      height={300}
      controls={
        <MetricToggle options={METRIC_OPTIONS} value={metric} onChange={setMetric} />
      }
    >
      {plotData.length > 0 ? (
        <Plot
          data={plotData}
          layout={{
            autosize: true,
            margin: { t: 8, r: 12, l: 50, b: 44 },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: { color: '#6b7280', size: 11, family: 'Inter, system-ui, sans-serif' },
            xaxis: {
              gridcolor: 'rgba(255,255,255,0.04)',
              linecolor: 'rgba(255,255,255,0.08)',
              tickfont: { size: 10 },
              tickangle: -45,
            },
            yaxis: {
              gridcolor: 'rgba(255,255,255,0.06)',
              linecolor: 'transparent',
              tickfont: { size: 10 },
              zeroline: false,
              title: { text: METRIC_CONFIG[metric].yTitle, font: { size: 11 } },
            },
            hoverlabel: { bgcolor: '#1e2530', bordercolor: '#008ED3', font: { size: 12, color: '#f3f4f6' } },
            showlegend: false,
          }}
          useResizeHandler
          style={{ width: '100%', height: '100%' }}
          config={{ responsive: true, displayModeBar: false }}
        />
      ) : !loading ? (
        <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
          <AlertCircle className="w-8 h-8 opacity-20" />
          <p className="text-xs">Sin datos para generar el perfil horario</p>
        </div>
      ) : null}
    </ChartPanel>
  );
}

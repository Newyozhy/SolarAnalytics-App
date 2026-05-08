// Panel D-2 — Potencia DC del Sistema y Temperatura
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Cpu, Activity, ThermometerSun, AlertCircle } from 'lucide-react';
import PlotlyChart from 'react-plotly.js';
import { ChartPanel } from '@/components/ui/ChartPanel';
import { GranularityToggle } from '@/components/ui/GranularityToggle';
import { analysisApi } from '@/api/analysis';
import type { SystemPowerResponse, Granularity } from '@/api/analysis';
import { cn } from '@/lib/utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Plot = (PlotlyChart as any).default ?? PlotlyChart;

interface PanelD2Props { projectId: string; }

export function PanelD2SystemPower({ projectId }: PanelD2Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [data, setData] = useState<SystemPowerResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    analysisApi
      .getSystemPower(projectId, { granularity })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId, granularity]);

  const plotTraces = useMemo(() => {
    if (!data?.traces?.length) return [];
    
    return data.traces.map(trace => ({
      type: 'scatter',
      mode: 'lines',
      name: trace.name,
      x: trace.data.map(d => d.label),
      y: trace.data.map(d => d.value),
      line: { color: trace.color, width: 2, shape: 'spline' },
      yaxis: trace.class === 'temp' ? 'y2' : 'y',
      hovertemplate: `<b>%{x}</b><br>${trace.name}: <b>%{y:.2f} ${trace.unit}</b><extra></extra>`,
    }));
  }, [data, lang]); // lang triggers recalc on language change

  const summary = data?.summary;
  const insight = summary
    ? `${t('panels.d2.avgLoad')}: ${summary.avg_load ?? 0} kW · ${t('panels.d2.avgSource')}: ${summary.avg_source ?? 0} kW · ${t('panels.d2.avgTemp')}: ${summary.avg_temp ?? 0}°C (Max ${summary.max_temp ?? 0}°C).`
    : undefined;

  return (
    <ChartPanel
      index={1}
      title={t('panels.d2.title')}
      subtitle={t('panels.d2.subtitle')}
      insight={insight}
      loading={loading}
      height={320}
      controls={<GranularityToggle value={granularity} onChange={setGranularity} />}
    >
      {plotTraces.length > 0 ? (
        <Plot
          data={plotTraces}
          layout={{
            autosize: true,
            margin: { t: 10, r: 50, l: 50, b: 40 },
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
              title: { text: t('panels.d2.powerKw'), font: { size: 11 } },
              gridcolor: 'rgba(255,255,255,0.06)',
              zeroline: false,
              tickfont: { size: 10 },
            },
            yaxis2: {
              title: { text: t('panels.d2.tempC'), font: { size: 11 } },
              overlaying: 'y',
              side: 'right',
              showgrid: false,
              zeroline: false,
              tickfont: { size: 10 },
            },
            hoverlabel: { bgcolor: '#1e2530', bordercolor: '#008ED3', font: { size: 12, color: '#f3f4f6' } },
            legend: {
              bgcolor: 'transparent', borderwidth: 0,
              font: { size: 11 }, orientation: 'h', y: -0.2, x: 0.5, xanchor: 'center'
            },
            hovermode: 'x unified',
          }}
          useResizeHandler
          style={{ width: '100%', height: '100%' }}
          config={{ responsive: true, displayModeBar: false }}
        />
      ) : !loading ? (
        <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
          <AlertCircle className="w-8 h-8 opacity-20" />
          <p className="text-xs">{t('panels.d2.noData')}</p>
        </div>
      ) : null}
    </ChartPanel>
  );
}

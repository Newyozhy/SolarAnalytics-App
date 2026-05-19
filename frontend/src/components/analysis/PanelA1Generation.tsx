// Panel A-1 — Solar Production by Period (kWh or Duration)
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, Clock, AlertCircle, BarChart2, Table as TableIcon, FileSpreadsheet } from 'lucide-react';
import PlotlyChart from 'react-plotly.js';
import { ChartPanel } from '@/components/ui/ChartPanel';
import { GranularityToggle } from '@/components/ui/GranularityToggle';
import { MetricToggle } from '@/components/ui/MetricToggle';
import { OutlierBanner } from '@/components/ui/OutlierBanner';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
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

interface PanelA1Props { projectId: string; }

export function PanelA1Generation({ projectId }: PanelA1Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const METRIC_OPTIONS: { value: GenerationMetric; label: string; icon: React.ElementType }[] = [
    { value: 'kwh',      label: t('panels.a1.metricEnergy'),   icon: Zap  },
    { value: 'duration', label: t('panels.a1.metricDuration'), icon: Clock },
  ];

  const VIEW_OPTIONS: { value: 'chart' | 'table'; label: string; icon: React.ElementType }[] = [
    { value: 'chart', label: t('common.chartView'), icon: BarChart2 },
    { value: 'table', label: t('common.tableView'), icon: TableIcon },
  ];

  const [granularity, setGranularity]   = useState<Granularity>('week');
  const [metric, setMetric]             = useState<GenerationMetric>('kwh');
  const [viewMode, setViewMode]         = useState<'chart' | 'table'>('chart');
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

  // lang in deps ensures recalc on language change
  const plotData = useMemo(() => {
    if (!data?.data.length) return [];
    const rows = data.data;
    const maxVal = Math.max(...rows.map(r => r.value));

    const kwhLabel = metric === 'kwh' ? t('panels.a1.kwh') : t('panels.a1.hours');
    const hoverTotal = metric === 'kwh'
      ? `%{y:.2f} kWh<br>${t('panels.a1.metricEnergy')}: %{customdata[0]:.2f} kWh/d`
      : `%{y:.1f} h<br>${t('panels.a1.metricDuration')}: %{customdata[0]:.1f} h/d`;

    const bars: any = {
      type: 'bar',
      x: rows.map(r => r.label),
      y: rows.map(r => r.value),
      name: kwhLabel,
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
        hoverTotal,
        `%{customdata[1]} d · %{customdata[2]} ${t('panels.a1.fragDays')}`,
        '<extra></extra>',
      ].join('<br>'),
    };

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
      hovertemplate: `<b>%{x}</b><br>%{customdata} ${t('panels.a1.fragDays')}<extra></extra>`,
      customdata: fragmented.map(r => r.fragmented_days),
      showlegend: true,
    } : null;

    return markers ? [bars, markers] : [bars];
  }, [data, metric, lang]); // lang triggers recalc on language change

  const handleExportExcel = () => {
    if (!data?.data) return;
    
    const headers = [
      t(`granularity.${granularity}`),
      metric === 'kwh' ? t('panels.a1.metricEnergy') : t('panels.a1.metricDuration'),
      t('dashboard.dailyAverage'),
      t('common.days'),
      t('panels.a1.fragDays')
    ];

    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...data.data.map(row => {
        const val = metric === 'kwh' ? row.value.toFixed(2) : row.value.toFixed(1);
        const avg = metric === 'kwh' ? row.avg_per_day.toFixed(2) : row.avg_per_day.toFixed(1);
        return `"${row.label}",${val},${avg},${row.n_days},${row.fragmented_days}`;
      })
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `solar_production_${granularity}_${metric}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const insight = useMemo(() => {
    if (!data?.summary) return undefined;
    const s = data.summary;
    const fragCount = s.fragmented_days_count;
    const fragPart = fragCount > 0 ? ` · ${fragCount} ${t('panels.a1.fragDays')}` : '';
    return `${s.total_kwh.toFixed(1)} kWh — ${s.total_days} d (${s.avg_kwh_per_day.toFixed(2)} kWh/d avg)${fragPart}.`;
  }, [data, lang]);

  const yAxisTitle = metric === 'kwh' ? 'kWh' : t('granularity.day');

  return (
    <div className="space-y-3">
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
          <div className="flex items-center gap-2">
            <MetricToggle options={VIEW_OPTIONS} value={viewMode} onChange={setViewMode} />
            <div className="w-px h-4 bg-border/60 mx-1" />
            <MetricToggle options={METRIC_OPTIONS} value={metric} onChange={setMetric} />
            <GranularityToggle value={granularity} onChange={setGranularity} />
          </div>
        }
      >
        {viewMode === 'chart' ? (
          plotData.length > 0 ? (
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
          ) : null
        ) : (
          <div className="h-full flex flex-col">
            <div className="flex justify-end mb-2">
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted/60 border border-border rounded-md transition-all duration-150"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                {t('common.exportExcel')}
              </button>
            </div>
            <div className="flex-1 overflow-auto pr-2 custom-scrollbar">
              {data?.data && data.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t(`granularity.${granularity}`)}</TableHead>
                      <TableHead className="text-right">
                        {metric === 'kwh' ? t('panels.a1.metricEnergy') : t('panels.a1.metricDuration')}
                      </TableHead>
                      <TableHead className="text-right">{t('dashboard.dailyAverage')}</TableHead>
                      <TableHead className="text-right">{t('common.days')}</TableHead>
                      <TableHead className="text-right">{t('panels.a1.fragDays')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.data.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium whitespace-nowrap">{row.label}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {metric === 'kwh' ? row.value.toFixed(2) : row.value.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap text-muted-foreground">
                          {metric === 'kwh' ? row.avg_per_day.toFixed(2) : row.avg_per_day.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">{row.n_days}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {row.fragmented_days > 0 ? (
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-500">
                              {row.fragmented_days}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : !loading ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                  <AlertCircle className="w-8 h-8 opacity-20" />
                  <p className="text-xs">{t('panels.a1.noData')}</p>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </ChartPanel>
    </div>
  );
}

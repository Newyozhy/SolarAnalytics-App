// Panel A-3 — Calendar Heatmap (GitHub contributions style)
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import PlotlyChart from 'react-plotly.js';
import { ChartPanel } from '@/components/ui/ChartPanel';
import { analysisApi } from '@/api/analysis';
import type { CalendarHeatmap } from '@/api/analysis';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Plot = (PlotlyChart as any).default ?? PlotlyChart;

interface PanelA3Props { projectId: string; }

export function PanelA3CalendarHeatmap({ projectId }: PanelA3Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [data, setData]       = useState<CalendarHeatmap | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    analysisApi
      .getCalendarHeatmap(projectId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  // lang in deps ensures day/month labels + tooltips update on language change
  const { plotTraces } = useMemo(() => {
    if (!data?.data.length) return { plotTraces: [] };
    const rows = data.data;

    const startDate = new Date(rows[0].date + 'T00:00:00');
    const startDay  = startDate.getDay(); // 0=Sun

    const padded: (typeof rows[number] | null)[] = [
      ...Array(startDay).fill(null),
      ...rows,
    ];
    while (padded.length % 7 !== 0) padded.push(null);

    const weeks = Math.ceil(padded.length / 7);

    const DAY_LABELS = lang === 'zh'
      ? ['日', '一', '二', '三', '四', '五', '六']
      : lang === 'en'
      ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      : ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    const MONTHS = lang === 'zh'
      ? ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
      : lang === 'en'
      ? ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
      : ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

    // Fragmented day hover text per language
    const fragLabel = (sessions: number) => lang === 'zh'
      ? `⚠️ <i>${sessions} 次会话（多次中断）</i>`
      : lang === 'en'
      ? `⚠️ <i>${sessions} sessions (multiple interruptions)</i>`
      : `⚠️ <i>${sessions} sesiones (interrupciones múltiples)</i>`;

    const contLabel = (sessions: number) => lang === 'zh'
      ? `✅ ${sessions} 次连续会话`
      : lang === 'en'
      ? `✅ ${sessions} continuous session${sessions !== 1 ? 's' : ''}`
      : `✅ ${sessions} sesión${sessions !== 1 ? 'es' : ''} continua`;

    const generatedLabel = lang === 'zh' ? '发电量' : lang === 'en' ? 'generated' : 'generados';

    // Build month x-labels
    const wkLabels: string[] = [];
    let lastMonth = -1;
    for (let w = 0; w < weeks; w++) {
      const cell = padded[w * 7] ?? padded.find((p, i) => i >= w * 7 && p !== null) ?? null;
      if (cell) {
        const mon = new Date(cell.date + 'T00:00:00').getMonth();
        wkLabels.push(mon !== lastMonth ? (lastMonth = mon, MONTHS[mon]) : '');
      } else {
        wkLabels.push('');
      }
    }

    // Build z / hover matrices — shape [7][weeks]
    const z: (number | null)[][] = Array.from({ length: 7 }, () => Array(weeks).fill(null));
    const hover: string[][] = Array.from({ length: 7 }, () => Array(weeks).fill(''));

    padded.forEach((d, i) => {
      const w = Math.floor(i / 7);
      const r = i % 7;
      if (d) {
        z[r][w] = d.kwh;
        const sessionLine = d.is_fragmented ? fragLabel(d.sessions) : contLabel(d.sessions);
        hover[r][w] =
          `<b>${d.date}</b><br>` +
          `⚡ <b>${d.kwh.toFixed(3)} kWh</b> ${generatedLabel}<br>${sessionLine}`;
      }
    });

    const traces = [{
      type: 'heatmap',
      z,
      x: wkLabels,
      y: DAY_LABELS,
      text: hover,
      hovertemplate: '%{text}<extra></extra>',
      colorscale: [
        [0,    'rgba(33,38,45,0.9)'],
        [0.001,'rgba(0,100,180,0.20)'],
        [0.20, 'rgba(0,120,200,0.45)'],
        [0.45, 'rgba(0,142,211,0.70)'],
        [0.70, 'rgba(0,168,107,0.80)'],
        [1,    'rgba(0,200,120,1.00)'],
      ],
      zmin: 0,
      zmax: data.max_kwh,
      showscale: true,
      colorbar: {
        thickness: 10,
        len: 0.55,
        y: 0.5,
        title: { text: 'kWh', side: 'right', font: { size: 10, color: '#9ca3af' } },
        tickfont: { size: 9, color: '#9ca3af' },
        bgcolor: 'transparent',
        outlinewidth: 0,
      },
      xgap: 3,
      ygap: 3,
      hoverlabel: {
        bgcolor: '#1e2530',
        bordercolor: '#008ED3',
        font: { size: 12, color: '#f3f4f6', family: 'Inter, system-ui, sans-serif' },
        align: 'left',
      },
    }];

    return { plotTraces: traces };
  }, [data, lang]); // lang triggers full recalc including day/month labels

  const insight = useMemo(() => {
    if (!data?.data.length) return undefined;
    const fragCount = data.data.filter(d => d.is_fragmented).length;
    const maxDay    = data.data.reduce((a, b) => (b.kwh > a.kwh ? b : a), data.data[0]);
    const fragPart  = fragCount > 0
      ? `${fragCount} ${t('panels.a3.fragDays')}`
      : t('panels.a3.noFragDays');
    return `${t('panels.a3.bestDay')}: ${maxDay?.date} (${maxDay?.kwh} kWh) · ${t('panels.a3.avg')}: ${data.avg_kwh?.toFixed(2)} kWh/d · ${fragPart}.`;
  }, [data, lang]);

  return (
    <ChartPanel
      index={2}
      title={t('panels.a3.title')}
      subtitle={t('panels.a3.subtitle')}
      insight={insight}
      loading={loading}
      height={260}
      fullWidth
    >
      {plotTraces.length > 0 ? (
        <Plot
          data={plotTraces}
          layout={{
            autosize: true,
            margin: { t: 24, r: 90, l: 48, b: 16 },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: { color: '#6b7280', size: 10, family: 'Inter, system-ui, sans-serif' },
            xaxis: {
              side: 'top',
              tickfont: { size: 11, color: '#9ca3af' },
              showgrid: false,
              linecolor: 'transparent',
              tickangle: 0,
            },
            yaxis: {
              tickfont: { size: 11, color: '#9ca3af' },
              showgrid: false,
              linecolor: 'transparent',
              autorange: 'reversed',
              scaleanchor: undefined,
              fixedrange: true,
            },
          }}
          useResizeHandler
          style={{ width: '100%', height: '100%' }}
          config={{ responsive: true, displayModeBar: false }}
        />
      ) : !loading ? (
        <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
          <AlertCircle className="w-8 h-8 opacity-20" />
          <p className="text-xs">{t('panels.a3.noData')}</p>
        </div>
      ) : null}
    </ChartPanel>
  );
}

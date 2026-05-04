// Panel A-3 — Heatmap Calendárico (GitHub contributions style)
// Todos los 7 días visibles, tooltip legible y descriptivo
import React, { useState, useEffect, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import PlotlyChart from 'react-plotly.js';
import { ChartPanel } from '@/components/ui/ChartPanel';
import { analysisApi } from '@/api/analysis';
import type { CalendarHeatmap } from '@/api/analysis';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Plot = (PlotlyChart as any).default ?? PlotlyChart;

interface PanelA3Props { projectId: string; }

export function PanelA3CalendarHeatmap({ projectId }: PanelA3Props) {
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

  const { plotTraces, weekLabels } = useMemo(() => {
    if (!data?.data.length) return { plotTraces: [], weekLabels: [] };
    const rows = data.data;

    const startDate = new Date(rows[0].date + 'T00:00:00');
    const startDay  = startDate.getDay(); // 0=Dom

    const padded: (typeof rows[number] | null)[] = [
      ...Array(startDay).fill(null),
      ...rows,
    ];
    while (padded.length % 7 !== 0) padded.push(null);

    const weeks = Math.ceil(padded.length / 7);
    const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    // Build per-row scatter traces — one trace per day-of-week
    // This guarantees all 7 rows are always rendered
    const traces: any[] = [];
    const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

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

    // Build z / customdata matrices — shape [7][weeks]
    const z: (number | null)[][] = Array.from({ length: 7 }, () => Array(weeks).fill(null));
    const hover: string[][] = Array.from({ length: 7 }, () => Array(weeks).fill(''));

    padded.forEach((d, i) => {
      const w = Math.floor(i / 7);
      const r = i % 7;
      if (d) {
        z[r][w] = d.kwh;
        const fragLine = d.is_fragmented
          ? `<br>⚠️ <i>Día con múltiples interrupciones (${d.sessions} sesiones)</i>`
          : `<br>✅ ${d.sessions} sesión${d.sessions !== 1 ? 'es' : ''} continua`;
        hover[r][w] =
          `<b>${d.date}</b><br>` +
          `⚡ <b>${d.kwh.toFixed(3)} kWh</b> generados${fragLine}`;
      }
    });

    traces.push({
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
    });

    return { plotTraces: traces, weekLabels: wkLabels };
  }, [data]);

  const insight = useMemo(() => {
    if (!data?.data.length) return undefined;
    const fragCount = data.data.filter(d => d.is_fragmented).length;
    const maxDay    = data.data.reduce((a, b) => (b.kwh > a.kwh ? b : a), data.data[0]);
    return `Mejor día: ${maxDay?.date} con ${maxDay?.kwh} kWh · Promedio: ${data.avg_kwh?.toFixed(2)} kWh/día · ${fragCount > 0 ? `${fragCount} días con múltiples interrupciones detectados` : 'Sin días fragmentados'}.`;
  }, [data]);

  return (
    <ChartPanel
      index={2}
      title="Mapa de Calor Calendárico"
      subtitle="Generación solar diaria — color más verde = mayor producción · ⚠️ días con interrupciones múltiples"
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
            // Extra bottom margin so all 7 rows + colorbar fit without clipping
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
              // Reversed so Dom is top row (matches convention)
              autorange: 'reversed',
              // Critical: don't constrain — let all 7 rows render fully
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
          <p className="text-xs">Sin datos para el heatmap</p>
        </div>
      ) : null}
    </ChartPanel>
  );
}

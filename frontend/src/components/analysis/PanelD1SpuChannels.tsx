// Panel D-1 — Rendimiento por Canal SPU (horizontal bar chart)
// Alerta automática si algún canal genera < 50% del promedio
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Cpu, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import PlotlyChart from 'react-plotly.js';
import { motion, AnimatePresence } from 'motion/react';
import { ChartPanel } from '@/components/ui/ChartPanel';
import { analysisApi } from '@/api/analysis';
import type { SpuResponse } from '@/api/analysis';
import { cn } from '@/lib/utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Plot = (PlotlyChart as any).default ?? PlotlyChart;

interface PanelD1Props { projectId: string; }

export function PanelD1SpuChannels({ projectId }: PanelD1Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [data, setData]       = useState<SpuResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    analysisApi
      .getSpuChannels(projectId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  const hasNoSpcu = data?.warnings?.some(w => w.code === 'NO_SPCU_DATA');
  const lowChannelWarnings = data?.warnings?.filter(w => w.code === 'LOW_CHANNEL_OUTPUT') ?? [];
  const avgKwh = data?.avg_kwh ?? 0;

  const plotTraces = useMemo(() => {
    if (!data?.data.length) return [];
    const rows = data.data;
    const maxKwh = Math.max(...rows.map(r => r.total_kwh));

    return [{
      type: 'bar',
      orientation: 'h',
      x: rows.map(r => r.total_kwh),
      y: rows.map(r => `${t('panels.d1.channel')} ${r.channel}`),
      marker: {
        color: rows.map(r =>
          r.total_kwh < avgKwh * 0.5
            ? 'rgba(239,68,68,0.75)'
            : r.total_kwh < avgKwh * 0.8
            ? 'rgba(245,158,11,0.75)'
            : `rgba(0,${Math.round(142 + (r.total_kwh / maxKwh) * 30)},${Math.round(211 - (r.total_kwh / maxKwh) * 40)},0.80)`
        ),
        line: { color: 'rgba(255,255,255,0.08)', width: 1 },
      },
      text: rows.map(r => `${r.total_kwh.toFixed(2)} kWh`),
      textposition: 'outside',
      textfont: { size: 10, color: '#9ca3af' },
      hovertemplate:
        `<b>${t('panels.d1.channel')} %{y}</b><br>` +
        `⚡ <b>%{x:.3f} kWh</b> ${t('panels.d1.accumulated')}<br>` +
        `📊 ${t('panels.d1.avg')}: <b>${avgKwh.toFixed(2)} kWh</b><extra></extra>`,
    }];
  }, [data, avgKwh, lang]); // lang triggers recalc on language change

  const insight = useMemo(() => {
    if (!data?.data.length) return undefined;
    const n = data.data.length;
    const total = data.data.reduce((s, r) => s + r.total_kwh, 0);
    const lowPart = lowChannelWarnings.length
      ? ` · ⚠️ ${lowChannelWarnings.length} ${lowChannelWarnings.length > 1 ? t('panels.d1.lowChannelsPlural') : t('panels.d1.lowChannels')}`
      : ` · ${t('panels.d1.allNormal')}`;
    return `${n} SPU · ${t('panels.d1.accumulated')}: ${total.toFixed(2)} kWh · ${t('panels.d1.avg')}: ${avgKwh.toFixed(2)} kWh${lowPart}.`;
  }, [data, avgKwh, lowChannelWarnings, lang]);

  return (
    <div className="space-y-4">
      {/* Low channel warnings */}
      <AnimatePresence>
        {lowChannelWarnings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3"
          >
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-amber-300">
                  {lowChannelWarnings.length} {lowChannelWarnings.length > 1 ? t('panels.d1.lowChannelsPlural') : t('panels.d1.lowChannels')}
                </p>
                <div className="mt-2 space-y-1.5">
                  {lowChannelWarnings.map((w, i) => (
                    <p key={i} className="text-[11px] text-amber-400/80 leading-snug">
                      · {w.message}
                    </p>
                  ))}
                </div>
                <p className="text-[10px] text-amber-500/50 mt-2">{t('panels.d1.checkCable')}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ChartPanel
        index={1}
        title={t('panels.d1.title')}
        subtitle={t('panels.d1.subtitle')}
        insight={insight}
        loading={loading}
        height={Math.max(260, (data?.data.length ?? 4) * 44 + 60)}
      >
        {hasNoSpcu ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <div className="w-12 h-12 rounded-2xl bg-muted/30 flex items-center justify-center">
              <Cpu className="w-6 h-6 opacity-30" />
            </div>
            <div className="text-center">
              <p className="text-xs font-medium">{t('panels.d1.noData')}</p>
              <p className="text-[11px] opacity-60 mt-1">
                {t('panels.d1.noDataSub')}
              </p>
            </div>
          </div>
        ) : plotTraces.length > 0 ? (
          <Plot
            data={plotTraces}
            layout={{
              autosize: true,
              margin: { t: 8, r: 80, l: 72, b: 36 },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              font: { color: '#6b7280', size: 11, family: 'Inter, system-ui, sans-serif' },
              xaxis: {
                gridcolor: 'rgba(255,255,255,0.06)',
                linecolor: 'transparent',
                tickfont: { size: 10 },
                zeroline: false,
                title: { text: t('panels.d1.accumulated'), font: { size: 11 } },
              },
              yaxis: {
                tickfont: { size: 10 },
                linecolor: 'transparent',
                showgrid: false,
                autorange: 'reversed',
              },
              hoverlabel: { bgcolor: '#1e2530', bordercolor: '#008ED3', font: { size: 12, color: '#f3f4f6' } },
              showlegend: false,
              // Reference line — average
              shapes: avgKwh > 0 ? [{
                type: 'line', layer: 'below',
                x0: avgKwh, x1: avgKwh,
                y0: -0.5, y1: (data?.data.length ?? 1) - 0.5,
                yref: 'y',
                line: { color: 'rgba(0,142,211,0.5)', width: 1.5, dash: 'dot' },
              }] : [],
              annotations: avgKwh > 0 ? [{
                x: avgKwh, y: -0.5,
                xref: 'x', yref: 'y',
              text: `${t('panels.d1.avg')}: ${avgKwh.toFixed(1)} kWh`,
                showarrow: false,
                font: { size: 9, color: '#008ED3' },
                xanchor: 'left',
              }] : [],
            }}
            useResizeHandler
            style={{ width: '100%', height: '100%' }}
            config={{ responsive: true, displayModeBar: false }}
          />
        ) : !loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
            <Info className="w-8 h-8 opacity-20" />
            <p className="text-xs">{t('panels.d1.noData')}</p>
          </div>
        ) : null}
      </ChartPanel>
    </div>
  );
}

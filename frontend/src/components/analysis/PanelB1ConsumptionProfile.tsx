// Panel B-1 — Perfil Horario: Consumo Base vs Generación Solar vs Consumo Neto
// ComposedChart con campo editable de consumo base y zona de ahorro destacada
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import PlotlyChart from 'react-plotly.js';
import { ChartPanel } from '@/components/ui/ChartPanel';
import { analysisApi } from '@/api/analysis';
import type { ConsumptionProfile } from '@/api/analysis';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Plot = (PlotlyChart as any).default ?? PlotlyChart;

// PRESET_BASES built inside component to use t()

interface PanelB1Props { projectId: string; }

export function PanelB1ConsumptionProfile({ projectId }: PanelB1Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const PRESET_BASES = [
    { label: `1 kWh/h (${t('panels.b1.presetSmall')})`, value: 1 },
    { label: `3 kWh/h (${t('panels.b1.presetMedium')})`, value: 3 },
    { label: `5 kWh/h (${t('panels.b1.presetLarge')})`, value: 5 },
    { label: '12.34 kWh/h (CocaCola 93)', value: 12.34 },
  ];
  const [baseConsumption, setBaseConsumption] = useState<number>(5);
  const [inputValue, setInputValue]           = useState<string>('5');
  const [showConfig, setShowConfig]           = useState(false);
  const [data, setData]                       = useState<ConsumptionProfile | null>(null);
  const [loading, setLoading]                 = useState(false);

  const fetchData = useCallback(() => {
    if (!projectId || baseConsumption <= 0) return;
    setLoading(true);
    analysisApi
      .getConsumptionProfile(projectId, { base_consumption_kwh_per_hour: baseConsumption })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId, baseConsumption]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApply = () => {
    const v = parseFloat(inputValue);
    if (!isNaN(v) && v > 0) setBaseConsumption(v);
  };

  const plotData = useMemo(() => {
    if (!data?.data.length) return [];
    const rows = data.data;
    const xs   = rows.map(r => r.hour_label);

    return [
      // Zona de ahorro (base – neto = solar aprovechado)
      {
        type: 'scatter', mode: 'none',
        x: xs, y: rows.map(r => r.saving),
        fill: 'tozeroy', fillcolor: 'rgba(0,168,107,0.12)',
        name: t('panels.b1.saving'), showlegend: true,
        hoverinfo: 'skip',
      },
      // Consumo neto de red
      {
        type: 'scatter', mode: 'lines',
        x: xs, y: rows.map(r => r.net_consumption),
        name: t('panels.b1.netConsumption'),
        line: { color: '#EF4444', width: 2, dash: 'dot' },
        fill: 'tozeroy', fillcolor: 'rgba(239,68,68,0.06)',
        hovertemplate: `<b>%{x}</b><br>${t('panels.b1.netConsumption')}: <b>%{y:.4f} kWh</b><extra></extra>`,
      },
      // Generación solar promedio
      {
        type: 'scatter', mode: 'lines',
        x: xs, y: rows.map(r => r.solar_generation),
        name: t('panels.b1.solarGeneration'),
        line: { color: '#00A86B', width: 2.5, shape: 'spline' },
        fill: 'tozeroy', fillcolor: 'rgba(0,168,107,0.18)',
        hovertemplate: `<b>%{x}</b><br>${t('panels.b1.solarGeneration')}: <b>%{y:.4f} kWh</b><extra></extra>`,
      },
      // Línea consumo base
      {
        type: 'scatter', mode: 'lines',
        x: xs, y: rows.map(r => r.base_consumption),
        name: `${t('panels.b1.baseConsumptionLine')} (${baseConsumption} kWh/h)`,
        line: { color: '#F59E0B', width: 2, dash: 'dash' },
        hovertemplate: `<b>%{x}</b><br>${t('panels.b1.baseConsumptionLine')}: <b>%{y:.2f} kWh/h</b><extra></extra>`,
      },
    ];
  }, [data, baseConsumption, lang]); // lang triggers recalc on language change

  const insight = useMemo(() => {
    if (!data?.summary) return undefined;
    const s = data.summary;
    return `${baseConsumption} kWh/h → ${s.pct_solar_autonomy}% ${t('panels.b2.solarAutonomy')} · ${s.daily_solar_avg_kwh.toFixed(2)} kWh/d solar · ${s.daily_net_consumption_kwh.toFixed(2)} kWh/d ${t('panels.b1.netConsumption')}.`;
  }, [data, baseConsumption, lang]);

  return (
    <ChartPanel
      index={0}
      title={t('panels.b1.title')}
      subtitle={t('panels.b1.subtitle')}
      insight={insight}
      loading={loading}
      height={320}
      controls={
        <button
          onClick={() => setShowConfig(s => !s)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-muted-foreground hover:text-foreground border border-border hover:border-[#008ED3]/40 bg-muted/30 hover:bg-muted/60 transition-all"
        >
          <Settings className="w-3.5 h-3.5" />
          {t('panels.b1.baseConsumptionShort')}: <span className="text-foreground">{baseConsumption} kWh/h</span>
          {showConfig ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      }
    >
      {/* Config drawer */}
      {showConfig && (
        <div className="mb-3 p-3 rounded-xl border border-border bg-muted/20 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-muted-foreground">{t('panels.b1.baseConsumption')}</label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleApply()}
                className="w-28 h-8 px-2.5 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#008ED3]/50"
              />
              <button
                onClick={handleApply}
                className="h-8 px-3 rounded-lg bg-[#008ED3] text-white text-xs font-semibold hover:bg-[#006FA8] transition-colors"
              >
                {t('common.apply')}
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-muted-foreground">{t('panels.b1.quickPresets')}</label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_BASES.filter(p => p.value !== null).map(p => (
                <button
                  key={p.value}
                  onClick={() => { setBaseConsumption(p.value!); setInputValue(String(p.value!)); }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-border hover:border-[#008ED3]/40 bg-muted/30 hover:bg-[#008ED3]/10 hover:text-[#008ED3] transition-all"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <p className="w-full text-[10px] text-muted-foreground/70">{t('panels.b1.baseInfo')}</p>
        </div>
      )}

      {plotData.length > 0 ? (
        <Plot
          data={plotData}
          layout={{
            autosize: true,
            margin: { t: 8, r: 12, l: 52, b: 44 },
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
              title: { text: 'kWh', font: { size: 11 } },
            },
            hoverlabel: { bgcolor: '#1e2530', bordercolor: '#008ED3', font: { size: 12, color: '#f3f4f6' } },
            legend: {
              bgcolor: 'transparent', borderwidth: 0,
              font: { size: 11 }, orientation: 'h', y: -0.2,
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
          <p className="text-xs">{t('panels.b1.noData')}</p>
        </div>
      ) : null}
    </ChartPanel>
  );
}

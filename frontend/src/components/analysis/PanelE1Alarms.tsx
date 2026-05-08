// Panel E-1 — Alarms & Events (Timeline and KPIs)
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, AlertOctagon, AlertTriangle, Info, Search, Filter, Calendar as CalIcon } from 'lucide-react';
import { ChartPanel } from '@/components/ui/ChartPanel';
import { analysisApi } from '@/api/analysis';
import type { AlarmsResponse, AlarmRecord } from '@/api/analysis';
import { cn } from '@/lib/utils';

// ─── Level color/icon config (labels resolved via t() at render) ──
const LEVEL_STYLE: Record<number, { color: string; bg: string; icon: React.ElementType }> = {
  1: { color: 'text-red-500',    bg: 'bg-red-500/10',    icon: AlertOctagon },
  2: { color: 'text-orange-500', bg: 'bg-orange-500/10', icon: AlertTriangle },
  3: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: AlertTriangle },
  4: { color: 'text-blue-500',   bg: 'bg-blue-500/10',   icon: Info },
};

function AlarmRow({ alarm }: { alarm: AlarmRecord }) {
  const cfg = LEVEL_STYLE[alarm.level] ?? LEVEL_STYLE[4];
  const Icon = cfg.icon;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0 hover:bg-muted/20 px-2 rounded-lg transition-colors">
      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5', cfg.bg)}>
        <Icon className={cn('w-4 h-4', cfg.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-foreground truncate">{alarm.signal_name}</p>
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-mono font-medium whitespace-nowrap', cfg.bg, cfg.color)}>
            {alarm.level_name}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5 font-mono truncate">{alarm.device_name}</p>
        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground/70 font-mono">
          <span className="flex items-center gap-1">
            <CalIcon className="w-3 h-3" />
            {alarm.start_time.substring(0, 16)}
          </span>
          {alarm.duration_min > 0 && (
            <span>• {alarm.duration_min} min</span>
          )}
        </div>
      </div>
    </div>
  );
}

interface PanelE1Props { projectId: string; }

export function PanelE1Alarms({ projectId }: PanelE1Props) {
  const { t } = useTranslation();

  // Level labels translated (reactive to language change because component re-renders)
  const LEVEL_LABELS: Record<number, string> = {
    1: t('panels.e1.critical'),
    2: t('panels.e1.major'),
    3: 'Minor',
    4: 'Warning',
  };

  const [data, setData] = useState<AlarmsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [levels, setLevels] = useState<number[]>([]);
  const [deviceFilter, setDeviceFilter] = useState('');

  const fetchData = () => {
    if (!projectId) return;
    setLoading(true);
    analysisApi
      .getAlarms(projectId, {
        levels: levels.length ? levels.join(',') : undefined,
        device: deviceFilter || undefined
      })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(fetchData, 400);
    return () => clearTimeout(timer);
  }, [projectId, levels, deviceFilter]);

  const toggleLevel = (l: number) => {
    setLevels(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]);
  };

  const kpis = data?.kpis;
  const alarms = data?.data ?? [];

  const insight = kpis
    ? `${t('panels.e1.showing')} ${alarms.length} ${t('panels.e1.alarmsOf')} ${kpis.total} ${t('panels.e1.total')}. ${t('panels.e1.critical')}: ${kpis.critical} · ${t('panels.e1.major')}: ${kpis.major}. ${t('panels.e1.affectedDevices')}: ${kpis.unique_devices}.`
    : undefined;

  return (
    <div className="space-y-4">
      {/* KPI Row */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { l: 'Total',                    v: kpis.total,   c: 'text-foreground'   },
            { l: t('panels.e1.critical'),    v: kpis.critical,c: 'text-red-500'      },
            { l: t('panels.e1.major'),       v: kpis.major,   c: 'text-orange-500'   },
            { l: 'Minor',                    v: kpis.minor,   c: 'text-yellow-500'   },
            { l: 'Warning',                  v: kpis.warning, c: 'text-blue-500'     },
          ].map(k => (
            <div key={k.l} className="bg-card/50 border border-border rounded-xl p-3 flex flex-col items-center justify-center">
              <span className="text-[10px] uppercase text-muted-foreground font-semibold">{k.l}</span>
              <span className={cn('text-xl font-display font-bold mt-1', k.c)}>{k.v ?? 0}</span>
            </div>
          ))}
        </div>
      )}

      <ChartPanel
        index={0}
        title={t('panels.e1.title')}
        subtitle={t('panels.e1.subtitle')}
        insight={insight}
        loading={loading}
        height={400}
        controls={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('panels.e1.filterDevice')}
                value={deviceFilter}
                onChange={e => setDeviceFilter(e.target.value)}
                className="h-7 pl-7 pr-3 text-[11px] rounded-lg border border-border bg-muted/20 text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-40"
              />
            </div>
            <div className="flex items-center gap-1 border border-border rounded-lg p-0.5 bg-muted/10">
              <Filter className="w-3 h-3 text-muted-foreground ml-1.5 mr-1" />
              {[1, 2, 3, 4].map(l => (
                <button
                  key={l}
                  onClick={() => toggleLevel(l)}
                  className={cn(
                    'px-2 py-1 rounded text-[10px] font-medium transition-colors',
                    levels.includes(l)
                      ? LEVEL_STYLE[l].bg + ' ' + LEVEL_STYLE[l].color
                      : 'text-muted-foreground hover:bg-muted/50'
                  )}
                >
                  {LEVEL_LABELS[l]}
                </button>
              ))}
            </div>
          </div>
        }
      >
        <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
          {alarms.length > 0 ? (
            <div className="flex flex-col">
              {alarms.map((a, i) => (
                <AlarmRow key={`${a.start_time}-${a.device_name}-${i}`} alarm={a} />
              ))}
            </div>
          ) : !loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
              <Bell className="w-8 h-8 opacity-20" />
              <p className="text-xs">{t('panels.e1.noData')}</p>
            </div>
          ) : null}
        </div>
      </ChartPanel>
    </div>
  );
}

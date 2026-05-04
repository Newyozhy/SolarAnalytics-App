// OutlierBanner — shows detected anomalous days as dismissible notification
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, ChevronDown, ChevronUp, X, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OutlierInfo } from '@/api/analysis';

interface OutlierBannerProps {
  outliers: OutlierInfo[];
  showOutliers: boolean;
  onToggleOutliers: (show: boolean) => void;
}

export function OutlierBanner({ outliers, showOutliers, onToggleOutliers }: OutlierBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!outliers.length || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="rounded-xl border border-amber-500/30 bg-amber-500/5 overflow-hidden"
      >
        {/* Header row */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-amber-300">
              {outliers.length} día{outliers.length > 1 ? 's' : ''} con generación atípica detectado{outliers.length > 1 ? 's' : ''}
            </p>
            <p className="text-[11px] text-amber-400/70 mt-0.5 truncate">
              {outliers[0].criterion}
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Toggle outliers in chart */}
            <button
              onClick={() => onToggleOutliers(!showOutliers)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all',
                showOutliers
                  ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              )}
              title={showOutliers ? 'Ocultar días atípicos de las gráficas' : 'Mostrar días atípicos en las gráficas'}
            >
              {showOutliers ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              {showOutliers ? 'Visible' : 'Oculto'}
            </button>

            {/* Expand details */}
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] text-amber-400/80 hover:bg-amber-500/10 transition-all"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              Ver {expanded ? 'menos' : 'detalles'}
            </button>

            {/* Dismiss */}
            <button
              onClick={() => setDismissed(true)}
              className="w-6 h-6 flex items-center justify-center rounded-md text-amber-500/40 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Expanded detail table */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="border-t border-amber-500/20 px-4 pb-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {outliers.map(o => (
                    <div
                      key={o.date}
                      className="flex items-start gap-2 rounded-lg bg-amber-500/8 border border-amber-500/15 px-3 py-2"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-mono font-semibold text-amber-300">{o.date}</p>
                        <p className="text-[11px] text-amber-400/80 mt-0.5">
                          {o.kwh.toFixed(2)} kWh generados
                        </p>
                        <p className="text-[10px] text-amber-500/60 mt-0.5 leading-tight">{o.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-amber-500/50 mt-3">
                  ℹ️ Estos días pueden corresponder al período de puesta en marcha o fallas temporales del sistema. 
                  Usa el toggle "Visible/Oculto" para excluirlos del análisis.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

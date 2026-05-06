// Shared ChartPanel wrapper — uniform card for all analysis panels
import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ChartPanelProps {
  title: string;
  subtitle?: string;
  insight?: string;
  children: React.ReactNode;
  controls?: React.ReactNode;
  loading?: boolean;
  height?: number;
  fullWidth?: boolean;
  index?: number;
}

const panelVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: (i ?? 0) * 0.06, duration: 0.3 },
  }),
};

export function ChartPanel({
  title, subtitle, insight, children, controls,
  loading, height = 300, fullWidth, index = 0,
}: ChartPanelProps) {
  return (
    <motion.div
      custom={index}
      variants={panelVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'rounded-2xl border border-border bg-card flex flex-col overflow-hidden',
        fullWidth && 'col-span-full'
      )}
    >
      {/* Panel header */}
      <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-border/60">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground leading-tight">{title}</h3>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{subtitle}</p>
          )}
        </div>
        {controls && (
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
            {controls}
          </div>
        )}
      </div>

      {/* Chart area */}
      <div className="relative flex-1 px-4 py-3" style={{ minHeight: height }}>
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 text-[#008ED3] animate-spin" />
              <p className="text-[11px] text-muted-foreground">Calculando...</p>
            </div>
          </div>
        ) : children}
      </div>

      {/* Auto-insight footer */}
      {insight && (
        <div className="px-5 py-2.5 border-t border-border/40 bg-muted/20">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="text-[#008ED3] font-semibold mr-1">→</span>
            {insight}
          </p>
        </div>
      )}
    </motion.div>
  );
}

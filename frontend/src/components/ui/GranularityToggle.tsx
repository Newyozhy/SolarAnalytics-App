// Reusable GranularityToggle — Días / Semanas / Meses
import React from 'react';
import { cn } from '@/lib/utils';
import type { Granularity } from '@/api/analysis';

interface GranularityToggleProps {
  value: Granularity;
  onChange: (g: Granularity) => void;
  className?: string;
}

const OPTIONS: { value: Granularity; label: string }[] = [
  { value: 'day',   label: 'Días'    },
  { value: 'week',  label: 'Semanas' },
  { value: 'month', label: 'Meses'   },
];

export function GranularityToggle({ value, onChange, className }: GranularityToggleProps) {
  return (
    <div className={cn('inline-flex rounded-lg border border-border bg-muted/40 p-0.5 gap-0.5', className)}>
      {OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-3 py-1 rounded-md text-[11px] font-semibold transition-all duration-150',
            value === opt.value
              ? 'bg-[#008ED3] text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

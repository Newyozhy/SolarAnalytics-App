// Reusable MetricToggle — switches what a chart displays
import React from 'react';
import { cn } from '@/lib/utils';

interface Option<T extends string> {
  value: T;
  label: string;
  icon?: React.ElementType;
}

interface MetricToggleProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}

export function MetricToggle<T extends string>({
  options, value, onChange, className,
}: MetricToggleProps<T>) {
  return (
    <div className={cn('inline-flex rounded-lg border border-border bg-muted/40 p-0.5 gap-0.5', className)}>
      {options.map(opt => {
        const Icon = opt.icon;
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-semibold transition-all duration-150',
              active
                ? 'bg-card text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            )}
          >
            {Icon && <Icon className="w-3 h-3" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

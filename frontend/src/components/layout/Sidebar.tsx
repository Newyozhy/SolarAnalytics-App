import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  FolderOpen, BarChart2, Settings, ChevronLeft, ChevronRight,
  Activity, Zap, Clock
} from 'lucide-react';
import zteLogo from '@/assets/zte-logo.svg';
import { cn } from '@/lib/utils';

// ZTE SPU Logo using real SVG asset
function ZteLogo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-3 overflow-hidden">
      {/* ZTE Logo container */}
      <div
        className="relative flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0078b4 0%, #004f82 100%)' }}
      >
        <img
          src={zteLogo}
          alt="ZTE"
          className="w-6 h-auto"
          style={{ filter: 'brightness(0) invert(1)' }}
        />
        {/* Live indicator */}
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#00A86B] rounded-full border-2 border-sidebar" />
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col min-w-0"
          >
            <span className="font-display font-bold text-base leading-tight text-sidebar-foreground">
              SPU
            </span>
            <span className="text-[10px] text-muted-foreground leading-tight tracking-wider uppercase">
              Solar Analytics
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const navItems = [
  { key: 'projects', icon: FolderOpen, label: 'nav.projects', active: true },
  { key: 'reports', icon: BarChart2, label: 'nav.reports', active: false },
  { key: 'settings', icon: Settings, label: 'nav.settings', active: false },
];

const stats = [
  { icon: Zap, value: '–', label: 'kWh hoy' },
  { icon: Activity, value: '–', label: 'proyectos' },
  { icon: Clock, value: '–', label: 'último sync' },
];

export function Sidebar() {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const [activeKey, setActiveKey] = useState('projects');

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        'relative h-screen flex flex-col flex-shrink-0 overflow-hidden',
        'bg-sidebar border-r border-sidebar-border'
      )}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center border-b border-sidebar-border',
        collapsed ? 'justify-center p-3' : 'justify-between px-4 py-4'
      )}>
        <ZteLogo collapsed={collapsed} />
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className={cn(
          'absolute -right-3 top-[4.5rem] z-10',
          'w-6 h-6 rounded-full border border-sidebar-border bg-sidebar',
          'flex items-center justify-center',
          'hover:bg-zte-blue hover:border-zte-blue hover:text-white',
          'text-muted-foreground transition-all duration-200 shadow-sm'
        )}
      >
        {collapsed
          ? <ChevronRight className="w-3 h-3" />
          : <ChevronLeft className="w-3 h-3" />
        }
      </button>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map(({ key, icon: Icon, label }) => {
          const isActive = activeKey === key;
          return (
            <motion.button
              key={key}
              onClick={() => setActiveKey(key)}
              whileHover={{ x: collapsed ? 0 : 2 }}
              whileTap={{ scale: 0.97 }}
              className={cn(
                'relative w-full flex items-center gap-3 rounded-lg transition-colors duration-150',
                collapsed ? 'justify-center p-3' : 'px-3 py-2.5',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-sidebar-foreground'
              )}
              title={collapsed ? t(label) : undefined}
            >
              {/* Active indicator */}
              <AnimatePresence>
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active"
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    exit={{ scaleY: 0 }}
                    className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r-full"
                    style={{ background: 'var(--zte-blue)' }}
                  />
                )}
              </AnimatePresence>

              <Icon className={cn(
                'flex-shrink-0 transition-colors',
                collapsed ? 'w-5 h-5' : 'w-4 h-4',
                isActive ? 'text-zte-blue' : ''
              )} />

              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="font-medium text-sm whitespace-nowrap"
                  >
                    {t(label)}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </nav>

      {/* Stats mini panel (only expanded) */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3 pb-2"
          >
            <div className="rounded-lg border border-sidebar-border bg-muted/30 p-3 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Sistema
              </p>
              {stats.map(({ icon: Icon, value, label }) => (
                <div key={label} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Icon className="w-3 h-3 text-zte-blue flex-shrink-0" />
                  <span className="font-mono text-sidebar-foreground font-medium">{value}</span>
                  <span className="truncate">{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom system info */}
      <div className={cn(
        'border-t border-sidebar-border flex items-center gap-2',
        collapsed ? 'justify-center p-3' : 'px-4 py-3'
      )}>
        <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #008ED3, #005F9E)' }}>
          Z
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col min-w-0"
            >
              <span className="text-xs font-medium text-sidebar-foreground truncate">ZTE SPU Admin</span>
              <span className="text-[10px] text-muted-foreground">v1.0.0</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}

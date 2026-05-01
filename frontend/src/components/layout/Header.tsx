import React from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import { Sun, Moon, Search, ChevronRight, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  id: string;
  name: string;
}

interface HeaderProps {
  breadcrumbs: BreadcrumbItem[];
  onBreadcrumbClick: (index: number) => void;
  searchQuery: string;
  onSearchChange: (v: string) => void;
}

const LANGUAGES = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <motion.button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'relative w-14 h-7 rounded-full flex items-center px-1 transition-colors duration-300',
        isDark ? 'bg-zte-blue/20 border border-zte-blue/30' : 'bg-amber-100 border border-amber-200'
      )}
      aria-label="Toggle theme"
    >
      {/* Track icons */}
      <Moon className={cn('absolute left-1.5 w-3.5 h-3.5 transition-opacity', isDark ? 'opacity-100 text-zte-blue' : 'opacity-30 text-slate-400')} />
      <Sun className={cn('absolute right-1.5 w-3.5 h-3.5 transition-opacity', !isDark ? 'opacity-100 text-amber-500' : 'opacity-30 text-slate-600')} />
      {/* Pill */}
      <motion.div
        animate={{ x: isDark ? 0 : 28 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={cn(
          'w-5 h-5 rounded-full shadow-sm',
          isDark ? 'bg-zte-blue' : 'bg-amber-400'
        )}
      />
    </motion.button>
  );
}

function LanguageSelector() {
  const { i18n } = useTranslation();
  const current = LANGUAGES.find(l => l.code === i18n.language) ?? LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 h-8 px-2.5 text-muted-foreground hover:text-foreground">
          <Globe className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">{current.flag} {current.code.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {LANGUAGES.map(lang => (
          <DropdownMenuItem
            key={lang.code}
            className={cn('gap-2 text-sm cursor-pointer', lang.code === i18n.language && 'text-zte-blue font-medium')}
            onClick={() => i18n.changeLanguage(lang.code)}
          >
            <span>{lang.flag}</span>
            <span>{lang.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Header({ breadcrumbs, onBreadcrumbClick, searchQuery, onSearchChange }: HeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="h-14 flex-shrink-0 flex items-center justify-between px-5 border-b border-border bg-background/80 backdrop-blur-sm">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm overflow-x-auto scrollbar-none min-w-0">
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;
          return (
            <React.Fragment key={item.id}>
              {index > 0 && <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground/40" />}
              <motion.button
                whileHover={!isLast ? { color: 'var(--zte-blue)' } : {}}
                onClick={() => !isLast && onBreadcrumbClick(index)}
                className={cn(
                  'whitespace-nowrap transition-colors rounded px-1 py-0.5 flex-shrink-0',
                  isLast
                    ? 'font-semibold text-foreground cursor-default'
                    : 'text-muted-foreground hover:text-zte-blue cursor-pointer'
                )}
              >
                {item.name}
              </motion.button>
            </React.Fragment>
          );
        })}
      </nav>

      {/* Right controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={t('explorer.search')}
            className={cn(
              'h-8 w-52 rounded-md border border-input bg-muted/40 pl-8 pr-3 text-sm',
              'placeholder:text-muted-foreground/60',
              'focus:outline-none focus:ring-1 focus:ring-zte-blue focus:border-zte-blue',
              'transition-all duration-200'
            )}
          />
        </div>

        <div className="w-px h-5 bg-border mx-1" />

        <LanguageSelector />
        <ThemeToggle />
      </div>
    </header>
  );
}

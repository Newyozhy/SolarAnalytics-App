import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Folder, FolderOpen, CheckCircle2, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type { Folder as FolderType } from '@/api/projects';
import { cn } from '@/lib/utils';

interface TreeNode extends FolderType {
  children?: TreeNode[];
  isLoading?: boolean;
  isExpanded?: boolean;
}

interface FolderTreeProps {
  roots: FolderType[];
  selectedId: string | null;
  onSelect: (folder: FolderType) => void;
  onExpand: (folder: FolderType) => Promise<FolderType[]>;
  processedIds?: Set<string>;
  onOpenAnalysis?: (folder: FolderType) => void;
  // Panel collapse/expand controls
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

function TreeItem({
  node,
  depth,
  selectedId,
  onSelect,
  onExpand,
  processedIds,
  onOpenAnalysis,
}: {
  node: TreeNode;
  depth: number;
  selectedId: string | null;
  onSelect: (f: FolderType) => void;
  onExpand: (f: FolderType) => Promise<FolderType[]>;
  processedIds?: Set<string>;
  onOpenAnalysis?: (f: FolderType) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [children, setChildren] = useState<TreeNode[]>([]);
  const { t } = useTranslation();
  const isSelected = selectedId === node.id;
  const isProcessed = processedIds?.has(node.id) ?? false;

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isExpanded && children.length === 0) {
      setIsLoading(true);
      try {
        const loaded = await onExpand(node);
        setChildren(loaded as TreeNode[]);
      } finally {
        setIsLoading(false);
      }
    }
    setIsExpanded(v => !v);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isProcessed && onOpenAnalysis) {
      onOpenAnalysis(node);
    }
  };

  return (
    <div>
      <motion.div
        whileHover={{ backgroundColor: isSelected ? undefined : 'rgba(0,142,211,0.06)' }}
        onClick={() => onSelect(node)}
        onDoubleClick={handleDoubleClick}
        className={cn(
          'flex items-center gap-1.5 rounded-md cursor-pointer select-none group',
          'transition-colors duration-100 py-1',
          isSelected
            ? isProcessed
              ? 'bg-emerald-500/15 text-emerald-500'
              : 'bg-zte-blue/15 text-zte-blue'
            : isProcessed
              ? 'text-emerald-500/80 hover:text-emerald-500'
              : 'text-muted-foreground hover:text-foreground'
        )}
        style={{ paddingLeft: `${8 + depth * 16}px`, paddingRight: '8px' }}
        title={isProcessed ? `${node.name} — ${t('explorer.dblClickAnalysis')}` : node.name}
      >
        {/* Expand button */}
        <button
          onClick={handleToggle}
          className={cn(
            'w-4 h-4 flex items-center justify-center rounded flex-shrink-0',
            'hover:bg-zte-blue/10 transition-colors'
          )}
        >
          {isLoading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              className="w-3 h-3 border border-zte-blue border-t-transparent rounded-full"
            />
          ) : (
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.15 }}
            >
              <ChevronRight className="w-3 h-3" />
            </motion.div>
          )}
        </button>

        {/* Folder icon */}
        {isProcessed ? (
          <CheckCircle2 className={cn(
            'w-4 h-4 flex-shrink-0',
            isSelected ? 'text-emerald-500' : 'text-emerald-500/70'
          )} />
        ) : isExpanded ? (
          <FolderOpen className={cn('w-4 h-4 flex-shrink-0', isSelected ? 'text-zte-blue' : 'text-amber-400')} />
        ) : (
          <Folder className={cn('w-4 h-4 flex-shrink-0', isSelected ? 'text-zte-blue fill-zte-blue/20' : 'text-amber-400 fill-amber-400/20')} />
        )}

        <span className="text-xs font-medium truncate">{node.name}</span>

        {/* Processed badge (compact) */}
        {isProcessed && !isSelected && (
          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
        )}
      </motion.div>

      <AnimatePresence>
        {isExpanded && children.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children.map(child => (
              <TreeItem
                key={child.id}
                node={child}
                depth={depth + 1}
                selectedId={selectedId}
                onSelect={onSelect}
                onExpand={onExpand}
                processedIds={processedIds}
                onOpenAnalysis={onOpenAnalysis}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FolderTree({
  roots, selectedId, onSelect, onExpand,
  processedIds, onOpenAnalysis, isCollapsed, onToggleCollapse,
}: FolderTreeProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col h-full">
      {/* Panel header with toggle */}
      <div className={cn(
        'flex items-center border-b border-border flex-shrink-0 transition-all duration-200',
        isCollapsed ? 'justify-center p-2' : 'justify-between px-3 py-2'
      )}>
        <AnimatePresence>
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {t('explorer.navigator')}
            </motion.span>
          )}
        </AnimatePresence>

        <motion.button
          onClick={onToggleCollapse}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className={cn(
            'flex items-center justify-center rounded-md p-1.5',
            'text-muted-foreground hover:text-zte-blue hover:bg-zte-blue/10',
            'transition-colors duration-150'
          )}
          title={isCollapsed ? t('explorer.expandNav') : t('explorer.collapseNav')}
        >
          {isCollapsed
            ? <PanelLeftOpen className="w-3.5 h-3.5" />
            : <PanelLeftClose className="w-3.5 h-3.5" />
          }
        </motion.button>
      </div>

      {/* Tree content */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-y-auto overflow-x-hidden py-2 space-y-0.5"
          >
            {roots.map(root => (
              <TreeItem
                key={root.id}
                node={root}
                depth={0}
                selectedId={selectedId}
                onSelect={onSelect}
                onExpand={onExpand}
                processedIds={processedIds}
                onOpenAnalysis={onOpenAnalysis}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed: show icon strip */}
      <AnimatePresence>
        {isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center pt-3 gap-1.5 overflow-y-auto overflow-x-hidden"
          >
            {roots.map(root => {
              const isProc = processedIds?.has(root.id) ?? false;
              return (
                <motion.button
                  key={root.id}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onSelect(root)}
                  onDoubleClick={() => isProc && onOpenAnalysis?.(root)}
                  title={root.name}
                  className="relative w-7 h-7 flex items-center justify-center rounded-md hover:bg-zte-blue/10 transition-colors"
                >
                  {isProc
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    : <Folder className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                  }
                  {selectedId === root.id && (
                    <span className="absolute inset-0 rounded-md border border-zte-blue bg-zte-blue/10" />
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

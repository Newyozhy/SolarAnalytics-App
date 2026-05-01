import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Folder, FolderOpen } from 'lucide-react';
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
}

function TreeItem({
  node,
  depth,
  selectedId,
  onSelect,
  onExpand,
}: {
  node: TreeNode;
  depth: number;
  selectedId: string | null;
  onSelect: (f: FolderType) => void;
  onExpand: (f: FolderType) => Promise<FolderType[]>;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [children, setChildren] = useState<TreeNode[]>([]);
  const isSelected = selectedId === node.id;

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

  return (
    <div>
      <motion.div
        whileHover={{ backgroundColor: isSelected ? undefined : 'rgba(0,142,211,0.06)' }}
        onClick={() => onSelect(node)}
        className={cn(
          'flex items-center gap-1.5 rounded-md cursor-pointer select-none group',
          'transition-colors duration-100 py-1',
          isSelected ? 'bg-zte-blue/15 text-zte-blue' : 'text-muted-foreground hover:text-foreground'
        )}
        style={{ paddingLeft: `${8 + depth * 16}px`, paddingRight: '8px' }}
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
        {isExpanded
          ? <FolderOpen className={cn('w-4 h-4 flex-shrink-0', isSelected ? 'text-zte-blue' : 'text-amber-400')} />
          : <Folder className={cn('w-4 h-4 flex-shrink-0', isSelected ? 'text-zte-blue fill-zte-blue/20' : 'text-amber-400 fill-amber-400/20')} />
        }

        <span className="text-xs font-medium truncate">{node.name}</span>
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
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FolderTree({ roots, selectedId, onSelect, onExpand }: FolderTreeProps) {
  return (
    <div className="py-2 space-y-0.5">
      {roots.map(root => (
        <TreeItem
          key={root.id}
          node={root}
          depth={0}
          selectedId={selectedId}
          onSelect={onSelect}
          onExpand={onExpand}
        />
      ))}
    </div>
  );
}

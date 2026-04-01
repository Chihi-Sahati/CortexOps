'use client';

import React, { type DragEvent } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getNodeIcon, getNodeColor } from '@/components/shared/NodeIcons';
import { nodeRegistry, nodeCategories } from '@/lib/node-registry';
import type { NodeDefinition } from '@/types';

interface NodeLibraryProps {
  onDragStart: (event: DragEvent<HTMLDivElement>, node: NodeDefinition) => void;
}

export function NodeLibrary({ onDragStart }: NodeLibraryProps) {
  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        {nodeCategories.map((category) => {
          const categoryNodes = nodeRegistry.filter(
            (node) => node.category === category.id
          );

          if (categoryNodes.length === 0) return null;

          return (
            <div key={category.id}>
              <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {category.name}
                </span>
              </div>
              <div className="space-y-1">
                {categoryNodes.map((node) => {
                  const Icon = getNodeIcon(node.type);
                  const color = getNodeColor(node.type);

                  return (
                    <div
                      key={node.type}
                      draggable
                      onDragStart={(e) => onDragStart(e, node)}
                      className="flex items-center gap-3 rounded-md px-2 py-2 cursor-grab active:cursor-grabbing hover:bg-slate-800 transition-colors group"
                    >
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        <span style={{ color }}>
                          <Icon className="h-4 w-4" />
                        </span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm text-slate-200 group-hover:text-slate-100 truncate">
                          {node.name}
                        </span>
                        <span className="text-xs text-slate-500 truncate">
                          {node.description}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

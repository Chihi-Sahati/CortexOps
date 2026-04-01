'use client';

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { getNodeIcon, getNodeColor } from '@/components/shared/NodeIcons';
import { cn } from '@/lib/utils';
import type { NodeType } from '@/types';

interface CustomNodeData {
  label: string;
  type: NodeType;
  config: Record<string, unknown>;
  isEnabled: boolean;
}

interface CustomNodeProps {
  data: CustomNodeData;
  selected: boolean;
}

const CustomNode = memo(function CustomNode({ data, selected }: CustomNodeProps) {
  const color = getNodeColor(data.type);
  const isAI = data.type.includes('ai');

  return (
    <div
      className={cn(
        'relative min-w-[200px] rounded-xl border bg-slate-900/90 backdrop-blur-md px-4 py-3.5 shadow-2xl transition-all duration-200',
        selected 
          ? 'border-indigo-500 ring-4 ring-indigo-500/10 scale-[1.02]' 
          : 'border-slate-800 hover:border-slate-700',
        !data.isEnabled && 'opacity-40 grayscale-[0.5]'
      )}
    >
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!bg-slate-500 !w-3 !h-3 !border-[3px] !border-slate-900 !-top-1.5 hover:!scale-125 transition-transform" 
      />

      <div className="flex items-center gap-3.5">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg shadow-inner"
          style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
        >
          <span style={{ color }}>
            {React.createElement(getNodeIcon(data.type), { className: "h-5.5 w-5.5" })}
          </span>
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[13px] font-semibold text-slate-100 truncate leading-snug">
            {data.label}
          </span>
          <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider truncate">
            {data.type.split('.').pop()}
          </span>
        </div>
        {isAI && (
          <div className="flex items-center justify-center h-5 w-5 bg-indigo-500/10 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
            </span>
          </div>
        )}
      </div>

      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!bg-slate-500 !w-3 !h-3 !border-[3px] !border-slate-900 !-bottom-1.5 hover:!scale-125 transition-transform" 
      />
    </div>
  );
});

export { CustomNode };
export type { CustomNodeData, CustomNodeProps };

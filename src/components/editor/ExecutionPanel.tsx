'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Play, Save, Undo2, Redo2, Workflow, ArrowRight } from 'lucide-react';
import type { Workflow as WorkflowType } from '@/types';
import type { Node, Edge } from '@xyflow/react';

interface ExecutionPanelProps {
  currentWorkflow: WorkflowType | null;
  nodes: Node[];
  edges: Edge[];
  onExecute: () => void;
  onSave: () => void;
}

export function ExecutionPanel({
  currentWorkflow,
  nodes,
  edges,
  onExecute,
  onSave,
}: ExecutionPanelProps) {
  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <Button
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
          onClick={onExecute}
          disabled={!currentWorkflow || nodes.length === 0}
        >
          <Play className="h-4 w-4 mr-2" />
          Execute Workflow
        </Button>
        <Button
          variant="outline"
          className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
          onClick={onSave}
          disabled={!currentWorkflow}
        >
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>

      <Separator className="bg-slate-800" />

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 border-slate-700 text-slate-400 hover:bg-slate-800 cursor-not-allowed opacity-50"
          disabled
        >
          <Undo2 className="h-4 w-4 mr-1" />
          Undo
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 border-slate-700 text-slate-400 hover:bg-slate-800 cursor-not-allowed opacity-50"
          disabled
        >
          <Redo2 className="h-4 w-4 mr-1" />
          Redo
        </Button>
      </div>

      <Separator className="bg-slate-800" />

      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Workflow Stats
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md bg-slate-900 border border-slate-800 p-3 text-center">
            <div className="text-lg font-semibold text-slate-100">{nodes.length}</div>
            <div className="text-[10px] text-slate-500 uppercase">Nodes</div>
          </div>
          <div className="rounded-md bg-slate-900 border border-slate-800 p-3 text-center">
            <div className="text-lg font-semibold text-slate-100">{edges.length}</div>
            <div className="text-[10px] text-slate-500 uppercase">Edges</div>
          </div>
        </div>
      </div>
    </div>
  );
}

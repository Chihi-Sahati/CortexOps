'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ArrowLeft, Map, Grid3x3, Save, Play, Maximize, Plus, Undo2, Redo2 } from 'lucide-react';
import type { Workflow } from '@/types';

interface EditorToolbarProps {
  currentWorkflow: Workflow | null;
  showMinimap: boolean;
  setShowMinimap: React.Dispatch<React.SetStateAction<boolean>>;
  showGrid: boolean;
  setShowGrid: React.Dispatch<React.SetStateAction<boolean>>;
  onSave: () => void;
  onRun: () => void;
  onFitView: () => void;
  onAddNode: () => void;
  onBack: () => void;
  isSaving?: boolean;
  isRunning?: boolean;
}

export function EditorToolbar({
  currentWorkflow,
  showMinimap,
  setShowMinimap,
  showGrid,
  setShowGrid,
  onSave,
  onRun,
  onFitView,
  onAddNode,
  onBack,
  isSaving = false,
  isRunning = false,
}: EditorToolbarProps) {
  return (
    <div className="flex items-center justify-between h-14 px-4 border-b border-slate-800 bg-slate-950/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-100">
              {currentWorkflow?.name || 'Untitled Workflow'}
            </h2>
            {currentWorkflow && <StatusBadge status={currentWorkflow.status} />}
          </div>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Cortex Editor</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1 mr-2 pr-2 border-r border-slate-800">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-100">
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-100">
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo</TooltipContent>
          </Tooltip>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              onClick={onFitView}
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fit to View</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showMinimap ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-slate-100"
              onClick={() => setShowMinimap((v) => !v)}
            >
              <Map className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{showMinimap ? 'Hide Minimap' : 'Show Minimap'}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showGrid ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-slate-100"
              onClick={() => setShowGrid((v) => !v)}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{showGrid ? 'Hide Grid' : 'Show Grid'}</TooltipContent>
        </Tooltip>

        <div className="w-px h-4 bg-slate-800 mx-1" />

        <Button
          variant="secondary"
          size="sm"
          className="h-8 gap-1.5"
          onClick={onAddNode}
        >
          <Plus className="h-4 w-4" />
          Add Node
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 border-slate-700 hover:bg-slate-800"
          onClick={onSave}
          disabled={!currentWorkflow || isSaving}
          loading={isSaving}
        >
          <Save className="h-4 w-4" />
          Save
        </Button>

        <Button
          variant="default"
          size="sm"
          className="h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white"
          onClick={onRun}
          disabled={!currentWorkflow || isRunning}
          loading={isRunning}
        >
          <Play className="h-4 w-4 fill-current" />
          Run
        </Button>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import {
  Workflow,
  Plus,
  Sparkles,
  Edit3,
  Play,
  Copy,
  Trash2,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { Workflow as WorkflowType } from '@/types';

interface WorkflowsViewProps {
  workflows: WorkflowType[];
  filteredWorkflows: WorkflowType[];
  onCreateWorkflow: () => void;
  onOpenCommandPalette: () => void;
  onEditWorkflow: (workflow: WorkflowType) => void;
  onExecuteWorkflow: (id: string) => void;
  onDeleteWorkflow: (id: string) => void;
}

export function WorkflowsView({
  workflows,
  filteredWorkflows,
  onCreateWorkflow,
  onOpenCommandPalette,
  onEditWorkflow,
  onExecuteWorkflow,
  onDeleteWorkflow,
}: WorkflowsViewProps) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Workflows</h2>
          <p className="text-slate-400">Manage your automation workflows</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onOpenCommandPalette}
            className="border-violet-500/50 text-violet-400"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            AI Create
          </Button>
          <Button onClick={onCreateWorkflow} className="bg-indigo-500 hover:bg-indigo-600">
            <Plus className="h-4 w-4 mr-2" />
            New Workflow
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredWorkflows.map((workflow) => (
          <Card key={workflow.id} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                    <Workflow className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{workflow.name}</CardTitle>
                    <p className="text-xs text-slate-400 mt-0.5">
                      v{workflow.version} • {workflow.triggerType || 'Manual'}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700">
                    <DropdownMenuItem onClick={() => onEditWorkflow(workflow)}>
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onExecuteWorkflow(workflow.id)}>
                      <Play className="h-4 w-4 mr-2" />
                      Execute
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-400"
                      onClick={() => onDeleteWorkflow(workflow.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="pb-3">
              <p className="text-sm text-slate-400 line-clamp-2">
                {workflow.description || 'No description'}
              </p>
              <div className="flex items-center gap-2 mt-3">
                {workflow.tags?.slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
            <CardFooter className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <StatusBadge status={workflow.status} />
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => onEditWorkflow(workflow)}>
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onExecuteWorkflow(workflow.id)}
                  disabled={workflow.status !== 'active'}
                >
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}

        {/* Create New Workflow Card */}
        <Card
          className="bg-slate-900/50 border-dashed border-slate-700 hover:border-indigo-500/50 cursor-pointer transition-all flex items-center justify-center min-h-[200px]"
          onClick={onCreateWorkflow}
        >
          <div className="text-center">
            <div className="h-12 w-12 rounded-lg bg-slate-800 flex items-center justify-center mx-auto mb-3">
              <Plus className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-slate-400">Create New Workflow</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

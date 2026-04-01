'use client';

import React from 'react';
import {
  LayoutDashboard,
  Workflow,
  Activity,
  Plus,
  Sparkles,
  ChevronRight,
  TrendingUp,
  DollarSign,
  BarChart3,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { Workflow as WorkflowType, Execution } from '@/types';

interface Stats {
  activeWorkflows: number;
  todayExecutions: number;
  successRate: number;
  totalCost: number;
}

interface DashboardViewProps {
  workflows: WorkflowType[];
  executions: Execution[];
  stats: Stats;
  onCreateWorkflow: () => void;
  onOpenCommandPalette: () => void;
  onEditWorkflow: (workflow: WorkflowType) => void;
  onViewWorkflows: () => void;
  onViewExecutions: () => void;
}

export function DashboardView({
  workflows,
  executions,
  stats,
  onCreateWorkflow,
  onOpenCommandPalette,
  onEditWorkflow,
  onViewWorkflows,
  onViewExecutions,
}: DashboardViewProps) {
  return (
    <div className="p-6 space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-xl bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-indigo-500/10 border border-indigo-500/20 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">
              Welcome back! 👋
            </h2>
            <p className="text-slate-400 mt-1">
              Your workflows are running smoothly. Here&apos;s what&apos;s happening today.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={onCreateWorkflow}
              className="bg-indigo-500 hover:bg-indigo-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Workflow
            </Button>
            <Button
              variant="outline"
              onClick={onOpenCommandPalette}
              className="border-violet-500/50 text-violet-400 hover:bg-violet-500/10"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              AI Command
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Active Workflows</p>
                <p className="text-3xl font-bold text-slate-100 mt-1">
                  {stats.activeWorkflows}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <Workflow className="h-6 w-6 text-indigo-400" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4 text-xs text-green-400">
              <TrendingUp className="h-3 w-3" />
              <span>+12% from last week</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Today&apos;s Executions</p>
                <p className="text-3xl font-bold text-slate-100 mt-1">
                  {stats.todayExecutions}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Activity className="h-6 w-6 text-green-400" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4 text-xs text-green-400">
              <TrendingUp className="h-3 w-3" />
              <span>+8% from yesterday</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Success Rate</p>
                <p className="text-3xl font-bold text-slate-100 mt-1">
                  {stats.successRate}%
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-violet-400" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4 text-xs text-green-400">
              <TrendingUp className="h-3 w-3" />
              <span>+2% improvement</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Cost</p>
                <p className="text-3xl font-bold text-slate-100 mt-1">
                  ${stats.totalCost.toFixed(2)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-amber-400" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4 text-xs text-amber-400">
              <BarChart3 className="h-3 w-3" />
              <span>This month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Workflows & Executions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Workflows */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg">Recent Workflows</CardTitle>
            <Button variant="ghost" size="sm" className="text-indigo-400" onClick={onViewWorkflows}>
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {workflows.slice(0, 5).map((workflow) => (
              <div
                key={workflow.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
                onClick={() => onEditWorkflow(workflow)}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                    <Workflow className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-100">{workflow.name}</p>
                    <p className="text-xs text-slate-400">
                      {workflow.description || 'No description'}
                    </p>
                  </div>
                </div>
                <StatusBadge status={workflow.status} />
              </div>
            ))}
            {workflows.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <Workflow className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No workflows yet</p>
                <Button variant="link" className="text-indigo-400 mt-2" onClick={onCreateWorkflow}>
                  Create your first workflow
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Executions */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg">Recent Executions</CardTitle>
            <Button variant="ghost" size="sm" className="text-indigo-400" onClick={onViewExecutions}>
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {executions.slice(0, 5).map((execution) => (
              <div
                key={execution.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Activity className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-100">
                      {execution.workflowId.slice(0, 8)}...
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(execution.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">
                    {execution.durationMs ? `${execution.durationMs}ms` : '-'}
                  </span>
                  <StatusBadge status={execution.status} />
                </div>
              </div>
            ))}
            {executions.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No executions yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Eye,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ExecutionTimeline } from '@/components/shared/ExecutionTimeline';
import type { Execution, ExecutionStep } from '@/types';

interface ExecutionsViewProps {
  executions: Execution[];
}

export function ExecutionsView({ executions }: ExecutionsViewProps) {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Execution History</h2>
        <p className="text-slate-400">Monitor and debug your workflow executions</p>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-0">
          <div className="divide-y divide-slate-800">
            {executions.map((execution) => (
              <div key={execution.id} className="p-4 hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        execution.status === 'completed'
                          ? 'bg-green-500/10'
                          : execution.status === 'failed'
                          ? 'bg-red-500/10'
                          : execution.status === 'running'
                          ? 'bg-blue-500/10'
                          : 'bg-slate-500/10'
                      }`}
                    >
                      {execution.status === 'completed' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-400" />
                      ) : execution.status === 'failed' ? (
                        <XCircle className="h-5 w-5 text-red-400" />
                      ) : execution.status === 'running' ? (
                        <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
                      ) : (
                        <Clock className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          Workflow: {execution.workflowId.slice(0, 8)}...
                        </p>
                        <StatusBadge status={execution.status} />
                      </div>
                      <p className="text-sm text-slate-400">
                        {new Date(execution.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-slate-400">Duration</p>
                      <p className="font-medium">
                        {execution.durationMs ? `${execution.durationMs}ms` : '-'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-400">Tokens</p>
                      <p className="font-medium">{execution.totalTokens || 0}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-400">Cost</p>
                      <p className="font-medium">${(execution.totalCost || 0).toFixed(4)}</p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {execution.steps && execution.steps.length > 0 && (
                  <div className="mt-4 pl-14">
                    <ExecutionTimeline steps={execution.steps as ExecutionStep[]} />
                  </div>
                )}
              </div>
            ))}
            {executions.length === 0 && (
              <div className="p-12 text-center text-slate-500">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No executions yet</p>
                <p className="text-sm mt-1">Run a workflow to see execution history here</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

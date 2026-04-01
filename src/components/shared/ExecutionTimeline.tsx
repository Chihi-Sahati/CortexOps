'use client';

import React from 'react';
import { Activity } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import type { ExecutionStep } from '@/types';

export function ExecutionTimeline({ steps }: { steps: ExecutionStep[] }) {
  if (!steps || steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <Activity className="h-12 w-12 mb-4 opacity-50" />
        <p>No execution steps yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {steps.map((step, index) => (
        <div
          key={step.id}
          className="relative flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-xs text-slate-400">
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-200">
                Node: {step.nodeId?.slice(0, 8) || 'Unknown'}
              </span>
              <StatusBadge status={step.status} />
            </div>
            {step.latencyMs && (
              <p className="text-xs text-slate-400 mt-1">
                Latency: {step.latencyMs}ms • Tokens: {step.tokensUsed} • Cost: ${step.cost.toFixed(4)}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

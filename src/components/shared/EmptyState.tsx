'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
  action,
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-12 text-center animate-in fade-in zoom-in duration-500",
      className
    )}>
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-900/50 border border-slate-800 mb-6 shadow-2xl">
        <Icon className="h-10 w-10 text-slate-500/80 stroke-[1.5]" />
      </div>
      <h3 className="text-lg font-semibold text-slate-100 mb-2">{title}</h3>
      {description && (
        <p className="max-w-[280px] text-sm text-slate-500 leading-relaxed mb-6">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
}

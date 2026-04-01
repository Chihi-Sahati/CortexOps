'use client';

import React from 'react';
import { Zap, Code, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUserLevel, type UserLevel } from './UserLevelContext';

const levels: Array<{
  id: UserLevel;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = [
  {
    id: 'simple',
    label: 'Simple',
    description: 'Drag & drop templates, guided setup',
    icon: Sparkles,
    color: 'text-green-400 border-green-500/50 bg-green-500/10',
  },
  {
    id: 'medium',
    label: 'Low-code',
    description: 'All nodes, mappings, advanced settings',
    icon: Zap,
    color: 'text-indigo-400 border-indigo-500/50 bg-indigo-500/10',
  },
  {
    id: 'advanced',
    label: 'Pro',
    description: 'YAML export, CLI, debug tools, custom code',
    icon: Code,
    color: 'text-violet-400 border-violet-500/50 bg-violet-500/10',
  },
];

export function UserLevelSelector() {
  const { userLevel, setUserLevel } = useUserLevel();

  return (
    <div className="flex items-center gap-1 p-1 bg-slate-800/50 rounded-lg border border-slate-700">
      {levels.map((level) => {
        const isActive = userLevel === level.id;
        const Icon = level.icon;
        return (
          <Button
            key={level.id}
            variant="ghost"
            size="sm"
            onClick={() => setUserLevel(level.id)}
            className={`flex-1 gap-1.5 text-xs ${
              isActive
                ? `${level.color} border`
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {level.label}
          </Button>
        );
      })}
    </div>
  );
}

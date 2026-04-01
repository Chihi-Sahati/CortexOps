import React from 'react';
import {
  Edit3,
  CheckCircle2,
  Pause,
  Database,
  XCircle,
  Loader2,
  Clock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: React.ComponentType<{ className?: string }> }> = {
    draft: { color: 'bg-slate-500', icon: Edit3 },
    active: { color: 'bg-green-500', icon: CheckCircle2 },
    paused: { color: 'bg-yellow-500', icon: Pause },
    archived: { color: 'bg-slate-600', icon: Database },
    completed: { color: 'bg-green-500', icon: CheckCircle2 },
    failed: { color: 'bg-red-500', icon: XCircle },
    running: { color: 'bg-blue-500', icon: Loader2 },
    pending: { color: 'bg-slate-400', icon: Clock },
    cancelled: { color: 'bg-slate-500', icon: XCircle },
  };

  const { color, icon: Icon } = config[status] || config.draft;

  return (
    <Badge variant="secondary" className={`${color} text-white border-0 text-xs`}>
      <Icon className={`h-3 w-3 mr-1 ${status === 'running' ? 'animate-spin' : ''}`} />
      {status}
    </Badge>
  );
}

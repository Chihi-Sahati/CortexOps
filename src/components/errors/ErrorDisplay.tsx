'use client';

import React from 'react';
import {
  AlertTriangle,
  ShieldCheck,
  Zap,
  RefreshCw,
  Clock,
  XCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ErrorInfo {
  id: string;
  timestamp: Date;
  message: string;
  cause: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  details?: Record<string, unknown>;
  suggestedActions: Array<{
    label: string;
    action: () => Promise<void> | void;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
    loading?: boolean;
    confirm?: string;
  }>;
  isResolved?: boolean;
  resolution?: string;
}

interface ErrorDisplayProps {
  error: ErrorInfo;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorDisplay({
  error,
  onDismiss,
  className = '',
}: ErrorDisplayProps) {
  const severityColors: Record<string, string> = {
    low: 'border-green-500 text-green-400',
    medium: 'border-yellow-500 text-yellow-400',
    high: 'border-orange-500 text-orange-400',
    critical: 'border-red-500 text-red-400',
  };

  const severityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    low: CheckCircle2,
    medium: AlertTriangle,
    high: Zap,
    critical: XCircle,
  };

  const SeverityIcon = severityIcons[error.severity] || AlertTriangle;

  const handleAction = async (action: ErrorInfo['suggestedActions'][number]) => {
    if (action.confirm) {
      if (!window.confirm(action.confirm)) return;
    }
    try {
      const result = action.action();
      if (result instanceof Promise) {
        await result;
      }
    } catch (err) {
      console.error('Error executing suggested action:', err);
      // Toast would be ideal here but we'll keep it simple
    }
  };

  return (
    <div className={className}>
      <Card className="border-slate-700">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <SeverityIcon className={`h-5 w-5 ${severityColors[error.severity]} flex-shrink-0`} />
            </div>
            <div className="flex-1">
              <div className="flex items-between justify-between mb-1">
                <h3 className="text-sm font-medium text-slate-100">{error.message}</h3>
                <button
                  onClick={onDismiss}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-slate-400 mb-2">{error.cause}</p>

              {error.details && Object.keys(error.details).length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-300">Details:</p>
                  <div className="text-xs text-slate-400 space-y-0.5">
                    {Object.entries(error.details).map(([key, value]) => (
                      <div key={key} className="flex">
                        <span className="font-mono">{String(key)}:</span>
                        <span className="ml-1">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error.suggestedActions.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-slate-300 mb-1">Suggested Actions:</p>
                  <div className="space-y-2">
                    {error.suggestedActions.map((action, index) => (
                      <div key={index}>
                        <Button
                          variant={action.variant ?? 'outline'}
                          size="sm"
                          onClick={() => handleAction(action)}
                          disabled={action.loading}
                          className="w-full text-left"
                        >
                          {action.loading ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              {action.label}
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error.isResolved && (
                <div className="mt-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <ShieldCheck className="h-4 w-4 mr-2 text-green-400" />
                  <span className="text-xs text-green-400">
                    {error.resolution ?? 'Issue resolved'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 mr-1" />
              {error.timestamp.toLocaleString()}
            </span>
            <Badge
              variant="outline"
              className={severityColors[error.severity]}
            >
              {error.severity.toUpperCase()}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

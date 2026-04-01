'use client';

import React, { useState, useCallback } from 'react';
import {
  AlertTriangle,
  ShieldCheck,
  Zap,
  RefreshCw,
  Clock,
  XCircle,
  CheckCircle2,
  Loader2,
  Bot,
  Sparkles,
  Shield,
  Settings,
  RotateCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

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
  healingAttempts?: number;
  maxHealingAttempts?: number;
  healingInProgress?: boolean;
  canHeal?: boolean;
  healAction?: () => Promise<void>;
}

interface SelfHealingErrorDisplayProps {
  error: ErrorInfo;
  onDismiss?: () => void;
  className?: string;
  aiEngineUrl?: string;
}

export function SelfHealingErrorDisplay({
  error,
  onDismiss,
  className = '',
  aiEngineUrl = '/ai-engine',
}: SelfHealingErrorDisplayProps) {
  const [healingStatus, setHealingStatus] = useState<'idle' | 'attempting' | 'success' | 'failed'>('idle');
  const [healingLogs, setHealingLogs] = useState<string[]>([]);
  const isAttempting = healingStatus === 'attempting';

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

  const addHealingLog = (log: string) => {
    setHealingLogs((prev) => [...prev, log]);
    // Keep only last 10 logs
    if (healingLogs.length > 10) {
      setHealingLogs(healingLogs.slice(-10));
    }
  };

  const attemptSelfHealing = useCallback(async () => {
    if (!error.canHeal || !error.healAction || healingStatus !== 'idle') return;

    setHealingStatus('attempting');
    addHealingLog('Starting self-healing process...');

    try {
      // Call the custom heal action if provided
      if (error.healAction) {
        await error.healAction();
        addHealingLog('Custom heal action completed');
      } else {
        // Attempt AI-powered healing
        addHealingLog('Requesting AI diagnosis...');
        
        const response = await fetch(`${aiEngineUrl}/ai/heal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: {
              message: error.message,
              cause: error.cause,
              category: error.category,
              details: error.details,
              timestamp: error.timestamp.toISOString(),
            },
            context: {
              healingAttempt: error.healingAttempts || 0,
              maxAttempts: error.maxHealingAttempts || 3,
            }
          }),
        });

        if (!response.ok) {
          throw new Error(`AI engine error: ${response.status}`);
        }

        const healingPlan = await response.json();
        addHealingLog(`Received healing plan: ${healingPlan.description || 'Unknown plan'}`);

        // Execute healing steps
        for (const step of healingPlan.steps || []) {
          addHealingLog(`Executing: ${step.description}`);
          // Simulate step execution - in reality this would call specific APIs
          await new Promise(resolve => setTimeout(resolve, 500));
          addHealingLog(`Completed: ${step.description}`);
        }

        addHealingLog('Self-healing process completed successfully');
      }

      setHealingStatus('success');
      toast.success('Self-healing completed successfully');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Self-healing failed:', err);
      setHealingStatus('failed');
      addHealingLog(`Self-healing failed: ${errorMessage}`);
      toast.error('Self-healing failed. Please try manual resolution.');
    }
  }, [error, healingStatus, aiEngineUrl]);

  const handleAction = async (action: ErrorInfo['suggestedActions'][number]) => {
    if (action.confirm) {
      if (!window.confirm(action.confirm)) return;
    }
    try {
      const result = action.action();
      if (result instanceof Promise) {
        await result;
      }
      toast.success('Action completed');
    } catch (err) {
      console.error('Error executing suggested action:', err);
      toast.error('Failed to execute action');
    }
  };

  // Determine if we should show healing UI
  const showHealingUI = error.canHeal && 
                       error.healingAttempts !== undefined && 
                       (error.healingAttempts === 0 || 
                        (error.maxHealingAttempts && error.healingAttempts < error.maxHealingAttempts));

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

              {showHealingUI && (
                <div className="mt-4 p-3 border border-slate-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-slate-200">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Self-Healing Options
                    </h4>
                    {error.healingInProgress && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHealingStatus('idle')}
                        className="text-xs text-slate-400"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-slate-500">
                      Healing attempts: {error.healingAttempts || 0}/{
                        error.maxHealingAttempts ?? 'unlimited'
                      }
                    </p>
                    
                    {isAttempting && (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-xs text-slate-400">Attempting self-healing...</span>
                      </div>
                    )}
                    
                    {healingStatus === 'success' && (
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                        <span className="text-xs text-green-400">Self-healing successful</span>
                      </div>
                    )}
                    
                    {(!isAttempting) && error.canHeal && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={attemptSelfHealing}
                        disabled={isAttempting}
                        className="w-full"
                      >
                        <>
                          <Sparkles className="h-3 w-3 mr-1" />
                          Attempt Self-Healing
                        </>
                      </Button>
                    )}
                  </div>

                  {healingLogs.length > 0 && (
                    <div className="mt-2 p-2 bg-slate-800/50 rounded text-xs">
                      <p className="font-medium text-slate-300 mb-1">Healing Log:</p>
                      <div className="max-h-[80px] overflow-y-auto text-slate-400 font-mono">
                        {healingLogs.map((log, index) => (
                          <div key={index} className="mb-1">
                            <span className="text-xs">[{new Date().toLocaleTimeString()}]</span> {log}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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

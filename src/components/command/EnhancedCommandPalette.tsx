'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Sparkles,
  Loader2,
  Plus,
  Search,
  Clock,
  DollarSign,
  Zap,
  Settings,
  Play,
  Save,
  FileJson,
  Code,
  Webhook,
  Timer,
  Filter,
  GitBranch,
  Shuffle,
  ArrowRight,
  Command,
  X,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { nodeRegistry } from '@/lib/node-registry';

interface CommandItem {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'ai' | 'action' | 'node' | 'navigation' | 'quick';
  action: () => void;
  keywords?: string[];
  shortcut?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onCommand: (command: string) => void;
  onNodeAdd?: (nodeType: string) => void;
  onNavigate?: (view: string) => void;
}

export function EnhancedCommandPalette({
  isOpen,
  onClose,
  onCommand,
  onNodeAdd,
  onNavigate,
}: CommandPaletteProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<Record<string, unknown> | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setInput('');
      setSuggestion(null);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const commands: CommandItem[] = useMemo(
    () => [
      {
        id: 'ai-generate',
        label: 'Generate with AI',
        description: 'Describe a workflow in natural language',
        icon: Sparkles,
        category: 'ai',
        action: () => handleAIGenerate(),
        keywords: ['ai', 'generate', 'create', 'build', 'natural language'],
      },
      {
        id: 'new-workflow',
        label: 'New Workflow',
        description: 'Create a blank workflow',
        icon: Plus,
        category: 'action',
        action: () => {
          onCommand('new-workflow');
          onClose();
        },
        keywords: ['new', 'create', 'blank', 'workflow'],
        shortcut: '⌘N',
      },
      {
        id: 'save-workflow',
        label: 'Save Workflow',
        description: 'Save the current workflow',
        icon: Save,
        category: 'action',
        action: () => {
          onCommand('save-workflow');
          onClose();
        },
        keywords: ['save', 'persist'],
        shortcut: '⌘S',
      },
      {
        id: 'execute-workflow',
        label: 'Execute Workflow',
        description: 'Run the current workflow',
        icon: Play,
        category: 'action',
        action: () => {
          onCommand('execute-workflow');
          onClose();
        },
        keywords: ['run', 'execute', 'start', 'trigger'],
        shortcut: '⌘↵',
      },
      {
        id: 'nav-dashboard',
        label: 'Go to Dashboard',
        description: 'Navigate to the main dashboard',
        icon: Zap,
        category: 'navigation',
        action: () => {
          onNavigate?.('dashboard');
          onClose();
        },
        keywords: ['dashboard', 'home', 'overview'],
      },
      {
        id: 'nav-workflows',
        label: 'Go to Workflows',
        description: 'View all workflows',
        icon: FileJson,
        category: 'navigation',
        action: () => {
          onNavigate?.('workflows');
          onClose();
        },
        keywords: ['workflows', 'list'],
      },
      {
        id: 'nav-executions',
        label: 'Go to Executions',
        description: 'View execution history',
        icon: Clock,
        category: 'navigation',
        action: () => {
          onNavigate?.('executions');
          onClose();
        },
        keywords: ['executions', 'history', 'runs'],
      },
      {
        id: 'nav-settings',
        label: 'Go to Settings',
        description: 'Configure CortexOps',
        icon: Settings,
        category: 'navigation',
        action: () => {
          onNavigate?.('settings');
          onClose();
        },
        keywords: ['settings', 'config', 'preferences'],
      },
      ...nodeRegistry.map((node) => ({
        id: `add-node-${node.type}`,
        label: `Add ${node.name}`,
        description: node.description,
        icon: Zap,
        category: 'node' as const,
        action: () => {
          onNodeAdd?.(node.type);
          onClose();
        },
        keywords: [node.name.toLowerCase(), node.type, node.category, 'add', 'insert'],
      })),
    ],
    [onCommand, onClose, onNavigate, onNodeAdd]
  );

  const filteredCommands = useMemo(() => {
    if (!input.trim()) return commands.filter((c) => c.category !== 'node').slice(0, 8);

    const query = input.toLowerCase();
    return commands
      .filter(
        (cmd) =>
          cmd.label.toLowerCase().includes(query) ||
          cmd.description.toLowerCase().includes(query) ||
          cmd.keywords?.some((k) => k.includes(query))
      )
      .slice(0, 10);
  }, [input, commands]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [input]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && filteredCommands.length > 0) {
        e.preventDefault();
        if (suggestion) {
          handleCreateWorkflow();
        } else {
          filteredCommands[selectedIndex]?.action();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, suggestion, onClose]);

  const handleAIGenerate = async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/nl/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: input }),
      });

      const data = await response.json();
      if (data.success) {
        setSuggestion(data.data);
        toast.success('Workflow plan generated!');
      } else {
        toast.error('Failed to process command');
      }
    } catch (error) {
      toast.error('Failed to process command');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWorkflow = () => {
    if (suggestion) {
      onCommand(input);
      setInput('');
      setSuggestion(null);
      onClose();
    }
  };

  const categoryLabels: Record<string, string> = {
    ai: 'AI Assistant',
    action: 'Actions',
    navigation: 'Navigation',
    node: 'Add Node',
    quick: 'Quick Actions',
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-700 bg-slate-800/20">
          <Search className="h-5 w-5 text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a command or describe a workflow (e.g., 'Monitor my website')..."
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 outline-none text-base font-medium"
          />
          {isLoading && <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />}
          <div className="flex items-center gap-1.5">
            <kbd className="hidden sm:inline px-2 py-1 bg-slate-800 border border-slate-700 rounded text-[10px] font-bold text-slate-500">ESC</kbd>
          </div>
        </div>

        {/* AI Suggestion */}
        {suggestion && (
          <div className="p-4 border-b border-slate-700 bg-slate-800/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-400" />
                Generated Workflow Plan
              </h3>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {String((suggestion as Record<string, unknown>).estimatedDuration)}s
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />${String((suggestion as Record<string, unknown>).estimatedCost)}
                </span>
                <Badge
                  variant="outline"
                  className={
                    (suggestion as Record<string, unknown>).riskAssessment === 'low'
                      ? 'border-green-500 text-green-400'
                      : 'border-yellow-500 text-yellow-400'
                  }
                >
                  {String((suggestion as Record<string, unknown>).riskAssessment)} risk
                </Badge>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              {((suggestion as Record<string, unknown>).plan as Array<Record<string, unknown>>)?.map((step, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2 bg-slate-900/50 rounded-lg border border-slate-700"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20 text-xs text-indigo-400">
                    {i + 1}
                  </span>
                  <span className="text-sm text-slate-300 flex-1">{step.description as string}</span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {(step.nodeType as string).split('.')[1]}
                  </Badge>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setSuggestion(null)}>
                Discard
              </Button>
              <Button size="sm" onClick={handleCreateWorkflow} className="bg-indigo-500 hover:bg-indigo-600">
                <Plus className="h-4 w-4 mr-1" />
                Create Workflow
              </Button>
            </div>
          </div>
        )}

        {/* Command List */}
        {!suggestion && (
          <ScrollArea className="max-h-[400px]">
            <div className="p-2">
              {Object.entries(
                filteredCommands.reduce((acc, cmd) => {
                  if (!acc[cmd.category]) acc[cmd.category] = [];
                  acc[cmd.category].push(cmd);
                  return acc;
                }, {} as Record<string, CommandItem[]>)
              ).map(([category, cmds]) => (
                <div key={category} className="mb-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 py-1">
                    {categoryLabels[category] || category}
                  </p>
                  {cmds.map((cmd) => {
                    const globalIndex = filteredCommands.indexOf(cmd);
                    return (
                      <button
                        key={cmd.id}
                        onClick={cmd.action}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                          globalIndex === selectedIndex
                            ? 'bg-indigo-500/10 border border-indigo-500/20'
                            : 'hover:bg-slate-800/50'
                        }`}
                      >
                        <cmd.icon
                          className={`h-4 w-4 shrink-0 ${
                            globalIndex === selectedIndex ? 'text-indigo-400' : 'text-slate-400'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium truncate ${
                              globalIndex === selectedIndex ? 'text-indigo-300' : 'text-slate-200'
                            }`}
                          >
                            {cmd.label}
                          </p>
                          <p className="text-xs text-slate-500 truncate">{cmd.description}</p>
                        </div>
                        {cmd.shortcut && (
                          <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-slate-500">
                            {cmd.shortcut}
                          </kbd>
                        )}
                        {globalIndex === selectedIndex && (
                          <ChevronRight className="h-4 w-4 text-indigo-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
              {filteredCommands.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No commands found</p>
                  <p className="text-xs mt-1">Try describing a workflow with AI</p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Footer */}
        <div className="p-3 bg-slate-800/30 border-t border-slate-700">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-slate-800 rounded">↑↓</kbd> Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-slate-800 rounded">↵</kbd> Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-slate-800 rounded">ESC</kbd> Close
              </span>
            </div>
            <span className="text-violet-400">AI-powered</span>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Sparkles,
  Loader2,
  Bot,
  User,
  Copy,
  Check,
  ChevronDown,
  Workflow,
  Clock,
  DollarSign,
  AlertTriangle,
  X,
  Maximize2,
  Minimize2,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  workflowPlan?: WorkflowPlan;
  isStreaming?: boolean;
}

interface WorkflowPlan {
  name: string;
  description: string;
  plan: Array<{
    step: number;
    description: string;
    nodeType: string;
    config?: Record<string, unknown>;
  }>;
  estimatedDuration: number;
  estimatedCost: number;
  riskAssessment: 'low' | 'medium' | 'high';
}

interface ChatInterfaceProps {
  onWorkflowCreate?: (plan: WorkflowPlan) => void;
  onMinimize?: () => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
}

const SUGGESTED_PROMPTS = [
  'Create a workflow that sends a Slack notification when a new file is uploaded to S3',
  'Build an AI-powered email summarizer that runs every morning',
  'Set up a webhook that processes Stripe payments and updates a database',
  'Create a workflow that monitors a website and alerts me if it goes down',
];

export function ChatInterface({
  onWorkflowCreate,
  onMinimize,
  isFullScreen = false,
  onToggleFullScreen,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hello! I'm CortexOps AI. Describe the workflow you want to create, and I'll build it for you. You can also ask me to explain, modify, or debug existing workflows.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Copied to clipboard');
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);

      const assistantId = `assistant-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          isStreaming: true,
        },
      ]);

      try {
        const response = await fetch('/api/nl/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: content, context: 'chat' }),
        });

        const data = await response.json();

        if (data.success) {
          const plan = data.data as WorkflowPlan;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: `I've analyzed your request and created a workflow plan. Here's what I'll build:`,
                    workflowPlan: plan,
                    isStreaming: false,
                  }
                : m
            )
          );
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content:
                      data.error?.message ||
                      "I couldn't process that request. Could you try rephrasing it?",
                    isStreaming: false,
                  }
                : m
            )
          );
        }
      } catch (error) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content:
                    'An error occurred while processing your request. Please check your connection and try again.',
                  isStreaming: false,
                }
              : m
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div
      className={`flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden ${
        isFullScreen ? 'fixed inset-0 z-50 rounded-none' : 'h-full'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">AI Workflow Builder</h3>
            <p className="text-xs text-slate-400">Describe your workflow in natural language</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onToggleFullScreen && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={onToggleFullScreen}>
              {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          )}
          {onMinimize && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={onMinimize}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-indigo-600/20 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-violet-400" />
                </div>
              )}

              <div
                className={`max-w-[80%] rounded-xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-indigo-500/10 border border-indigo-500/20 text-slate-100'
                    : 'bg-slate-800/50 border border-slate-700 text-slate-200'
                }`}
              >
                {message.isStreaming ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                    <span className="text-sm text-slate-400">Analyzing your request...</span>
                  </div>
                ) : (
                  <>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                    {message.workflowPlan && (
                      <div className="mt-3 space-y-3">
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            ~{message.workflowPlan.estimatedDuration}s
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />${message.workflowPlan.estimatedCost}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              message.workflowPlan.riskAssessment === 'low'
                                ? 'border-green-500 text-green-400'
                                : message.workflowPlan.riskAssessment === 'medium'
                                ? 'border-yellow-500 text-yellow-400'
                                : 'border-red-500 text-red-400'
                            }
                          >
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {message.workflowPlan.riskAssessment} risk
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          {message.workflowPlan.plan.map((step, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-3 p-2 bg-slate-900/50 rounded-lg border border-slate-700"
                            >
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-[10px] text-indigo-400 font-medium">
                                {step.step}
                              </span>
                              <span className="text-xs text-slate-300 flex-1">{step.description}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {step.nodeType.split('.').pop()}
                              </Badge>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            className="bg-indigo-500 hover:bg-indigo-600 text-xs"
                            onClick={() => onWorkflowCreate?.(message.workflowPlan!)}
                          >
                            <Workflow className="h-3 w-3 mr-1" />
                            Create Workflow
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => handleCopy(JSON.stringify(message.workflowPlan, null, 2), message.id)}
                          >
                            {copiedId === message.id ? (
                              <Check className="h-3 w-3 mr-1" />
                            ) : (
                              <Copy className="h-3 w-3 mr-1" />
                            )}
                            Copy Plan
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-slate-500">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {message.role === 'assistant' && !message.isStreaming && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] text-slate-500 hover:text-slate-300"
                          onClick={() => handleCopy(message.content, message.id)}
                        >
                          {copiedId === message.id ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>

              {message.role === 'user' && (
                <div className="h-8 w-8 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-indigo-400" />
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Suggested Prompts */}
      {messages.length <= 2 && (
        <div className="px-5 pb-4">
          <div className="flex items-center gap-2 mb-3 text-slate-500">
            <Sparkles className="h-3 w-3 text-indigo-400" />
            <p className="text-[10px] font-bold uppercase tracking-widest">Get started with AI</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SUGGESTED_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => setInput(prompt)}
                className="group relative flex flex-col text-left p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800 hover:border-indigo-500/50 transition-all duration-200"
              >
                <span className="text-[11px] text-slate-300 leading-snug line-clamp-2 group-hover:text-indigo-300">
                  {prompt}
                </span>
                <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="h-3 w-3 text-indigo-400" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative group">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your workflow logic..."
              rows={1}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all resize-none min-h-[52px] max-h-[120px]"
              style={{ height: 'auto' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
              }}
            />
            <div className="absolute right-3 top-3.5 flex items-center gap-1 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none">
              <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-[9px] font-bold text-slate-500 shadow-sm">↵ ENTER</kbd>
            </div>
          </div>
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="bg-indigo-600 hover:bg-indigo-500 h-[52px] w-[52px] rounded-xl shadow-lg shadow-indigo-500/10 shrink-0"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 fill-current" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

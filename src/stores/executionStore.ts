// CortexOps - Execution Store
// State management for workflow execution

import { create } from 'zustand';
import type { Execution, ExecutionStep, AgentTrace, WebSocketEvent } from '@/types';

interface ExecutionState {
  // Current execution
  currentExecution: Execution | null;
  steps: ExecutionStep[];
  agentTraces: AgentTrace[];
  
  // Execution list
  executions: Execution[];
  totalExecutions: number;
  
  // UI State
  isExecuting: boolean;
  isLoading: boolean;
  realtimeEvents: WebSocketEvent[];
  
  // Actions
  setCurrentExecution: (execution: Execution | null) => void;
  setSteps: (steps: ExecutionStep[]) => void;
  addStep: (step: ExecutionStep) => void;
  updateStep: (id: string, updates: Partial<ExecutionStep>) => void;
  addAgentTrace: (trace: AgentTrace) => void;
  setExecutions: (executions: Execution[], total: number) => void;
  setIsExecuting: (isExecuting: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  addRealtimeEvent: (event: WebSocketEvent) => void;
  clearRealtimeEvents: () => void;
  reset: () => void;
}

export const useExecutionStore = create<ExecutionState>((set) => ({
  currentExecution: null,
  steps: [],
  agentTraces: [],
  executions: [],
  totalExecutions: 0,
  isExecuting: false,
  isLoading: false,
  realtimeEvents: [],

  setCurrentExecution: (execution) => set({ currentExecution: execution }),
  
  setSteps: (steps) => set({ steps }),
  
  addStep: (step) => set((state) => ({ 
    steps: [...state.steps, step] 
  })),
  
  updateStep: (id, updates) => set((state) => ({
    steps: state.steps.map((step) => 
      step.id === id ? { ...step, ...updates } : step
    ),
  })),
  
  addAgentTrace: (trace) => set((state) => ({ 
    agentTraces: [...state.agentTraces, trace] 
  })),
  
  setExecutions: (executions, total) => set({ executions, totalExecutions: total }),
  
  setIsExecuting: (isExecuting) => set({ isExecuting }),
  
  setIsLoading: (isLoading) => set({ isLoading }),
  
  addRealtimeEvent: (event) => set((state) => ({
    realtimeEvents: [...state.realtimeEvents.slice(-100), event], // Keep last 100 events
  })),
  
  clearRealtimeEvents: () => set({ realtimeEvents: [] }),
  
  reset: () => set({
    currentExecution: null,
    steps: [],
    agentTraces: [],
    isExecuting: false,
    isLoading: false,
    realtimeEvents: [],
  }),
}));

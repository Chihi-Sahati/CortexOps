// CortexOps - Workflow Store
// State management for workflow editor

import { create } from 'zustand';
import type { Workflow, WorkflowNode, WorkflowEdge, NodeType } from '@/types';

interface WorkflowState {
  // Current workflow
  workflow: Workflow | null;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  
  // UI State
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  isDirty: boolean;
  isLoading: boolean;
  
  // Actions
  setWorkflow: (workflow: Workflow | null) => void;
  setNodes: (nodes: WorkflowNode[]) => void;
  setEdges: (edges: WorkflowEdge[]) => void;
  addNode: (node: WorkflowNode) => void;
  updateNode: (id: string, updates: Partial<WorkflowNode>) => void;
  removeNode: (id: string) => void;
  addEdge: (edge: WorkflowEdge) => void;
  removeEdge: (id: string) => void;
  setSelectedNode: (id: string | null) => void;
  setSelectedEdge: (id: string | null) => void;
  setIsDirty: (isDirty: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  reset: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  workflow: null,
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  isDirty: false,
  isLoading: false,

  setWorkflow: (workflow) => set({ workflow, nodes: workflow?.nodes || [], edges: workflow?.edges || [], isDirty: false }),
  
  setNodes: (nodes) => set({ nodes, isDirty: true }),
  
  setEdges: (edges) => set({ edges, isDirty: true }),
  
  addNode: (node) => set((state) => ({ 
    nodes: [...state.nodes, node], 
    isDirty: true 
  })),
  
  updateNode: (id, updates) => set((state) => ({
    nodes: state.nodes.map((node) => 
      node.id === id ? { ...node, ...updates } : node
    ),
    isDirty: true,
  })),
  
  removeNode: (id) => set((state) => ({
    nodes: state.nodes.filter((node) => node.id !== id),
    edges: state.edges.filter((edge) => 
      edge.sourceNodeId !== id && edge.targetNodeId !== id
    ),
    selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    isDirty: true,
  })),
  
  addEdge: (edge) => set((state) => ({ 
    edges: [...state.edges, edge], 
    isDirty: true 
  })),
  
  removeEdge: (id) => set((state) => ({
    edges: state.edges.filter((edge) => edge.id !== id),
    selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId,
    isDirty: true,
  })),
  
  setSelectedNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  
  setSelectedEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
  
  setIsDirty: (isDirty) => set({ isDirty }),
  
  setIsLoading: (isLoading) => set({ isLoading }),
  
  reset: () => set({
    workflow: null,
    nodes: [],
    edges: [],
    selectedNodeId: null,
    selectedEdgeId: null,
    isDirty: false,
    isLoading: false,
  }),
}));

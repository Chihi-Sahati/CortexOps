'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toast } from 'sonner';

// Layout
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

// Views
import { DashboardView } from '@/components/views/DashboardView';
import { WorkflowsView } from '@/components/views/WorkflowsView';
import { ExecutionsView } from '@/components/views/ExecutionsView';
import { ConnectorsView } from '@/components/views/ConnectorsView';
import { SecurityView } from '@/components/views/SecurityView';
import { SettingsView } from '@/components/views/SettingsView';

// Editor
import { WorkflowCanvas } from '@/components/editor/WorkflowCanvas';
import { NodeLibrary } from '@/components/editor/NodeLibrary';
import { NodeConfigPanel } from '@/components/editor/NodeConfigPanel';
import { ExecutionPanel } from '@/components/editor/ExecutionPanel';
import { EditorToolbar } from '@/components/editor/EditorToolbar';
import { UserLevelProvider } from '@/components/editor/UserLevelContext';
import { UserLevelSelector } from '@/components/editor/UserLevelSelector';

// Chat & Command
import { ChatInterface } from '@/components/chat/ChatInterface';
import { EnhancedCommandPalette } from '@/components/command/EnhancedCommandPalette';

// Shared
import { StatusBadge } from '@/components/shared/StatusBadge';

// UI
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Plus, Layers, Settings, Activity, Sparkles, MessageSquare, X, Maximize2, Minimize2 } from 'lucide-react';

import { nodeRegistry, getNodeDefinition, nodeCategories } from '@/lib/node-registry';
import type { NodeDefinition, NodeType, Workflow as WorkflowType, Execution, ExecutionStep } from '@/types';

// ==========================================
// Types
// ==========================================
type ViewMode = 'dashboard' | 'workflows' | 'editor' | 'executions' | 'connectors' | 'security' | 'settings';

interface Stats {
  activeWorkflows: number;
  todayExecutions: number;
  successRate: number;
  totalCost: number;
}

// ==========================================
// Main Page Component
// ==========================================
export default function CortexOpsApp() {
  // State
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatFullScreen, setChatFullScreen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'nodes' | 'config' | 'execution'>('nodes');

  // Data state
  const [workflows, setWorkflows] = useState<WorkflowType[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [stats, setStats] = useState<Stats>({
    activeWorkflows: 0,
    todayExecutions: 0,
    successRate: 0,
    totalCost: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Editor state
  const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowType | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showMinimap, setShowMinimap] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  // Modal state
  const [createWorkflowModal, setCreateWorkflowModal] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWorkflowDescription, setNewWorkflowDescription] = useState('');

  // React Flow instance
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Fetch data
  const fetchWorkflows = useCallback(async () => {
    try {
      const response = await fetch('/api/workflows');
      const data = await response.json();
      if (data.success) {
        setWorkflows(data.data.items);
        setStats((prev) => ({
          ...prev,
          activeWorkflows: data.data.items.filter(
            (w: WorkflowType) => w.status === 'active'
          ).length,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
    }
  }, []);

  const fetchExecutions = useCallback(async () => {
    try {
      const response = await fetch('/api/executions?limit=10');
      const data = await response.json();
      if (data.success) {
        setExecutions(data.data.items);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayExecs = data.data.items.filter((e: Execution) => new Date(e.createdAt) >= today);
        const completed = data.data.items.filter((e: Execution) => e.status === 'completed');
        setStats((prev) => ({
          ...prev,
          todayExecutions: todayExecs.length,
          successRate:
            data.data.items.length > 0
              ? Math.round((completed.length / data.data.items.length) * 100)
              : 0,
          totalCost: data.data.items.reduce(
            (sum: number, e: Execution) => sum + (e.totalCost || 0),
            0
          ),
        }));
      }
    } catch (error) {
      console.error('Failed to fetch executions:', error);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
    fetchExecutions();
  }, [fetchWorkflows, fetchExecutions]);

  // Keyboard shortcuts
  const saveWorkflowRef = useRef<() => void>(() => {});
  const executeWorkflowRef = useRef<(id: string) => void>(() => {});

  useEffect(() => {
    saveWorkflowRef.current = () => {
      if (currentWorkflow) {
        saveWorkflow();
      }
    };
    executeWorkflowRef.current = (id: string) => {
      handleExecuteWorkflow(id);
    };
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }
      if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        saveWorkflowRef.current();
        return;
      }
      if (currentView !== 'editor') return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNode) {
        e.preventDefault();
        setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
        setSelectedNode(null);
        toast.success('Node deleted');
        return;
      }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (currentWorkflow) {
          executeWorkflowRef.current(currentWorkflow.id);
        }
        return;
      }
      if (e.key === 'Escape') {
        setSelectedNode(null);
        setSidebarTab('nodes');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView, selectedNode, currentWorkflow, setNodes]);

  // Create workflow
  const handleCreateWorkflow = async () => {
    if (!newWorkflowName.trim()) {
      toast.error('Workflow name is required');
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newWorkflowName,
          description: newWorkflowDescription,
          status: 'draft',
          nodes: [],
          edges: [],
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Workflow created successfully');
        setCreateWorkflowModal(false);
        setNewWorkflowName('');
        setNewWorkflowDescription('');
        fetchWorkflows();
        setCurrentWorkflow(data.data);
        setCurrentView('editor');
      } else {
        toast.error(data.error?.message || 'Failed to create workflow');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create workflow');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete workflow
  const handleDeleteWorkflow = async (id: string) => {
    try {
      const response = await fetch(`/api/workflows/${id}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success('Workflow deleted');
        fetchWorkflows();
      } else {
        toast.error('Failed to delete workflow');
      }
    } catch (error) {
      toast.error('Failed to delete workflow');
    }
  };

  // Execute workflow
  const handleExecuteWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}/execute`, { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        toast.success('Workflow execution started');
        fetchExecutions();
      } else {
        toast.error(data.error?.message || 'Failed to execute workflow');
      }
    } catch (error) {
      toast.error('Failed to execute workflow');
    }
  };

  // Node drag and drop
  const onDragStart = (event: React.DragEvent, nodeDef: NodeDefinition) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeDef));
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const data = event.dataTransfer.getData('application/reactflow');
      if (!data) return;
      const nodeDef: NodeDefinition = JSON.parse(data);
      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      const position = {
        x: event.clientX - (bounds?.left || 0) - 90,
        y: event.clientY - (bounds?.top || 0) - 40,
      };
      const newNode: Node = {
        id: `node-${Date.now()}`,
        type: 'custom',
        position,
        data: {
          label: nodeDef.name,
          type: nodeDef.type,
          config: {},
          isEnabled: true,
        },
      };
      setNodes((nds) => [...nds, newNode]);
      toast.success(`Added ${nodeDef.name} to canvas`);
    },
    [setNodes]
  );

  // Edge connection
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
            style: { stroke: '#6366f1', strokeWidth: 2 },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  // Node selection
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode(node);
      setSidebarTab('config');
    },
    []
  );

  // Update node config
  const updateNodeConfig = (key: string, value: unknown) => {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          return {
            ...node,
            data: {
              ...node.data,
              config: {
                ...(node.data as Record<string, unknown>).config as Record<string, unknown>,
                [key]: value,
              },
            },
          };
        }
        return node;
      })
    );
  };

  // Save workflow
  const saveWorkflow = async () => {
    if (!currentWorkflow) return;
    try {
      const workflowNodes = nodes.map((node) => ({
        id: node.id,
        type: (node.data as Record<string, unknown>).type as NodeType,
        name: (node.data as Record<string, unknown>).label as string,
        config: (node.data as Record<string, unknown>).config as Record<string, unknown>,
        positionX: node.position.x,
        positionY: node.position.y,
        isEnabled: (node.data as Record<string, unknown>).isEnabled as boolean,
      }));
      const workflowEdges = edges.map((edge) => ({
        id: edge.id,
        sourceNodeId: edge.source,
        targetNodeId: edge.target,
        edgeType: 'default',
      }));
      const response = await fetch(`/api/workflows/${currentWorkflow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: workflowNodes, edges: workflowEdges }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Workflow saved');
        fetchWorkflows();
      } else {
        toast.error('Failed to save workflow');
      }
    } catch (error) {
      toast.error('Failed to save workflow');
    }
  };

  // Handle NL command
  const handleNLCommand = (command: string) => {
    setNewWorkflowName(command.slice(0, 50));
    setNewWorkflowDescription(command);
    setCreateWorkflowModal(true);
  };

  // Handle workflow create from chat
  const handleWorkflowCreateFromChat = (plan: { name: string; description: string }) => {
    setNewWorkflowName(plan.name || 'AI Workflow');
    setNewWorkflowDescription(plan.description || '');
    setCreateWorkflowModal(true);
    setChatOpen(false);
  };

  // Edit workflow
  const handleEditWorkflow = (workflow: WorkflowType) => {
    setCurrentWorkflow(workflow);
    setCurrentView('editor');
  };

  // Filter workflows
  const filteredWorkflows = useMemo(() => {
    if (!searchQuery) return workflows;
    return workflows.filter(
      (w) =>
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [workflows, searchQuery]);

  return (
    <UserLevelProvider>
    <div className="flex h-screen bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header
          currentView={currentView}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onCommandPaletteOpen={() => setCommandPaletteOpen(true)}
          setCurrentView={setCurrentView}
        />

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {/* Dashboard View */}
          {currentView === 'dashboard' && (
            <DashboardView
              workflows={workflows}
              executions={executions}
              stats={stats}
              onCreateWorkflow={() => setCreateWorkflowModal(true)}
              onOpenCommandPalette={() => setCommandPaletteOpen(true)}
              onEditWorkflow={handleEditWorkflow}
              onViewWorkflows={() => setCurrentView('workflows')}
              onViewExecutions={() => setCurrentView('executions')}
            />
          )}

          {/* Workflows View */}
          {currentView === 'workflows' && (
            <WorkflowsView
              workflows={workflows}
              filteredWorkflows={filteredWorkflows}
              onCreateWorkflow={() => setCreateWorkflowModal(true)}
              onOpenCommandPalette={() => setCommandPaletteOpen(true)}
              onEditWorkflow={handleEditWorkflow}
              onExecuteWorkflow={handleExecuteWorkflow}
              onDeleteWorkflow={handleDeleteWorkflow}
            />
          )}

          {/* Editor View */}
          {currentView === 'editor' && (
            <div className="flex h-[calc(100vh-4rem)]">
              {/* Left Panel */}
              <div className="w-80 border-r border-slate-800 bg-slate-900 flex flex-col">
                <div className="p-2 border-b border-slate-800">
                  <UserLevelSelector />
                </div>
                <Tabs value={sidebarTab} onValueChange={(v) => setSidebarTab(v as typeof sidebarTab)}>
                  <TabsList className="w-full bg-slate-800/50 border-b border-slate-700 rounded-none p-0 h-10">
                    <TabsTrigger value="nodes" className="flex-1 rounded-none data-[state=active]:bg-slate-900">
                      <Layers className="h-4 w-4 mr-1" />
                      Nodes
                    </TabsTrigger>
                    <TabsTrigger value="config" className="flex-1 rounded-none data-[state=active]:bg-slate-900">
                      <Settings className="h-4 w-4 mr-1" />
                      Config
                    </TabsTrigger>
                    <TabsTrigger value="execution" className="flex-1 rounded-none data-[state=active]:bg-slate-900">
                      <Activity className="h-4 w-4 mr-1" />
                      Run
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="nodes" className="flex-1 overflow-auto m-0">
                    <NodeLibrary onDragStart={onDragStart} />
                  </TabsContent>

                  <TabsContent value="config" className="flex-1 overflow-auto m-0">
                    <NodeConfigPanel
                      selectedNode={selectedNode}
                      setNodes={setNodes}
                      setSelectedNode={setSelectedNode}
                      updateNodeConfig={updateNodeConfig}
                    />
                  </TabsContent>

                  <TabsContent value="execution" className="flex-1 overflow-auto m-0">
                    <ExecutionPanel
                      currentWorkflow={currentWorkflow}
                      nodes={nodes}
                      edges={edges}
                      onExecute={() => currentWorkflow && handleExecuteWorkflow(currentWorkflow.id)}
                      onSave={saveWorkflow}
                    />
                  </TabsContent>
                </Tabs>
              </div>

              {/* Canvas Area */}
              <div className="flex-1 flex flex-col">
                <EditorToolbar
                  currentWorkflow={currentWorkflow}
                  showMinimap={showMinimap}
                  setShowMinimap={setShowMinimap}
                  showGrid={showGrid}
                  setShowGrid={setShowGrid}
                  onSave={saveWorkflow}
                  onRun={() => currentWorkflow && handleExecuteWorkflow(currentWorkflow.id)}
                  onFitView={() => toast.info('Click Fit View in the graph controls')}
                  onAddNode={() => setSidebarTab('nodes')}
                  onBack={() => setCurrentView('workflows')}
                />
                <div
                  ref={reactFlowWrapper}
                  className="flex-1"
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                >
                  <WorkflowCanvas
                    nodes={nodes}
                    edges={edges}
                    setNodes={setNodes}
                    setEdges={setEdges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeClick={onNodeClick}
                    showMinimap={showMinimap}
                    showGrid={showGrid}
                    currentWorkflow={currentWorkflow}
                    reactFlowWrapper={reactFlowWrapper}
                  />
                </div>
              </div>

              {/* Chat Panel (side panel) */}
              {chatOpen && (
                <div className="w-96 border-l border-slate-800 bg-slate-900">
                  <ChatInterface
                    onWorkflowCreate={handleWorkflowCreateFromChat}
                    onMinimize={() => setChatOpen(false)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Executions View */}
          {currentView === 'executions' && <ExecutionsView executions={executions} />}

          {/* Connectors View */}
          {currentView === 'connectors' && <ConnectorsView />}

          {/* Security View */}
          {currentView === 'security' && <SecurityView />}

          {/* Settings View */}
          {currentView === 'settings' && <SettingsView />}
        </div>
      </main>

      {/* Floating Chat Button */}
      {!chatOpen && currentView === 'editor' && (
        <Button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 shadow-lg shadow-violet-500/20 z-40"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      )}

      {/* Floating AI Command Button (non-editor views) */}
      {currentView !== 'editor' && (
        <Button
          onClick={() => setCommandPaletteOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 shadow-lg shadow-violet-500/20 z-40"
        >
          <Sparkles className="h-6 w-6" />
        </Button>
      )}

      {/* Command Palette */}
      <EnhancedCommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onCommand={handleNLCommand}
        onNavigate={(view) => setCurrentView(view as ViewMode)}
      />

      {/* Create Workflow Modal */}
      <Dialog open={createWorkflowModal} onOpenChange={setCreateWorkflowModal}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle>Create New Workflow</DialogTitle>
            <DialogDescription>
              Give your workflow a name and description to get started.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newWorkflowName}
                onChange={(e) => setNewWorkflowName(e.target.value)}
                placeholder="My Awesome Workflow"
                className="mt-1 bg-slate-800 border-slate-700"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newWorkflowDescription}
                onChange={(e) => setNewWorkflowDescription(e.target.value)}
                placeholder="What does this workflow do?"
                className="mt-1 bg-slate-800 border-slate-700"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateWorkflowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateWorkflow} disabled={isLoading || !newWorkflowName.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Workflow
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </UserLevelProvider>
  );
}

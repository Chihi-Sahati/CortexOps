'use client';

import React, { useCallback, type DragEvent } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  Panel,
  addEdge,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CustomNode } from './CustomNode';
import { Workflow } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import type { Workflow as WorkflowType } from '@/types';

const nodeTypes = { custom: CustomNode };

interface WorkflowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onNodeClick?: NodeMouseHandler;
  showMinimap: boolean;
  showGrid: boolean;
  currentWorkflow: WorkflowType | null;
  reactFlowWrapper: React.RefObject<HTMLDivElement | null>;
}

export function WorkflowCanvas({
  nodes,
  edges,
  setNodes,
  setEdges,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  showMinimap,
  showGrid,
  currentWorkflow,
  reactFlowWrapper,
}: WorkflowCanvasProps) {

  const onConnect: OnConnect = useCallback(
    (params) => {
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow-type');
      const label = event.dataTransfer.getData('application/reactflow-label');
      const nodeConfig = event.dataTransfer.getData('application/reactflow-config');

      if (!type || !label) return;

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!reactFlowBounds) return;

      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type: 'custom',
        position,
        data: {
          label,
          type,
          config: JSON.parse(nodeConfig || '{}'),
          isEnabled: true,
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowWrapper, setNodes]
  );

  const hasNodes = nodes.length > 0;

  return (
    <div className="flex-1 h-full relative" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        className="bg-slate-950/20"
      >
        {showGrid && (
          <Background 
            variant={BackgroundVariant.Dots} 
            gap={24} 
            size={1} 
            color="rgba(148, 163, 184, 0.15)" 
          />
        )}
        
        <Controls 
          className="!bg-slate-900 !border-slate-800 !shadow-2xl [&_button]:!border-slate-800 [&_button:hover]:!bg-slate-800" 
        />
        
        {showMinimap && (
          <MiniMap
            nodeColor={(node) => {
              if (node.type === 'custom') return '#6366f1';
              return '#475569';
            }}
            maskColor="rgba(2, 6, 23, 0.8)"
            className="!bg-slate-900/80 !backdrop-blur-md !border-slate-800 !rounded-xl !shadow-2xl"
          />
        )}

        {!hasNodes && (
          <Panel position="top-left" className="w-full h-full pointer-events-none flex items-center justify-center">
            <EmptyState
              icon={Workflow}
              title="Your workflow is empty"
              description="Drag and drop nodes from the library or use the AI command bar to generate your first flow."
              className="mt-[-10vh]"
            />
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}

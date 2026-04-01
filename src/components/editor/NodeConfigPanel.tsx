'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Trash2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { getNodeDefinition } from '@/lib/node-registry';
import { useUserLevel } from './UserLevelContext';
import type { Node } from '@xyflow/react';
import type { WorkflowNodeData } from '@/types/workflow';
import type { NodeType } from '@/types';

interface NodeConfigPanelProps {
  selectedNode: Node | null;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setSelectedNode: React.Dispatch<React.SetStateAction<Node | null>>;
  updateNodeConfig: (nodeId: string, key: string, value: unknown) => void;
}

export function NodeConfigPanel({
  selectedNode,
  setNodes,
  setSelectedNode,
  updateNodeConfig,
}: NodeConfigPanelProps) {
  const { isSimple, showAdvancedFields } = useUserLevel();
  const [showAllFields, setShowAllFields] = React.useState(false);

  if (!selectedNode) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="text-center">
          <p className="text-sm text-slate-500">Select a node to configure it</p>
          {isSimple && (
            <p className="text-xs text-slate-600 mt-1">Click any node on the canvas</p>
          )}
        </div>
      </div>
    );
  }

  const nodeData = (selectedNode?.data as WorkflowNodeData) || {
    label: '',
    type: '' as NodeType,
    config: {} as Record<string, unknown>,
    enabled: true,
  };
  const nodeDef = getNodeDefinition(nodeData.type as unknown as any as NodeType);
  const configSchema = nodeDef?.configSchema;
  const allProperties = configSchema?.properties ? Object.entries(configSchema.properties) : [];

  const requiredKeys = ['url', 'method', 'endpoint', 'model', 'prompt', 'channel', 'event', 'type'];
  const essentialProperties = allProperties.filter(([key]) =>
    requiredKeys.some((rk) => key.toLowerCase().includes(rk))
  );

  const displayProperties =
    isSimple && !showAllFields
      ? essentialProperties.length > 0
        ? essentialProperties
        : allProperties.slice(0, 3)
      : allProperties;

  const handleNameChange = (value: string) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNode.id
          ? { ...n, data: { ...n.data, label: value } }
          : n
      )
    );
  };

  const handleDeleteNode = () => {
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setSelectedNode(null);
  };

  const handleFieldChange = (key: string, value: unknown) => {
    updateNodeConfig(selectedNode.id, key, value);
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">Node Configuration</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-400 hover:text-slate-200"
            onClick={() => setSelectedNode(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Separator className="bg-slate-800" />

        <div className="space-y-2">
          <Label htmlFor="node-name" className="text-xs text-slate-400">
            Node Name
          </Label>
          <Input
            id="node-name"
            value={nodeData.label}
            onChange={(e) => handleNameChange(e.target.value)}
            className="bg-slate-900 border-slate-700 text-slate-100 h-9"
          />
        </div>

        {!isSimple && (
          <div className="text-xs text-slate-500">
            Type: <span className="text-slate-300">{nodeData.type}</span>
          </div>
        )}

        <Separator className="bg-slate-800" />

        {displayProperties.map(([key, schema]) => {
          const currentValue = nodeData.config[key];

          if (schema.enum) {
            return (
              <div key={key} className="space-y-2">
                <Label className="text-xs text-slate-400">
                  {schema.title || key}
                </Label>
                <Select
                  value={String(currentValue ?? schema.default ?? '')}
                  onValueChange={(val) => handleFieldChange(key, val)}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-100 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {schema.enum.map((opt) => (
                      <SelectItem
                        key={opt}
                        value={opt}
                        className="text-slate-100 focus:bg-slate-800 focus:text-slate-100"
                      >
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {schema.description && showAdvancedFields && (
                  <p className="text-[10px] text-slate-500">{schema.description}</p>
                )}
              </div>
            );
          }

          if (schema.type === 'boolean') {
            return (
              <div key={key} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`config-${key}`}
                  checked={Boolean(currentValue ?? schema.default ?? false)}
                  onChange={(e) => handleFieldChange(key, e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 accent-indigo-500"
                />
                <Label htmlFor={`config-${key}`} className="text-xs text-slate-400">
                  {schema.title || key}
                </Label>
              </div>
            );
          }

          if (schema.type === 'number') {
            return (
              <div key={key} className="space-y-2">
                <Label className="text-xs text-slate-400">
                  {schema.title || key}
                </Label>
                <Input
                  type="number"
                  value={Number(currentValue ?? schema.default ?? 0)}
                  onChange={(e) => handleFieldChange(key, Number(e.target.value))}
                  className="bg-slate-900 border-slate-700 text-slate-100 h-9"
                />
                {schema.description && showAdvancedFields && (
                  <p className="text-[10px] text-slate-500">{schema.description}</p>
                )}
              </div>
            );
          }

          if (schema.type === 'object' || schema.type === 'array') {
            if (isSimple && !showAllFields) return null;
            return (
              <div key={key} className="space-y-2">
                <Label className="text-xs text-slate-400">
                  {schema.title || key}
                </Label>
                <Textarea
                  value={JSON.stringify(currentValue ?? schema.default ?? (schema.type === 'array' ? [] : {}), null, 2)}
                  onChange={(e) => {
                    try {
                      handleFieldChange(key, JSON.parse(e.target.value));
                    } catch {
                      /* ignore invalid JSON while typing */
                    }
                  }}
                  className="bg-slate-900 border-slate-700 text-slate-100 min-h-[100px] font-mono text-xs"
                />
                {schema.description && (
                  <p className="text-[10px] text-slate-500">{schema.description}</p>
                )}
              </div>
            );
          }

          return (
            <div key={key} className="space-y-2">
              <Label className="text-xs text-slate-400">
                {schema.title || key}
              </Label>
              <Input
                value={String(currentValue ?? schema.default ?? '')}
                onChange={(e) => handleFieldChange(key, e.target.value)}
                className="bg-slate-900 border-slate-700 text-slate-100 h-9"
              />
              {schema.description && showAdvancedFields && (
                <p className="text-[10px] text-slate-500">{schema.description}</p>
              )}
            </div>
          );
        })}

        {isSimple && allProperties.length > displayProperties.length && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-slate-400"
            onClick={() => setShowAllFields(!showAllFields)}
          >
            {showAllFields ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Show {allProperties.length - displayProperties.length} More Fields
              </>
            )}
          </Button>
        )}

        <Separator className="bg-slate-800" />

        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={handleDeleteNode}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Node
        </Button>
      </div>
    </ScrollArea>
  );
}

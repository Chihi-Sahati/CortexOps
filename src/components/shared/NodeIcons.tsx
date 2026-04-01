'use client';

import React from 'react';
import {
  Webhook,
  Clock,
  Zap,
  Play,
  Globe,
  Code,
  Brain,
  Shuffle,
  Filter,
  Timer,
  GitBranch,
  Split,
  Repeat,
  Send,
  Bell,
  Database,
  ArrowRight,
  Settings,
} from 'lucide-react';
import { getNodeDefinition } from '@/lib/node-registry';
import type { NodeType } from '@/types';

export const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Webhook,
  Clock,
  Zap,
  Play,
  Globe,
  Code,
  Brain,
  Shuffle,
  Filter,
  Timer,
  GitBranch,
  Split,
  Repeat,
  Send,
  Bell,
  Database,
  ArrowRight,
  Cog: Settings,
};

export function getNodeIcon(nodeType: NodeType) {
  const nodeDef = getNodeDefinition(nodeType);
  return iconMap[nodeDef?.icon || 'Settings'] || Settings;
}

export function getNodeColor(nodeType: NodeType) {
  const nodeDef = getNodeDefinition(nodeType);
  return nodeDef?.color || '#6B7280';
}

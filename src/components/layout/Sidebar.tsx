'use client';

import React from 'react';
import {
  LayoutDashboard,
  Workflow,
  Activity,
  Plug,
  Shield,
  Settings,
  ChevronRight,
  Brain,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type ViewMode = 'dashboard' | 'workflows' | 'editor' | 'executions' | 'connectors' | 'security' | 'settings';

interface SidebarProps {
  currentView: ViewMode;
  setCurrentView: (view: ViewMode) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const navItems = [
  { id: 'dashboard' as ViewMode, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'workflows' as ViewMode, label: 'Workflows', icon: Workflow },
  { id: 'executions' as ViewMode, label: 'Executions', icon: Activity },
  { id: 'connectors' as ViewMode, label: 'Connectors', icon: Plug },
  { id: 'security' as ViewMode, label: 'Security', icon: Shield },
  { id: 'settings' as ViewMode, label: 'Settings', icon: Settings },
];

export function Sidebar({ currentView, setCurrentView, sidebarOpen, setSidebarOpen }: SidebarProps) {
  return (
    <aside
      className={`${
        sidebarOpen ? 'w-64' : 'w-16'
      } flex flex-col border-r border-slate-800 bg-slate-900 transition-all duration-300`}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800">
        {sidebarOpen && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              CortexOps
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-slate-400 hover:text-slate-200"
        >
          <ChevronRight
            className={`h-4 w-4 transition-transform ${sidebarOpen ? 'rotate-180' : ''}`}
          />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <Button
            key={item.id}
            variant={currentView === item.id ? 'secondary' : 'ghost'}
            className={`w-full justify-start gap-3 ${
              currentView === item.id
                ? 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            onClick={() => setCurrentView(item.id)}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {sidebarOpen && <span>{item.label}</span>}
          </Button>
        ))}
      </nav>

      {/* User section */}
      {sidebarOpen && (
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <span className="text-sm font-medium">JD</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">John Doe</p>
              <p className="text-xs text-slate-400 truncate">Admin</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

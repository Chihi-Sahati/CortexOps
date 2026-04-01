'use client';

import React from 'react';
import {
  Search,
  Bell,
  Settings,
  Command,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type ViewMode = 'dashboard' | 'workflows' | 'editor' | 'executions' | 'connectors' | 'security' | 'settings';

interface HeaderProps {
  currentView: ViewMode;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onCommandPaletteOpen: () => void;
  setCurrentView: (view: ViewMode) => void;
}

const viewLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  workflows: 'Workflows',
  editor: 'Editor',
  executions: 'Executions',
  connectors: 'Connectors',
  security: 'Security',
  settings: 'Settings',
};

export function Header({
  currentView,
  searchQuery,
  setSearchQuery,
  onCommandPaletteOpen,
  setCurrentView,
}: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between px-6 border-b border-slate-800 bg-slate-900/50">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold">
          {viewLabels[currentView] || 'Dashboard'}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-64 bg-slate-800 border-slate-700 focus:border-indigo-500"
          />
        </div>

        {/* Command Palette Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onCommandPaletteOpen}
          className="gap-2 text-slate-400 border-slate-700"
        >
          <Command className="h-4 w-4" />
          <span className="hidden sm:inline">Command</span>
          <kbd className="hidden sm:inline px-1.5 py-0.5 bg-slate-700 rounded text-xs">⌘K</kbd>
        </Button>

        {/* AI Command */}
        <Button
          variant="outline"
          size="sm"
          onClick={onCommandPaletteOpen}
          className="gap-2 border-violet-500/50 text-violet-400 hover:bg-violet-500/10"
        >
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline">AI</span>
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative text-slate-400">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] flex items-center justify-center">
            3
          </span>
        </Button>

        {/* Settings */}
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-400"
          onClick={() => setCurrentView('settings')}
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}

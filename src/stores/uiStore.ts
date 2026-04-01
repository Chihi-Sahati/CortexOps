// CortexOps - UI Store
// UI state management

import { create } from 'zustand';

type ViewMode = 'canvas' | 'json' | 'split';
type SidebarTab = 'nodes' | 'config' | 'execution' | 'debug';

interface UIState {
  // Sidebar
  sidebarOpen: boolean;
  sidebarTab: SidebarTab;
  sidebarWidth: number;
  
  // Canvas
  viewMode: ViewMode;
  zoom: number;
  showMinimap: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  
  // Command Palette
  commandPaletteOpen: boolean;
  
  // Modals
  createWorkflowModalOpen: boolean;
  deleteConfirmModalOpen: boolean;
  settingsModalOpen: boolean;
  
  // Notifications
  toasts: Toast[];
  
  // Actions
  toggleSidebar: () => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setSidebarWidth: (width: number) => void;
  setViewMode: (mode: ViewMode) => void;
  setZoom: (zoom: number) => void;
  toggleMinimap: () => void;
  toggleGrid: () => void;
  toggleSnapToGrid: () => void;
  toggleCommandPalette: () => void;
  openCreateWorkflowModal: () => void;
  closeCreateWorkflowModal: () => void;
  openDeleteConfirmModal: () => void;
  closeDeleteConfirmModal: () => void;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}

export const useUIStore = create<UIState>((set) => ({
  // Sidebar defaults
  sidebarOpen: true,
  sidebarTab: 'nodes',
  sidebarWidth: 320,
  
  // Canvas defaults
  viewMode: 'canvas',
  zoom: 1,
  showMinimap: true,
  showGrid: true,
  snapToGrid: true,
  
  // Command Palette
  commandPaletteOpen: false,
  
  // Modals
  createWorkflowModalOpen: false,
  deleteConfirmModalOpen: false,
  settingsModalOpen: false,
  
  // Notifications
  toasts: [],

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  
  setViewMode: (mode) => set({ viewMode: mode }),
  
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(2, zoom)) }),
  
  toggleMinimap: () => set((state) => ({ showMinimap: !state.showMinimap })),
  
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  
  toggleSnapToGrid: () => set((state) => ({ snapToGrid: !state.snapToGrid })),
  
  toggleCommandPalette: () => set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
  
  openCreateWorkflowModal: () => set({ createWorkflowModalOpen: true }),
  
  closeCreateWorkflowModal: () => set({ createWorkflowModalOpen: false }),
  
  openDeleteConfirmModal: () => set({ deleteConfirmModalOpen: true }),
  
  closeDeleteConfirmModal: () => set({ deleteConfirmModalOpen: false }),
  
  openSettingsModal: () => set({ settingsModalOpen: true }),
  
  closeSettingsModal: () => set({ settingsModalOpen: false }),
  
  addToast: (toast) => set((state) => ({
    toasts: [...state.toasts, { ...toast, id: crypto.randomUUID() }],
  })),
  
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  })),
}));

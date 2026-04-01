// CortexOps - WebSocket/SSE Hooks for Real-time Updates
'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

// ==========================================
// Types
// ==========================================
export type WSEventType =
  | 'execution.started'
  | 'execution.progress'
  | 'execution.completed'
  | 'execution.failed'
  | 'step.started'
  | 'step.completed'
  | 'step.failed'
  | 'agent.thought'
  | 'agent.action'
  | 'agent.observation'
  | 'self_heal.started'
  | 'self_heal.completed'
  | 'hitl.required'
  | 'error'
  | 'connected'
  | 'disconnected'

export interface WSEvent {
  type: WSEventType
  timestamp: string
  data: Record<string, unknown>
}

export interface UseWorkflowSocketOptions {
  workflowId?: string
  executionId?: string
  onEvent?: (event: WSEvent) => void
  autoReconnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

export interface UseWorkflowSocketReturn {
  isConnected: boolean
  isReconnecting: boolean
  events: WSEvent[]
  lastEvent: WSEvent | null
  error: string | null
  connect: () => void
  disconnect: () => void
  clearEvents: () => void
}

// ==========================================
// SSE Hook (Recommended for Next.js)
// ==========================================
export function useWorkflowSSE(options: UseWorkflowSocketOptions): UseWorkflowSocketReturn {
  const {
    workflowId,
    executionId,
    onEvent,
    autoReconnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 10,
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [events, setEvents] = useState<WSEvent[]>([])
  const [lastEvent, setLastEvent] = useState<WSEvent | null>(null)
  const [error, setError] = useState<string | null>(null)

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectCountRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const connectRef = useRef<() => void>(() => {})

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const params = new URLSearchParams()
    if (workflowId) params.set('workflowId', workflowId)
    if (executionId) params.set('executionId', executionId)

    const url = `/api/events?${params.toString()}`
    const eventSource = new EventSource(url)

    eventSource.onopen = () => {
      setIsConnected(true)
      setIsReconnecting(false)
      setError(null)
      reconnectCountRef.current = 0
    }

    eventSource.onmessage = (event) => {
      try {
        const wsEvent: WSEvent = JSON.parse(event.data)
        setLastEvent(wsEvent)
        setEvents((prev) => [...prev.slice(-100), wsEvent]) // Keep last 100 events
        onEvent?.(wsEvent)
      } catch (err) {
        console.error('Failed to parse SSE event:', err)
      }
    }

    eventSource.onerror = () => {
      setIsConnected(false)
      eventSource.close()

      if (autoReconnect && reconnectCountRef.current < maxReconnectAttempts) {
        setIsReconnecting(true)
        reconnectCountRef.current++
        reconnectTimeoutRef.current = setTimeout(() => {
          connectRef.current();
        }, reconnectInterval * Math.pow(1.5, reconnectCountRef.current));
      } else {
        setError('Connection failed after max reconnect attempts')
        setIsReconnecting(false)
      }
    }

    eventSourceRef.current = eventSource
  }, [workflowId, executionId, onEvent, autoReconnect, reconnectInterval, maxReconnectAttempts])

  // Keep connectRef in sync with the latest connect callback
  // without causing it to be in the useCallback dependency list
  useEffect(() => {
    connectRef.current = connect
  })

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsConnected(false)
    setIsReconnecting(false)
  }, [])

  const clearEvents = useCallback(() => {
    setEvents([])
    setLastEvent(null)
  }, [])

  useEffect(() => {
    connect()
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    isConnected,
    isReconnecting,
    events,
    lastEvent,
    error,
    connect,
    disconnect,
    clearEvents,
  }
}

// ==========================================
// Execution Progress Hook
// ==========================================
export interface ExecutionProgress {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  currentStep: number
  totalSteps: number
  currentStepName: string
  progress: number // 0-100
  messages: string[]
  error: string | null
}

export function useExecutionProgress(executionId: string | null) {
  const [progress, setProgress] = useState<ExecutionProgress>({
    status: 'pending',
    currentStep: 0,
    totalSteps: 0,
    currentStepName: '',
    progress: 0,
    messages: [],
    error: null,
  })

  const handleEvent = useCallback((event: WSEvent) => {
    switch (event.type) {
      case 'execution.started':
        setProgress((prev) => ({
          ...prev,
          status: 'running',
          totalSteps: (event.data.totalSteps as number) || 0,
          messages: [...prev.messages, `Execution started with ${event.data.totalSteps} steps`],
        }))
        break

      case 'step.started':
        setProgress((prev) => ({
          ...prev,
          currentStep: (event.data.stepNumber as number) || prev.currentStep + 1,
          currentStepName: (event.data.nodeName as string) || '',
          progress: Math.round(
            (((event.data.stepNumber as number) || prev.currentStep) / prev.totalSteps) * 100
          ),
          messages: [...prev.messages, `Step ${event.data.stepNumber}: ${event.data.nodeName}`],
        }))
        break

      case 'step.completed':
        setProgress((prev) => ({
          ...prev,
          messages: [...prev.messages, `Step completed: ${event.data.nodeName}`],
        }))
        break

      case 'step.failed':
        setProgress((prev) => ({
          ...prev,
          status: 'failed',
          error: (event.data.error as string) || 'Step failed',
          messages: [...prev.messages, `Step failed: ${event.data.error}`],
        }))
        break

      case 'execution.completed':
        setProgress((prev) => ({
          ...prev,
          status: 'completed',
          progress: 100,
          messages: [...prev.messages, 'Execution completed successfully'],
        }))
        break

      case 'execution.failed':
        setProgress((prev) => ({
          ...prev,
          status: 'failed',
          error: (event.data.error as string) || 'Execution failed',
          messages: [...prev.messages, `Execution failed: ${event.data.error}`],
        }))
        break

      case 'agent.thought':
        setProgress((prev) => ({
          ...prev,
          messages: [...prev.messages, `[Agent] ${(event.data.thought as string)?.substring(0, 100)}`],
        }))
        break
    }
  }, [])

  const { isConnected, isReconnecting, error } = useWorkflowSSE({
    executionId: executionId || undefined,
    onEvent: handleEvent,
    autoReconnect: executionId !== null,
  })

  return {
    ...progress,
    isConnected,
    isReconnecting,
    connectionError: error,
  }
}

// ==========================================
// Notifications Hook
// ==========================================
export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const handleEvent = useCallback((event: WSEvent) => {
    if (event.type === 'error') {
      setNotifications((prev) => [
        {
          id: crypto.randomUUID(),
          type: 'error',
          title: 'Error',
          message: (event.data.message as string) || 'An error occurred',
          timestamp: new Date(),
          read: false,
        },
        ...prev.slice(0, 49), // Keep max 50 notifications
      ])
    } else if (event.type === 'execution.completed') {
      setNotifications((prev) => [
        {
          id: crypto.randomUUID(),
          type: 'success',
          title: 'Execution Completed',
          message: `Workflow execution completed successfully`,
          timestamp: new Date(),
          read: false,
          actionUrl: `/executions/${event.data.executionId}`,
        },
        ...prev.slice(0, 49),
      ])
    } else if (event.type === 'execution.failed') {
      setNotifications((prev) => [
        {
          id: crypto.randomUUID(),
          type: 'error',
          title: 'Execution Failed',
          message: (event.data.error as string) || 'Workflow execution failed',
          timestamp: new Date(),
          read: false,
          actionUrl: `/executions/${event.data.executionId}`,
        },
        ...prev.slice(0, 49),
      ])
    }
  }, [])

  useWorkflowSSE({ onEvent: handleEvent })

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  }
}

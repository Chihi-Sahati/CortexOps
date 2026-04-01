// CortexOps - Server-Sent Events (SSE) Endpoint
// Real-time event streaming for workflow executions
import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// In-memory event store for demo (use Redis in production)
const eventStore = new Map<string, Array<{ type: string; data: unknown; timestamp: string }>>()
const clients = new Set<ReadableStreamDefaultController>()

// Broadcast event to all connected clients
export function broadcastEvent(event: {
  type: string
  data: Record<string, unknown>
  workflowId?: string
  executionId?: string
}) {
  const fullEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  }

  const eventData = `data: ${JSON.stringify(fullEvent)}\n\n`

  // Store event
  const key = event.workflowId || event.executionId || 'global'
  const events = eventStore.get(key) || []
  events.push(fullEvent)
  if (events.length > 100) events.shift()
  eventStore.set(key, events)

  // Broadcast to all clients
  for (const controller of clients) {
    try {
      controller.enqueue(new TextEncoder().encode(eventData))
    } catch {
      clients.delete(controller)
    }
  }
}

// GET /api/events - SSE endpoint
export async function GET(request: NextRequest) {
  // Authenticate via token from query param or cookie
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

  if (!token) {
    return new Response('Unauthorized', { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const workflowId = searchParams.get('workflowId')
  const executionId = searchParams.get('executionId')

  const stream = new ReadableStream({
    start(controller) {
      // Add client to set
      clients.add(controller)

      // Send initial connection event
      const connectEvent = `data: ${JSON.stringify({
        type: 'connected',
        timestamp: new Date().toISOString(),
        data: { workflowId, executionId },
      })}\n\n`
      controller.enqueue(new TextEncoder().encode(connectEvent))

      // Send recent events if any
      const key = workflowId || executionId
      if (key) {
        const recentEvents = eventStore.get(key) || []
        for (const event of recentEvents.slice(-10)) {
          const eventData = `data: ${JSON.stringify(event)}\n\n`
          controller.enqueue(new TextEncoder().encode(eventData))
        }
      }

      // Keep connection alive with heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(': heartbeat\n\n'))
        } catch {
          clearInterval(heartbeat)
          clients.delete(controller)
        }
      }, 30000)

      // Clean up on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        clients.delete(controller)
        try {
          controller.close()
        } catch {
          // Already closed
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

// CortexOps - Internal AI API
// Service-to-service endpoints for AI operations
import { NextRequest, NextResponse } from 'next/server'
import { aiEngine } from '@/lib/ai-client'
import { db } from '@/lib/db'
import { hashValue } from '@/lib/crypto'

// JWT validation for internal service calls
function validateInternalToken(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return false

  const token = authHeader.slice(7)
  const internalSecret = process.env.INTERNAL_API_SECRET || 'internal-secret-change-me'

  // Simple token validation for internal services
  // In production, use proper JWT validation
  return token === internalSecret
}

// POST /api/internal/ai/chat - Process AI chat
export async function POST(request: NextRequest) {
  if (!validateInternalToken(request)) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid internal token' } },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'plan': {
        const { task, connectors, tools, context } = body
        const result = await aiEngine.plan(task, connectors || [], tools || [], context || {})
        return NextResponse.json({ success: true, data: result })
      }

      case 'reason': {
        const { step, context, errorHistory, connectors } = body
        const result = await aiEngine.reason(step, context || {}, errorHistory || [], connectors || [])
        return NextResponse.json({ success: true, data: result })
      }

      case 'execute': {
        const { action: execAction, strategy, timeout } = body
        const result = await aiEngine.execute(execAction, strategy, timeout)
        return NextResponse.json({ success: true, data: result })
      }

      case 'validate': {
        const { expected, actual, step } = body
        const result = await aiEngine.validate(expected, actual, step)
        return NextResponse.json({ success: true, data: result })
      }

      case 'orchestrate': {
        const { task, connectors, context, maxIterations } = body
        const result = await aiEngine.orchestrate(task, connectors || [], context || {}, maxIterations)
        return NextResponse.json({ success: true, data: result })
      }

      case 'security_analyze': {
        const { code, language } = body
        const result = await aiEngine.analyzeCode(code, language || 'python')
        return NextResponse.json({ success: true, data: result })
      }

      case 'connector_diagnose': {
        const { connectorId, connectorType, error } = body
        const result = await aiEngine.diagnoseConnector(connectorId, connectorType, error)
        return NextResponse.json({ success: true, data: result })
      }

      case 'connector_heal': {
        const { connectorId, diagnosis } = body
        const result = await aiEngine.healConnector(connectorId, diagnosis)
        return NextResponse.json({ success: true, data: result })
      }

      default:
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_ACTION', message: `Unknown action: ${action}` } },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Internal AI API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'AI operation failed' } },
      { status: 500 }
    )
  }
}

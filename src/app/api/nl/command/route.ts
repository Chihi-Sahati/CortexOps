// CortexOps - Natural Language Command API (LLM-Powered)
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission, AuthError } from '@/lib/auth-utils'
import { aiEngine } from '@/lib/ai-client'
import { db } from '@/lib/db'
import type { NodeType } from '@/types'

const commandSchema = z.object({
  command: z.string().min(1, 'Command is required').max(1000, 'Command too long'),
  context: z.record(z.string(), z.unknown()).optional(),
})

// POST /api/nl/command - Process natural language command
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'nl', 'create')

    const body = await request.json()
    const result = commandSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: result.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      )
    }

    const { command, context } = result.data

    // Try AI-powered parsing first, fall back to pattern matching
    let suggestion
    try {
      suggestion = await aiEngine.parseNLCommand(command)
    } catch {
      // Fallback to pattern-based parsing
      suggestion = await parseNLCommandFallback(command, context || {})
    }

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'nl.command',
        resourceType: 'nl_command',
        details: {
          command: command.substring(0, 200),
          planSteps: suggestion.plan.length,
          confidence: suggestion.confidence,
        },
        riskLevel: suggestion.risk_level,
      },
    })

    return NextResponse.json({
      success: true,
      data: suggestion,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      )
    }
    console.error('Error processing NL command:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to process command' } },
      { status: 500 }
    )
  }
}

// GET /api/nl/command/suggest - Get command suggestions
export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'nl', 'read')

    const searchParams = request.nextUrl.searchParams
    const partial = searchParams.get('partial') || ''

    let suggestions
    try {
      suggestions = await aiEngine.getSuggestions(partial)
    } catch {
      // Fallback suggestions
      suggestions = getSuggestionsFallback(partial)
    }

    return NextResponse.json({ success: true, data: suggestions })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      )
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get suggestions' } },
      { status: 500 }
    )
  }
}

// ==========================================
// Fallback Pattern-Based Parser
// ==========================================
async function parseNLCommandFallback(
  command: string,
  _context: Record<string, unknown>
) {
  const lowerCommand = command.toLowerCase()
  const plan: Array<{ order: number; nodeType: NodeType; description: string; dependencies: string[]; config: Record<string, unknown> }> = []
  let order = 1

  // Detect trigger
  if (lowerCommand.includes('every day') || lowerCommand.includes('daily') || lowerCommand.includes('each day')) {
    plan.push({
      order: order++,
      nodeType: 'trigger.cron',
      description: 'Daily trigger at specified time',
      dependencies: [],
      config: { cronExpression: '0 9 * * *', timezone: 'UTC' },
    })
  } else if (lowerCommand.includes('webhook') || lowerCommand.includes('when called')) {
    plan.push({
      order: order++,
      nodeType: 'trigger.webhook',
      description: 'Webhook trigger endpoint',
      dependencies: [],
      config: { method: 'POST', path: '/webhook/custom' },
    })
  } else if (lowerCommand.includes('every') && (lowerCommand.includes('minute') || lowerCommand.includes('hour'))) {
    plan.push({
      order: order++,
      nodeType: 'trigger.cron',
      description: 'Periodic trigger',
      dependencies: [],
      config: { cronExpression: '*/5 * * * *' },
    })
  } else {
    plan.push({
      order: order++,
      nodeType: 'trigger.manual',
      description: 'Manual trigger',
      dependencies: [],
      config: {},
    })
  }

  // Detect actions
  if (lowerCommand.includes('database') || lowerCommand.includes('query') || lowerCommand.includes('sql')) {
    plan.push({
      order: order++,
      nodeType: 'action.code',
      description: 'Execute database query',
      dependencies: [],
      config: { language: 'python', code: '# Database query code here' },
    })
  }

  if (lowerCommand.includes('api') || lowerCommand.includes('fetch') || lowerCommand.includes('get') || lowerCommand.includes('call')) {
    plan.push({
      order: order++,
      nodeType: 'action.http',
      description: 'Make HTTP request',
      dependencies: [],
      config: { method: 'GET', url: '' },
    })
  }

  if (lowerCommand.includes('ai') || lowerCommand.includes('analyze') || lowerCommand.includes('summarize') || lowerCommand.includes('process')) {
    plan.push({
      order: order++,
      nodeType: 'action.ai',
      description: 'AI processing',
      dependencies: [],
      config: { model: 'gpt-4o-mini', prompt: 'Process the input data' },
    })
  }

  if (lowerCommand.includes('transform') || lowerCommand.includes('map') || lowerCommand.includes('convert')) {
    plan.push({
      order: order++,
      nodeType: 'action.transform',
      description: 'Transform data',
      dependencies: [],
      config: { expression: '' },
    })
  }

  if (lowerCommand.includes('filter') || lowerCommand.includes('where') || lowerCommand.includes('only')) {
    plan.push({
      order: order++,
      nodeType: 'action.filter',
      description: 'Filter data',
      dependencies: [],
      config: { conditions: [], mode: 'all' },
    })
  }

  // Detect output
  if (lowerCommand.includes('slack') || lowerCommand.includes('notify') || lowerCommand.includes('send message')) {
    plan.push({
      order: order++,
      nodeType: 'output.notification',
      description: 'Send Slack notification',
      dependencies: [],
      config: { channel: 'slack', message: '' },
    })
  } else if (lowerCommand.includes('email') || lowerCommand.includes('mail')) {
    plan.push({
      order: order++,
      nodeType: 'output.notification',
      description: 'Send email notification',
      dependencies: [],
      config: { channel: 'email', message: '' },
    })
  } else if (lowerCommand.includes('save') || lowerCommand.includes('store')) {
    plan.push({
      order: order++,
      nodeType: 'output.storage',
      description: 'Store data',
      dependencies: [],
      config: { destination: 'database', path: '' },
    })
  } else if (!plan.some((p) => p.nodeType.startsWith('output.'))) {
    plan.push({
      order: order++,
      nodeType: 'output.response',
      description: 'Return response',
      dependencies: [],
      config: { statusCode: 200 },
    })
  }

  // Calculate estimates
  const estimatedDuration = plan.length * 2
  const estimatedCost = plan.filter((p) => p.nodeType === 'action.ai').length * 0.001
  const hasCodeNode = plan.some((p) => p.nodeType === 'action.code')
  const hasExternalAPI = plan.some((p) => p.nodeType === 'action.http')
  const riskLevel = hasCodeNode || hasExternalAPI ? 'medium' : 'low'

  return {
    plan,
    estimated_duration: estimatedDuration,
    estimated_cost: estimatedCost,
    risk_level: riskLevel,
    confidence: 0.75,
    original_command: command,
  }
}

// ==========================================
// Fallback Suggestions
// ==========================================
function getSuggestionsFallback(partial: string) {
  const suggestions = [
    { type: 'trigger', text: 'Every day at 9 AM, fetch data and send to Slack' },
    { type: 'trigger', text: 'When webhook is called, process data with AI' },
    { type: 'action', text: 'Fetch data from API and analyze with AI' },
    { type: 'action', text: 'Query database and send email report' },
    { type: 'action', text: 'Transform JSON data and store in database' },
    { type: 'output', text: 'Send notification to Slack channel' },
    { type: 'output', text: 'Save results to database' },
  ]

  const filtered = partial
    ? suggestions.filter((s) => s.text.toLowerCase().includes(partial.toLowerCase()))
    : suggestions

  return {
    suggestions: filtered.slice(0, 5),
    completions: filtered.map((s) => s.text),
  }
}

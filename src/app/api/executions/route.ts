// CortexOps - Executions API
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, AuthError } from '@/lib/auth-utils'

// GET /api/executions - List all executions
export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'executions', 'read')

    const searchParams = request.nextUrl.searchParams
    const cursor = searchParams.get('cursor')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const status = searchParams.get('status')
    const workflowId = searchParams.get('workflowId')

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (workflowId) where.workflowId = workflowId

    // Viewers can only see executions of their workflows
    if (user.role === 'viewer') {
      where.workflow = { ownerId: user.id }
    }

    const executions = await db.execution.findMany({
      where,
      include: {
        workflow: {
          select: { id: true, name: true, status: true, ownerId: true },
        },
        steps: {
          select: {
            id: true,
            nodeId: true,
            status: true,
            latencyMs: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    })

    const hasNextPage = executions.length > limit
    const items = hasNextPage ? executions.slice(0, -1) : executions
    const nextCursor = hasNextPage ? items[items.length - 1]?.id : null

    // Parse JSON fields
    const parsedExecutions = items.map((exec) => ({
      ...exec,
      triggerData: exec.triggerData
        ? typeof exec.triggerData === 'string'
          ? JSON.parse(exec.triggerData)
          : exec.triggerData
        : null,
      metadata: typeof exec.metadata === 'string' ? JSON.parse(exec.metadata) : exec.metadata,
    }))

    return NextResponse.json({
      success: true,
      data: {
        items: parsedExecutions,
        nextCursor,
        hasNextPage,
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      )
    }
    console.error('Error fetching executions:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch executions' } },
      { status: 500 }
    )
  }
}

// CortexOps - Connectors API
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePermission, AuthError } from '@/lib/auth-utils'
import { connectorHealthMonitor, selfHealingEngine } from '@/lib/connectors/self-healing'

const createConnectorSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['static', 'dynamic', 'self_healed']),
  serviceName: z.string().optional(),
  baseUrl: z.string().url().optional(),
  authType: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
})

// GET /api/connectors - List all connectors
export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'connectors', 'read')

    const searchParams = request.nextUrl.searchParams
    const cursor = searchParams.get('cursor')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const type = searchParams.get('type')
    const healthStatus = searchParams.get('healthStatus')

    const where: Record<string, unknown> = {}
    if (type) where.type = type
    if (healthStatus) where.healthStatus = healthStatus

    const connectors = await db.connector.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    })

    const hasNextPage = connectors.length > limit
    const items = hasNextPage ? connectors.slice(0, -1) : connectors
    const nextCursor = hasNextPage ? items[items.length - 1]?.id : null

    return NextResponse.json({
      success: true,
      data: { items, nextCursor, hasNextPage },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      )
    }
    console.error('Error fetching connectors:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch connectors' } },
      { status: 500 }
    )
  }
}

// POST /api/connectors - Create a new connector
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'connectors', 'create')

    const body = await request.json()
    const result = createConnectorSchema.safeParse(body)

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

    const { name, type, serviceName, baseUrl, authType, config } = result.data

    const connector = await db.connector.create({
      data: {
        name,
        type,
        serviceName,
        baseUrl,
        authType,
        config: config ? JSON.parse(JSON.stringify(config)) : undefined,
        healthStatus: 'unknown',
      },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'connector.create',
        resourceType: 'connector',
        resourceId: connector.id,
        details: { name, type },
        riskLevel: 'low',
      },
    })

    return NextResponse.json({ success: true, data: connector }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      )
    }
    console.error('Error creating connector:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create connector' } },
      { status: 500 }
    )
  }
}

// PUT /api/connectors - Health check all connectors
export async function PUT(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'connectors', 'update')

    const results = await connectorHealthMonitor.checkAllConnectors()

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'connector.health_check_all',
        resourceType: 'connector',
        details: { checked: results.size },
        riskLevel: 'low',
      },
    })

    return NextResponse.json({
      success: true,
      data: Object.fromEntries(results),
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      )
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Health check failed' } },
      { status: 500 }
    )
  }
}

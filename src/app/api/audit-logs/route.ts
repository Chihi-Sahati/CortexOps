// CortexOps - Audit Logs API
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, AuthError } from '@/lib/auth-utils'

// GET /api/audit-logs - List audit logs (admin only)
export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'audit-logs', 'read')

    const searchParams = request.nextUrl.searchParams
    const cursor = searchParams.get('cursor')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const action = searchParams.get('action')
    const riskLevel = searchParams.get('riskLevel')
    const userId = searchParams.get('userId')
    const resourceType = searchParams.get('resourceType')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: Record<string, unknown> = {}

    if (action) where.action = action
    if (riskLevel) where.riskLevel = riskLevel
    if (userId) where.userId = userId
    if (resourceType) where.resourceType = resourceType

    if (startDate || endDate) {
      const createdAt: Record<string, Date> = {}
      if (startDate) createdAt.gte = new Date(startDate)
      if (endDate) createdAt.lte = new Date(endDate)
      where.createdAt = createdAt
    }

    const logs = await db.auditLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, username: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    })

    const hasNextPage = logs.length > limit
    const items = hasNextPage ? logs.slice(0, -1) : logs
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
    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch audit logs' } },
      { status: 500 }
    )
  }
}

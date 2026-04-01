// CortexOps - Single Workflow API
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, AuthError } from '@/lib/auth-utils'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/workflows/[id] - Get a single workflow
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requirePermission(request, 'workflows', 'read')
    const { id } = await params

    const workflow = await db.workflow.findUnique({
      where: { id },
      include: {
        nodes: {
          orderBy: { createdAt: 'asc' },
        },
        edges: {
          orderBy: { createdAt: 'asc' },
        },
        owner: {
          select: { id: true, username: true, email: true, fullName: true },
        },
        executions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            startedAt: true,
            completedAt: true,
            durationMs: true,
            totalTokens: true,
            totalCost: true,
          },
        },
        _count: {
          select: { executions: true },
        },
      },
    })

    if (!workflow) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Workflow not found' } },
        { status: 404 }
      )
    }

    // Parse JSON fields
    const parsedWorkflow = {
      ...workflow,
      config: typeof workflow.config === 'string' ? JSON.parse(workflow.config) : workflow.config,
      tags: typeof workflow.tags === 'string' ? JSON.parse(workflow.tags) : workflow.tags,
      nodes: workflow.nodes.map((node) => ({
        ...node,
        config: typeof node.config === 'string' ? JSON.parse(node.config) : node.config,
      })),
      edges: workflow.edges.map((edge) => ({
        ...edge,
        condition: edge.condition
          ? typeof edge.condition === 'string'
            ? JSON.parse(edge.condition)
            : edge.condition
          : null,
      })),
    }

    return NextResponse.json({ success: true, data: parsedWorkflow })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      )
    }
    console.error('Error fetching workflow:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch workflow' } },
      { status: 500 }
    )
  }
}

// PUT /api/workflows/[id] - Update a workflow
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requirePermission(request, 'workflows', 'update')
    const { id } = await params
    const body = await request.json()
    const { name, description, status, triggerType, cronExpression, config, tags, nodes, edges } = body

    // Check if workflow exists
    const existing = await db.workflow.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Workflow not found' } },
        { status: 404 }
      )
    }

    // Update workflow
    const updateData: Record<string, unknown> = {
      version: { increment: 1 },
    }
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (status !== undefined) updateData.status = status
    if (triggerType !== undefined) updateData.triggerType = triggerType
    if (cronExpression !== undefined) updateData.cronExpression = cronExpression
    if (config !== undefined) updateData.config = config
    if (tags !== undefined) updateData.tags = tags

    const workflow = await db.workflow.update({
      where: { id },
      data: updateData,
      include: {
        nodes: true,
        edges: true,
      },
    })

    // If nodes provided, update them
    if (nodes) {
      await db.workflowEdge.deleteMany({ where: { workflowId: id } })
      await db.workflowNode.deleteMany({ where: { workflowId: id } })

      // Use transaction for atomic node/edge creation
      await db.$transaction([
        ...nodes.map((node: Record<string, unknown>) =>
          db.workflowNode.create({
            data: {
              workflowId: id,
              type: node.type as string,
              name: node.name as string,
              config: node.config || {},
              positionX: (node.positionX as number) || 0,
              positionY: (node.positionY as number) || 0,
              isEnabled: (node.isEnabled as boolean) ?? true,
            },
          })
        ),
        ...(edges || []).map((edge: Record<string, unknown>) =>
          db.workflowEdge.create({
            data: {
              workflowId: id,
              sourceNodeId: edge.sourceNodeId as string,
              targetNodeId: edge.targetNodeId as string,
              condition: edge.condition ? JSON.parse(JSON.stringify(edge.condition)) : null,
              label: edge.label as string,
              edgeType: (edge.edgeType as string) || 'default',
            },
          })
        ),
      ])
    }

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'workflow.update',
        resourceType: 'workflow',
        resourceId: id,
        details: { name: workflow.name, status: workflow.status },
        riskLevel: 'low',
      },
    })

    // Fetch updated workflow
    const updated = await db.workflow.findUnique({
      where: { id },
      include: {
        nodes: true,
        edges: true,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      )
    }
    console.error('Error updating workflow:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update workflow' } },
      { status: 500 }
    )
  }
}

// DELETE /api/workflows/[id] - Delete a workflow
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requirePermission(request, 'workflows', 'delete')
    const { id } = await params

    const existing = await db.workflow.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Workflow not found' } },
        { status: 404 }
      )
    }

    await db.workflow.delete({ where: { id } })

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'workflow.delete',
        resourceType: 'workflow',
        resourceId: id,
        details: { name: existing.name },
        riskLevel: 'medium',
      },
    })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      )
    }
    console.error('Error deleting workflow:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete workflow' } },
      { status: 500 }
    )
  }
}

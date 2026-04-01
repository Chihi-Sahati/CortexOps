// CortexOps - Workflows API
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/workflows - List all workflows
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

    const workflows = await db.workflow.findMany({
      include: {
        nodes: true,
        edges: true,
        _count: {
          select: { executions: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    })

    const items = workflows.map((workflow) => ({
      ...workflow,
      config: typeof workflow.config === 'string' ? JSON.parse(workflow.config) : workflow.config,
      tags: workflow.tags,
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
    }))

    return NextResponse.json({
      success: true,
      data: { items, nextCursor: null, hasNextPage: false },
    })
  } catch (error) {
    console.error('Error fetching workflows:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch workflows' } },
      { status: 500 }
    )
  }
}

// POST /api/workflows - Create a new workflow
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, nodes, edges } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Workflow name is required' } },
        { status: 400 }
      )
    }

    // Use a default user ID for development
    let ownerId = 'default-user'

    // Try to find an existing user
    const existingUser = await db.user.findFirst()
    if (existingUser) {
      ownerId = existingUser.id
    } else {
      // Create default user if none exists
      const bcrypt = await import('bcryptjs')
      const defaultUser = await db.user.create({
        data: {
          id: 'default-user',
          email: 'admin@cortexops.dev',
          username: 'admin',
          passwordHash: await bcrypt.hash('admin123', 12),
          fullName: 'Admin User',
          role: 'admin',
          isActive: true,
        },
      })
      ownerId = defaultUser.id
    }

    const workflow = await db.workflow.create({
      data: {
        name: name.trim(),
        description: description || null,
        ownerId,
        status: 'draft',
        nodes: {
          create: (nodes || []).map((node: Record<string, unknown>) => ({
            type: node.type as string,
            name: node.name as string,
            config: node.config || {},
            positionX: (node.positionX as number) || 0,
            positionY: (node.positionY as number) || 0,
            isEnabled: true,
          })),
        },
        edges: {
          create: (edges || []).map((edge: Record<string, unknown>) => ({
            sourceNodeId: edge.sourceNodeId as string,
            targetNodeId: edge.targetNodeId as string,
            condition: edge.condition || null,
            label: edge.label as string,
            edgeType: (edge.edgeType as string) || 'default',
          })),
        },
      },
      include: {
        nodes: true,
        edges: true,
      },
    })

    return NextResponse.json({ success: true, data: workflow }, { status: 201 })
  } catch (error) {
    console.error('Error creating workflow:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create workflow'
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: errorMessage } },
      { status: 500 }
    )
  }
}

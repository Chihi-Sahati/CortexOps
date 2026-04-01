// CortexOps - Workflow Templates API
import { NextRequest, NextResponse } from 'next/server'
import { workflowTemplates, getTemplateById, getTemplatesByCategory, templateCategories } from '@/lib/templates'
import { requirePermission, AuthError } from '@/lib/auth-utils'
import { db } from '@/lib/db'

// GET /api/templates - List all templates
export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'workflows', 'read')

    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const tag = searchParams.get('tag')
    const id = searchParams.get('id')

    if (id) {
      const template = getTemplateById(id)
      if (!template) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Template not found' } },
          { status: 404 }
        )
      }
      return NextResponse.json({ success: true, data: template })
    }

    let templates = workflowTemplates

    if (category) {
      templates = getTemplatesByCategory(category)
    }

    if (tag) {
      templates = templates.filter((t) => t.tags.includes(tag))
    }

    return NextResponse.json({
      success: true,
      data: {
        templates,
        categories: templateCategories,
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      )
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch templates' } },
      { status: 500 }
    )
  }
}

// POST /api/templates - Create workflow from template
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'workflows', 'create')

    const body = await request.json()
    const { templateId, name, description } = body

    const template = getTemplateById(templateId)
    if (!template) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Template not found' } },
        { status: 404 }
      )
    }

    // Create workflow from template
    const workflow = await db.workflow.create({
      data: {
        name: name || template.name,
        description: description || template.description,
        ownerId: user.id,
        status: 'draft',
        tags: template.tags,
        nodes: {
          create: template.nodes.map((node) => ({
            type: node.type,
            name: node.name,
            config: JSON.parse(JSON.stringify(node.config)),
            positionX: node.positionX,
            positionY: node.positionY,
          })),
        },
        edges: {
          create: template.edges.map((edge) => ({
            sourceNodeId: edge.sourceNodeId,
            targetNodeId: edge.targetNodeId,
            edgeType: edge.edgeType,
          })),
        },
      },
      include: {
        nodes: true,
        edges: true,
      },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'workflow.create_from_template',
        resourceType: 'workflow',
        resourceId: workflow.id,
        details: { templateId, templateName: template.name },
        riskLevel: 'low',
      },
    })

    return NextResponse.json({ success: true, data: workflow }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      )
    }
    console.error('Error creating workflow from template:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create workflow' } },
      { status: 500 }
    )
  }
}

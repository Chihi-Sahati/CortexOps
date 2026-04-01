// CortexOps - Credentials API
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePermission, AuthError } from '@/lib/auth-utils'
import { encryptCredential, decryptCredential } from '@/lib/crypto'

const createCredentialSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['api_key', 'oauth2', 'basic_auth', 'bearer_token', 'custom']),
  data: z.record(z.string(), z.unknown()),
  metadata: z.record(z.string(), z.unknown()).optional(),
  expiresAt: z.string().datetime().optional(),
})

const updateCredentialSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  expiresAt: z.string().datetime().optional(),
})

// GET /api/credentials - List user's credentials
export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'credentials', 'read')

    const credentials = await db.credential.findMany({
      where: { ownerId: user.id },
      select: {
        id: true,
        name: true,
        type: true,
        metadata: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: credentials })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      )
    }
    console.error('Error fetching credentials:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch credentials' } },
      { status: 500 }
    )
  }
}

// POST /api/credentials - Create a new credential
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'credentials', 'create')

    const body = await request.json()
    const result = createCredentialSchema.safeParse(body)

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

    const { name, type, data, metadata, expiresAt } = result.data

    // Check for duplicate name
    const existing = await db.credential.findUnique({
      where: { ownerId_name: { ownerId: user.id, name } },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: 'DUPLICATE', message: 'Credential with this name already exists' } },
        { status: 409 }
      )
    }

    // Encrypt the credential data
    const encryptedData = encryptCredential(data)

    const credential = await db.credential.create({
      data: {
        ownerId: user.id,
        name,
        type,
        encryptedData,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      select: {
        id: true,
        name: true,
        type: true,
        metadata: true,
        expiresAt: true,
        createdAt: true,
      },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'credential.create',
        resourceType: 'credential',
        resourceId: credential.id,
        details: { name, type },
        riskLevel: 'medium',
      },
    })

    return NextResponse.json({ success: true, data: credential }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      )
    }
    console.error('Error creating credential:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create credential' } },
      { status: 500 }
    )
  }
}

// PUT /api/credentials - Update a credential
export async function PUT(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'credentials', 'update')

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Credential ID is required' } },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await db.credential.findFirst({
      where: { id, ownerId: user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Credential not found' } },
        { status: 404 }
      )
    }

    const result = updateCredentialSchema.safeParse(updateData)
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

    const updateFields: Record<string, unknown> = {}
    if (result.data.name) updateFields.name = result.data.name
    if (result.data.data) updateFields.encryptedData = encryptCredential(result.data.data)
    if (result.data.metadata) updateFields.metadata = result.data.metadata
    if (result.data.expiresAt) updateFields.expiresAt = new Date(result.data.expiresAt)

    const credential = await db.credential.update({
      where: { id },
      data: updateFields,
      select: {
        id: true,
        name: true,
        type: true,
        metadata: true,
        expiresAt: true,
        updatedAt: true,
      },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'credential.update',
        resourceType: 'credential',
        resourceId: id,
        details: { name: credential.name },
        riskLevel: 'medium',
      },
    })

    return NextResponse.json({ success: true, data: credential })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      )
    }
    console.error('Error updating credential:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update credential' } },
      { status: 500 }
    )
  }
}

// DELETE /api/credentials - Delete a credential
export async function DELETE(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'credentials', 'delete')

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Credential ID is required' } },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await db.credential.findFirst({
      where: { id, ownerId: user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Credential not found' } },
        { status: 404 }
      )
    }

    await db.credential.delete({ where: { id } })

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'credential.delete',
        resourceType: 'credential',
        resourceId: id,
        details: { name: existing.name },
        riskLevel: 'high',
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
    console.error('Error deleting credential:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete credential' } },
      { status: 500 }
    )
  }
}

// CortexOps - API Key Management
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { z } from 'zod'
import { db } from '@/lib/db'
import { generateApiKey, hashValue } from '@/lib/crypto'

const createApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  expiresAt: z.string().datetime().optional(),
})

// GET /api/api-keys - List user's API keys
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    const apiKeys = await db.apiKey.findMany({
      where: { userId: token.id as string },
      select: {
        id: true,
        name: true,
        prefix: true,
        lastUsed: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: apiKeys })
  } catch (error) {
    console.error('Error fetching API keys:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch API keys' } },
      { status: 500 }
    )
  }
}

// POST /api/api-keys - Create a new API key
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const result = createApiKeySchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: result.error.flatten().fieldErrors },
        },
        { status: 400 }
      )
    }

    const { name, expiresAt } = result.data
    const { key, hash, prefix } = generateApiKey()

    const apiKey = await db.apiKey.create({
      data: {
        userId: token.id as string,
        name,
        keyHash: hash,
        prefix,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        expiresAt: true,
        createdAt: true,
      },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        userId: token.id as string,
        action: 'api_key.create',
        resourceType: 'api_key',
        resourceId: apiKey.id,
        details: { name, prefix },
        riskLevel: 'medium',
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          ...apiKey,
          key, // Only returned once on creation
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating API key:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create API key' } },
      { status: 500 }
    )
  }
}

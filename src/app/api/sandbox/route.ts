// CortexOps - Sandbox Execution API
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sandboxExecutor } from '@/lib/sandbox'
import { requirePermission, AuthError } from '@/lib/auth-utils'
import { db } from '@/lib/db'

const executeSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50000, 'Code too long (max 50KB)'),
  language: z.enum(['python', 'javascript']),
  input: z.record(z.string(), z.unknown()).optional(),
  config: z
    .object({
      timeout: z.number().min(1).max(30).optional(),
      maxMemory: z.number().min(64).max(512).optional(),
      maxCpuCores: z.number().min(1).max(2).optional(),
      networkEnabled: z.boolean().optional(),
    })
    .optional(),
})

// POST /api/sandbox/execute - Execute code in sandbox
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'workflows', 'execute')

    const body = await request.json()
    const result = executeSchema.safeParse(body)

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

    const { code, language, input, config } = result.data

    // Execute in sandbox
    const executionResult = await sandboxExecutor.execute({
      code,
      language,
      input,
      config,
    })

    // Log execution to audit
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'sandbox.execute',
        resourceType: 'sandbox',
        details: {
          language,
          success: executionResult.success,
          executionTime: executionResult.executionTime,
          securityWarnings: executionResult.securityWarnings,
        },
        riskLevel: executionResult.securityWarnings.length > 0 ? 'medium' : 'low',
      },
    })

    return NextResponse.json({
      success: true,
      data: executionResult,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      )
    }
    console.error('Sandbox execution error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Execution failed' } },
      { status: 500 }
    )
  }
}

// POST /api/sandbox/analyze - Analyze code security without executing
export async function PUT(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'workflows', 'read')

    const body = await request.json()
    const { code, language } = body

    if (!code || !language) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Code and language required' } },
        { status: 400 }
      )
    }

    const securityResult = await sandboxExecutor.analyzeSecurity(code, language)

    return NextResponse.json({
      success: true,
      data: securityResult,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      )
    }
    console.error('Security analysis error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Analysis failed' } },
      { status: 500 }
    )
  }
}

// GET /api/sandbox - Get supported languages
export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'workflows', 'read')

    return NextResponse.json({
      success: true,
      data: {
        languages: sandboxExecutor.getSupportedLanguages(),
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
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get languages' } },
      { status: 500 }
    )
  }
}

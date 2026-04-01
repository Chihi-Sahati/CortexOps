// CortexOps - Health Check API
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const checks: Record<string, { status: string; latency?: number }> = {}

  // Check database
  try {
    const start = Date.now()
    await db.$queryRaw`SELECT 1`
    checks.database = { status: 'healthy', latency: Date.now() - start }
  } catch (error) {
    checks.database = { status: 'unhealthy' }
  }

  // Check AI Engine
  try {
    const start = Date.now()
    const response = await fetch(`${process.env.AI_ENGINE_URL}/ai/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    })
    checks.aiEngine = {
      status: response.ok ? 'healthy' : 'degraded',
      latency: Date.now() - start,
    }
  } catch (error) {
    checks.aiEngine = { status: 'unhealthy' }
  }

  const isHealthy = Object.values(checks).every((c) => c.status === 'healthy')

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'degraded',
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString(),
      services: checks,
    },
    { status: 200 } // Always 200 — use body.status to determine health
  )
}

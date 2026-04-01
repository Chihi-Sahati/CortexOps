// CortexOps - Auth Utilities for API Routes
import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { hasPermission, type UserRole } from './rbac'

export interface AuthUser {
  id: string
  email: string
  role: UserRole
}

/**
 * Get authenticated user from request
 */
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  if (!token?.id || !token?.email || !token?.role) {
    return null
  }

  return {
    id: token.id as string,
    email: token.email as string,
    role: token.role as UserRole,
  }
}

/**
 * Require authenticated user or throw
 */
export async function requireAuth(request: NextRequest): Promise<AuthUser> {
  const user = await getAuthUser(request)
  if (!user) {
    throw new AuthError('UNAUTHORIZED', 'Authentication required', 401)
  }
  return user
}

/**
 * Require specific permission or throw
 */
export async function requirePermission(
  request: NextRequest,
  resource: string,
  action: 'read' | 'create' | 'update' | 'delete' | 'execute'
): Promise<AuthUser> {
  const user = await requireAuth(request)

  if (!hasPermission(user.role, resource, action)) {
    throw new AuthError('FORBIDDEN', `No permission to ${action} ${resource}`, 403)
  }

  return user
}

/**
 * Require minimum role or throw
 */
export async function requireRole(
  request: NextRequest,
  minimumRole: UserRole
): Promise<AuthUser> {
  const user = await requireAuth(request)

  const hierarchy: Record<UserRole, number> = {
    admin: 3,
    developer: 2,
    viewer: 1,
  }

  if (hierarchy[user.role] < hierarchy[minimumRole]) {
    throw new AuthError('FORBIDDEN', `Requires ${minimumRole} role or higher`, 403)
  }

  return user
}

/**
 * Custom auth error class
 */
export class AuthError extends Error {
  code: string
  statusCode: number

  constructor(code: string, message: string, statusCode: number) {
    super(message)
    this.name = 'AuthError'
    this.code = code
    this.statusCode = statusCode
  }
}

/**
 * Extract user ID from headers (set by middleware)
 */
export function getUserIdFromHeaders(request: NextRequest): string | null {
  return request.headers.get('x-user-id')
}

/**
 * Extract user role from headers (set by middleware)
 */
export function getUserRoleFromHeaders(request: NextRequest): string | null {
  return request.headers.get('x-user-role')
}

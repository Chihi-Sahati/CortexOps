// CortexOps - Role-Based Access Control (RBAC)

export type UserRole = 'admin' | 'developer' | 'viewer'

export interface Permission {
  resource: string
  actions: ('read' | 'create' | 'update' | 'delete' | 'execute')[]
}

// Define permissions for each role
const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    { resource: 'workflows', actions: ['read', 'create', 'update', 'delete', 'execute'] },
    { resource: 'executions', actions: ['read', 'create', 'delete'] },
    { resource: 'connectors', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'credentials', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'users', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'settings', actions: ['read', 'update'] },
    { resource: 'audit-logs', actions: ['read'] },
    { resource: 'nl', actions: ['read', 'create'] },
    { resource: 'nodes', actions: ['read'] },
  ],
  developer: [
    { resource: 'workflows', actions: ['read', 'create', 'update', 'delete', 'execute'] },
    { resource: 'executions', actions: ['read', 'create'] },
    { resource: 'connectors', actions: ['read', 'create', 'update'] },
    { resource: 'credentials', actions: ['read', 'create', 'update'] },
    { resource: 'nl', actions: ['read', 'create'] },
    { resource: 'nodes', actions: ['read'] },
  ],
  viewer: [
    { resource: 'workflows', actions: ['read'] },
    { resource: 'executions', actions: ['read'] },
    { resource: 'connectors', actions: ['read'] },
    { resource: 'nodes', actions: ['read'] },
  ],
}

/**
 * Check if a role has permission for a specific action on a resource
 */
export function hasPermission(
  role: UserRole,
  resource: string,
  action: Permission['actions'][number]
): boolean {
  const permissions = rolePermissions[role]
  if (!permissions) return false

  const resourcePermission = permissions.find((p) => p.resource === resource)
  if (!resourcePermission) return false

  return resourcePermission.actions.includes(action)
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return rolePermissions[role] || []
}

/**
 * Check if a role is higher or equal to a minimum required role
 */
export function isRoleAtLeast(userRole: UserRole, minimumRole: UserRole): boolean {
  const hierarchy: Record<UserRole, number> = {
    admin: 3,
    developer: 2,
    viewer: 1,
  }
  return hierarchy[userRole] >= hierarchy[minimumRole]
}

/**
 * Get the list of all available roles
 */
export function getAllRoles(): UserRole[] {
  return ['admin', 'developer', 'viewer']
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    admin: 'Administrator',
    developer: 'Developer',
    viewer: 'Viewer',
  }
  return names[role] || role
}

/**
 * Get role description
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    admin: 'Full access to all features and settings',
    developer: 'Can create, edit, and execute workflows',
    viewer: 'Read-only access to workflows and executions',
  }
  return descriptions[role] || ''
}

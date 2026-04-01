// CortexOps - RBAC Module Tests
import { hasPermission, isRoleAtLeast, getRolePermissions, getAllRoles } from '../rbac'

describe('RBAC Module', () => {
  describe('hasPermission', () => {
    it('should allow admin to do everything', () => {
      expect(hasPermission('admin', 'workflows', 'read')).toBe(true)
      expect(hasPermission('admin', 'workflows', 'create')).toBe(true)
      expect(hasPermission('admin', 'workflows', 'update')).toBe(true)
      expect(hasPermission('admin', 'workflows', 'delete')).toBe(true)
      expect(hasPermission('admin', 'workflows', 'execute')).toBe(true)
      expect(hasPermission('admin', 'users', 'read')).toBe(true)
      expect(hasPermission('admin', 'settings', 'update')).toBe(true)
    })

    it('should allow developer to manage workflows', () => {
      expect(hasPermission('developer', 'workflows', 'read')).toBe(true)
      expect(hasPermission('developer', 'workflows', 'create')).toBe(true)
      expect(hasPermission('developer', 'workflows', 'update')).toBe(true)
      expect(hasPermission('developer', 'workflows', 'execute')).toBe(true)
    })

    it('should deny developer access to users', () => {
      expect(hasPermission('developer', 'users', 'read')).toBe(false)
      expect(hasPermission('developer', 'users', 'create')).toBe(false)
    })

    it('should only allow viewer to read', () => {
      expect(hasPermission('viewer', 'workflows', 'read')).toBe(true)
      expect(hasPermission('viewer', 'workflows', 'create')).toBe(false)
      expect(hasPermission('viewer', 'workflows', 'update')).toBe(false)
      expect(hasPermission('viewer', 'workflows', 'delete')).toBe(false)
      expect(hasPermission('viewer', 'workflows', 'execute')).toBe(false)
    })
  })

  describe('isRoleAtLeast', () => {
    it('should correctly compare role hierarchy', () => {
      expect(isRoleAtLeast('admin', 'admin')).toBe(true)
      expect(isRoleAtLeast('admin', 'developer')).toBe(true)
      expect(isRoleAtLeast('admin', 'viewer')).toBe(true)

      expect(isRoleAtLeast('developer', 'admin')).toBe(false)
      expect(isRoleAtLeast('developer', 'developer')).toBe(true)
      expect(isRoleAtLeast('developer', 'viewer')).toBe(true)

      expect(isRoleAtLeast('viewer', 'admin')).toBe(false)
      expect(isRoleAtLeast('viewer', 'developer')).toBe(false)
      expect(isRoleAtLeast('viewer', 'viewer')).toBe(true)
    })
  })

  describe('getRolePermissions', () => {
    it('should return permissions for each role', () => {
      const adminPerms = getRolePermissions('admin')
      const developerPerms = getRolePermissions('developer')
      const viewerPerms = getRolePermissions('viewer')

      expect(adminPerms.length).toBeGreaterThan(developerPerms.length)
      expect(developerPerms.length).toBeGreaterThan(viewerPerms.length)
    })
  })

  describe('getAllRoles', () => {
    it('should return all available roles', () => {
      const roles = getAllRoles()
      expect(roles).toContain('admin')
      expect(roles).toContain('developer')
      expect(roles).toContain('viewer')
    })
  })
})

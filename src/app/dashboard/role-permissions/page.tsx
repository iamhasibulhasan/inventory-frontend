'use client';
import { useState, useEffect, useCallback } from 'react';
import { rolePermissionsAPI } from '@/lib/api';
import { PageHeader, Modal, FormField, LoadingPage, Badge, EmptyState } from '@/components/ui';
import { Shield, Plus, Save, ChevronDown, ChevronRight, Check, X, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface Permission {
  id: string; menu_key: string; menu_label: string; parent_key: string | null;
  icon: string; sort_order: number;
  can_view?: boolean; can_create?: boolean; can_edit?: boolean; can_delete?: boolean;
}
interface Role { id: string; name: string; description: string; is_active: boolean; permission_count: number; }

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  warehouse_staff: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  packaging_staff: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

type PermMap = Record<string, { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }>;

export default function RolePermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPerms, setAllPerms] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [permMap, setPermMap] = useState<PermMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', description: '' });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const fetchRoles = useCallback(async () => {
    try {
      const [rolesRes, permsRes] = await Promise.all([
        rolePermissionsAPI.getRoles(),
        rolePermissionsAPI.getPermissions(),
      ]);
      setRoles(rolesRes.data.data);
      setAllPerms(permsRes.data.data);
    } catch { toast.error('Failed to load roles'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const loadRolePerms = async (role: Role) => {
    setSelectedRole(role);
    try {
      const res = await rolePermissionsAPI.getRoleById(role.id);
      const map: PermMap = {};
      for (const p of res.data.data.permissions) {
        map[p.permission_id] = { can_view: p.can_view, can_create: p.can_create, can_edit: p.can_edit, can_delete: p.can_delete };
      }
      setPermMap(map);
    } catch { toast.error('Failed to load role permissions'); }
  };

  const toggle = (permId: string, field: keyof PermMap[string]) => {
    setPermMap(prev => {
      const existing = prev[permId] || { can_view: false, can_create: false, can_edit: false, can_delete: false };
      const updated = { ...existing, [field]: !existing[field] };
      // if enabling create/edit/delete, auto-enable view
      if (field !== 'can_view' && updated[field]) updated.can_view = true;
      return { ...prev, [permId]: updated };
    });
  };

  const toggleGroup = (parentKey: string, field: keyof PermMap[string], value: boolean) => {
    const children = allPerms.filter(p => p.parent_key === parentKey || p.menu_key === parentKey);
    setPermMap(prev => {
      const next = { ...prev };
      for (const c of children) {
        next[c.id] = { ...(next[c.id] || { can_view: false, can_create: false, can_edit: false, can_delete: false }), [field]: value };
        if (field !== 'can_view' && value) next[c.id].can_view = true;
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      const permissions = Object.entries(permMap)
        .filter(([, v]) => v.can_view)
        .map(([permission_id, v]) => ({ permission_id, ...v }));
      await rolePermissionsAPI.updateRolePermissions(selectedRole.id, { permissions });
      toast.success(`Permissions saved for ${selectedRole.name}`);
      fetchRoles();
    } catch { toast.error('Failed to save permissions'); }
    finally { setSaving(false); }
  };

  const handleCreateRole = async () => {
    if (!newRole.name) return toast.error('Role name required');
    try {
      await rolePermissionsAPI.createRole(newRole);
      toast.success('Role created');
      setCreateModal(false);
      setNewRole({ name: '', description: '' });
      fetchRoles();
    } catch { toast.error('Failed to create role'); }
  };

  // Build tree: top-level + children
  const topLevel = allPerms.filter(p => !p.parent_key);
  const children = (parentKey: string) => allPerms.filter(p => p.parent_key === parentKey);

  if (loading) return <LoadingPage />;

  return (
    <div>
      <PageHeader title="Role Menu Permission" subtitle="Control which menus each role can access"
        actions={
          <button className="btn-primary" onClick={() => setCreateModal(true)}>
            <Plus className="w-4 h-4" /> New Role
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Role List */}
        <div className="lg:col-span-1 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1 mb-3">Select Role</p>
          {roles.map(role => (
            <button
              key={role.id}
              onClick={() => loadRolePerms(role)}
              className={clsx(
                'w-full text-left px-4 py-3 rounded-xl border transition-all',
                selectedRole?.id === role.id
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-brand-300'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-brand-500" />
                <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full capitalize',
                  ROLE_COLORS[role.name] || 'bg-gray-100 text-gray-700'
                )}>
                  {role.name.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{role.description}</p>
              <p className="text-xs text-brand-500 mt-1">{role.permission_count} permissions</p>
            </button>
          ))}
        </div>

        {/* Permissions Matrix */}
        <div className="lg:col-span-3">
          {!selectedRole ? (
            <div className="card p-16 flex flex-col items-center justify-center text-center">
              <Shield className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Select a role to manage permissions</p>
              <p className="text-sm text-gray-400 mt-1">Click any role on the left to configure its menu access</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white capitalize">
                    {selectedRole.name.replace(/_/g, ' ')} — Permissions
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">Toggle permissions per menu item</p>
                </div>
                <button className="btn-primary" onClick={handleSave} disabled={saving}>
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

              {/* Header row */}
              <div className="grid grid-cols-12 gap-2 px-5 py-2.5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <div className="col-span-6">Menu Item</div>
                <div className="col-span-1.5 text-center w-14">View</div>
                <div className="col-span-1.5 text-center w-14">Create</div>
                <div className="col-span-1.5 text-center w-14">Edit</div>
                <div className="col-span-1.5 text-center w-14">Delete</div>
              </div>

              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {topLevel.map(perm => {
                  const subs = children(perm.menu_key);
                  const hasSubs = subs.length > 0;
                  const isExpanded = expanded[perm.menu_key] !== false;
                  const p = permMap[perm.id] || { can_view: false, can_create: false, can_edit: false, can_delete: false };

                  return (
                    <div key={perm.id}>
                      {/* Parent row */}
                      <div className="flex items-center px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <div className="flex-1 flex items-center gap-2">
                          {hasSubs ? (
                            <button
                              onClick={() => setExpanded(ex => ({ ...ex, [perm.menu_key]: !isExpanded }))}
                              className="p-0.5 text-gray-400 hover:text-gray-600"
                            >
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                          ) : <span className="w-5" />}
                          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{perm.menu_label}</span>
                          {hasSubs && <Badge variant="default">{subs.length} sub-menus</Badge>}
                        </div>
                        <div className="flex items-center gap-8 ml-auto">
                          {(['can_view','can_create','can_edit','can_delete'] as const).map(field => (
                            <button
                              key={field}
                              onClick={() => hasSubs ? toggleGroup(perm.menu_key, field, !p[field]) : toggle(perm.id, field)}
                              className={clsx(
                                'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                                (hasSubs ? false : p[field])
                                  ? 'bg-brand-500 text-white'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                              )}
                            >
                              {(hasSubs ? false : p[field]) ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Sub-menu rows */}
                      {hasSubs && isExpanded && subs.map(sub => {
                        const sp = permMap[sub.id] || { can_view: false, can_create: false, can_edit: false, can_delete: false };
                        return (
                          <div key={sub.id} className="flex items-center px-5 py-2.5 bg-gray-50/50 dark:bg-gray-800/20 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-l-2 border-brand-200 ml-5">
                            <div className="flex-1 flex items-center gap-2 pl-6">
                              <span className="text-sm text-gray-600 dark:text-gray-400">{sub.menu_label}</span>
                            </div>
                            <div className="flex items-center gap-8 ml-auto">
                              {(['can_view','can_create','can_edit','can_delete'] as const).map(field => (
                                <button
                                  key={field}
                                  onClick={() => toggle(sub.id, field)}
                                  className={clsx(
                                    'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                                    sp[field]
                                      ? 'bg-brand-500 text-white'
                                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                  )}
                                >
                                  {sp[field] ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Role Modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Create New Role">
        <div className="space-y-4">
          <FormField label="Role Name" required>
            <input className="input" value={newRole.name} onChange={e => setNewRole({ ...newRole, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })} placeholder="e.g. sales_manager" />
          </FormField>
          <FormField label="Description">
            <textarea className="input resize-none" rows={3} value={newRole.description} onChange={e => setNewRole({ ...newRole, description: e.target.value })} placeholder="Role description..." />
          </FormField>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button className="btn-secondary" onClick={() => setCreateModal(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleCreateRole}>Create Role</button>
        </div>
      </Modal>
    </div>
  );
}

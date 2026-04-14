'use client';
import { useState, useEffect, useCallback } from 'react';
import { usersAPI } from '@/lib/api';
import { PageHeader, DataTable, StatusBadge, Modal, FormField, EmptyState, Badge } from '@/components/ui';
import { Plus, Users, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store';
import { format } from 'date-fns';

interface User { id: string; name: string; email: string; phone: string; role_name: string; is_active: boolean; last_login: string; created_at: string; }
interface Role { id: string; name: string; description: string; }

const EMPTY_FORM = { name: '', email: '', phone: '', password: '', role_id: '' };

const ROLE_COLORS: Record<string, string> = { admin: 'danger', manager: 'info', packaging_staff: 'default' };

export default function UsersPage() {
  const { can: hasPermission, user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([usersAPI.getAll(), usersAPI.getRoles()]);
      setUsers(usersRes.data.data);
      setRoles(rolesRes.data.data);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setForm(EMPTY_FORM); setEditId(null); setModal('create'); };
  const openEdit = (u: User) => {
    setForm({ ...EMPTY_FORM, name: u.name, email: u.email, phone: u.phone || '',
      role_id: roles.find(r => r.name === u.role_name)?.id || '' });
    setEditId(u.id); setModal('edit');
  };

  const handleSave = async () => {
    if (!form.name || !form.email || (!editId && !form.password)) return toast.error('Fill required fields');
    setSaving(true);
    try {
      if (editId) { await usersAPI.update(editId, { name: form.name, phone: form.phone, role_id: form.role_id }); toast.success('User updated'); }
      else { await usersAPI.create(form); toast.success('User created'); }
      setModal(null); fetchData();
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const columns = [
    {
      key: 'name', label: 'User',
      render: (u: User) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center text-white text-sm font-semibold">
            {u.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{u.name}</p>
            <p className="text-xs text-gray-400">{u.email}</p>
          </div>
        </div>
      )
    },
    { key: 'phone', label: 'Phone', render: (u: User) => <span className="text-sm text-gray-500">{u.phone || '—'}</span> },
    {
      key: 'role_name', label: 'Role',
      render: (u: User) => (
        <Badge variant={ROLE_COLORS[u.role_name] || 'default'} className="flex items-center gap-1">
          <Shield className="w-3 h-3" />
          {u.role_name?.replace('_', ' ')}
        </Badge>
      )
    },
    {
      key: 'last_login', label: 'Last Login',
      render: (u: User) => <span className="text-xs text-gray-400">{u.last_login ? (() => { try { return format(new Date(u.last_login), 'dd MMM, HH:mm'); } catch { return '—'; } })() : 'Never'}</span>
    },
    { key: 'is_active', label: 'Status', render: (u: User) => <StatusBadge status={u.is_active ? 'active' : 'inactive'} /> },
  ];

  if (!hasPermission('users', 'view')) {
    return <div className="card p-12 text-center"><Shield className="w-10 h-10 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">You don't have permission to view this page.</p></div>;
  }

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle={`${users.length} team members`}
        actions={
          hasPermission('users', 'create') ? (
            <button className="btn-primary" onClick={openCreate}><Plus className="w-4 h-4" />Add User</button>
          ) : undefined
        }
      />

      {/* Role summary */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {roles.map(role => {
          const count = users.filter(u => u.role_name === role.name).length;
          return (
            <div key={role.id} className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-brand-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{count}</p>
                <p className="text-sm text-gray-500 capitalize">{role.name.replace('_', ' ')}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card overflow-hidden">
        <DataTable
          columns={columns}
          data={users}
          loading={loading}
          onRowClick={hasPermission('users', 'edit') ? (u) => { if (u.id !== currentUser?.id) openEdit(u); } : undefined}
          emptyState={<EmptyState icon={<Users className="w-6 h-6" />} title="No users found" />}
        />
      </div>

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal === 'edit' ? 'Edit User' : 'Add New User'}>
        <div className="space-y-4">
          <FormField label="Full Name" required>
            <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Md. Karim Hossain" />
          </FormField>
          <FormField label="Email Address" required>
            <input type="email" className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="user@inventory.com" disabled={!!editId} />
          </FormField>
          <FormField label="Phone">
            <input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="01700000000" />
          </FormField>
          {!editId && (
            <FormField label="Password" required>
              <input type="password" className="input" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min. 8 characters" />
            </FormField>
          )}
          <FormField label="Role" required>
            <select className="select" value={form.role_id} onChange={e => setForm({ ...form, role_id: e.target.value })}>
              <option value="">Select role</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name.replace('_', ' ')}</option>)}
            </select>
          </FormField>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : modal === 'edit' ? 'Update User' : 'Create User'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

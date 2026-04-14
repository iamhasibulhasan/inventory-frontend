'use client';
import { useState, useEffect, useCallback } from 'react';
import { suppliersAPI } from '@/lib/api';
import { PageHeader, DataTable, StatusBadge, Modal, FormField, EmptyState } from '@/components/ui';
import { Plus, Truck, Search, Phone, Mail, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store';

interface Supplier {
  id: string; name: string; contact_person: string; email: string;
  phone: string; city: string; payment_terms: number; is_active: boolean; tax_id: string;
}

const EMPTY_FORM = { name: '', contact_person: '', email: '', phone: '', address: '', city: '', tax_id: '', payment_terms: '30' };

export default function SuppliersPage() {
  const { can: hasPermission } = useAuthStore();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await suppliersAPI.getAll({ search });
      setSuppliers(res.data.data);
    } catch { toast.error('Failed to load suppliers'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const openCreate = () => { setForm(EMPTY_FORM); setEditId(null); setModal('create'); };
  const openEdit = (s: Supplier) => {
    setForm({ ...EMPTY_FORM, name: s.name, contact_person: s.contact_person || '', email: s.email || '', phone: s.phone || '', city: s.city || '', tax_id: s.tax_id || '', payment_terms: String(s.payment_terms) });
    setEditId(s.id); setModal('edit');
  };

  const handleSave = async () => {
    if (!form.name) return toast.error('Supplier name is required');
    setSaving(true);
    try {
      if (editId) { await suppliersAPI.update(editId, form); toast.success('Supplier updated'); }
      else { await suppliersAPI.create(form); toast.success('Supplier created'); }
      setModal(null); fetchSuppliers();
    } catch { toast.error('Failed to save supplier'); }
    finally { setSaving(false); }
  };

  const columns = [
    {
      key: 'name', label: 'Supplier',
      render: (s: Supplier) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
            <Truck className="w-5 h-5 text-brand-500" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{s.name}</p>
            <p className="text-xs text-gray-400">{s.contact_person || '—'}</p>
          </div>
        </div>
      )
    },
    {
      key: 'email', label: 'Contact',
      render: (s: Supplier) => (
        <div className="space-y-0.5">
          {s.email && <p className="text-xs flex items-center gap-1 text-gray-500"><Mail className="w-3 h-3" />{s.email}</p>}
          {s.phone && <p className="text-xs flex items-center gap-1 text-gray-500"><Phone className="w-3 h-3" />{s.phone}</p>}
        </div>
      )
    },
    { key: 'city', label: 'City', render: (s: Supplier) => <span className="flex items-center gap-1 text-sm text-gray-500"><MapPin className="w-3 h-3" />{s.city || '—'}</span> },
    { key: 'tax_id', label: 'Tax ID', render: (s: Supplier) => <span className="text-xs font-mono text-gray-500">{s.tax_id || '—'}</span> },
    { key: 'payment_terms', label: 'Payment Terms', render: (s: Supplier) => <span className="text-sm">{s.payment_terms} days</span> },
    { key: 'is_active', label: 'Status', render: (s: Supplier) => <StatusBadge status={s.is_active ? 'active' : 'inactive'} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Suppliers"
        subtitle={`${suppliers.length} registered suppliers`}
        actions={
          hasPermission('suppliers', 'manage') ? (
            <button className="btn-primary" onClick={openCreate}><Plus className="w-4 h-4" />Add Supplier</button>
          ) : undefined
        }
      />

      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9" placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card overflow-hidden">
        <DataTable
          columns={columns}
          data={suppliers}
          loading={loading}
          onRowClick={hasPermission('suppliers', 'manage') ? openEdit : undefined}
          emptyState={<EmptyState icon={<Truck className="w-6 h-6" />} title="No suppliers found" description="Add your first supplier to track purchases" />}
        />
      </div>

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal === 'edit' ? 'Edit Supplier' : 'Add Supplier'} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <FormField label="Company Name" required>
              <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="ABC Trading Co." />
            </FormField>
          </div>
          <FormField label="Contact Person">
            <input className="input" value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} placeholder="Full name" />
          </FormField>
          <FormField label="Phone">
            <input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="01700000000" />
          </FormField>
          <FormField label="Email">
            <input type="email" className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="contact@supplier.com" />
          </FormField>
          <FormField label="City">
            <input className="input" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Dhaka" />
          </FormField>
          <FormField label="Address">
            <input className="input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Street address" />
          </FormField>
          <FormField label="Tax ID (TIN)">
            <input className="input" value={form.tax_id} onChange={e => setForm({ ...form, tax_id: e.target.value })} placeholder="TIN-000000" />
          </FormField>
          <div className="col-span-2">
            <FormField label="Payment Terms (days)">
              <input type="number" className="input" value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: e.target.value })} />
            </FormField>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : modal === 'edit' ? 'Update Supplier' : 'Add Supplier'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

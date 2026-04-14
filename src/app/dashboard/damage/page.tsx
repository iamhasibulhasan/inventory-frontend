'use client';
import { useState, useEffect, useCallback } from 'react';
import { damageAPI, commercialAPI, warehouseAPI } from '@/lib/api';
import { PageHeader, DataTable, StatusBadge, Modal, FormField, EmptyState } from '@/components/ui';
import { AlertTriangle, Plus, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store';
import { format } from 'date-fns';

type DamageLog = Record<string, unknown>;

export default function DamagePage() {
  const { can } = useAuthStore();
  const [logs, setLogs] = useState<DamageLog[]>([]);
  const [products, setProducts] = useState<Record<string,unknown>[]>([]);
  const [bins, setBins] = useState<Record<string,unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ product_id:'', variant_id:'', from_bin_id:'', to_bin_id:'', quantity:'1', damage_type:'damage', reason:'' });
  const [statusFilter, setStatusFilter] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const r = await damageAPI.getAll({ status: statusFilter||undefined });
      setLogs(r.data.data);
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => {
    commercialAPI.getProducts({ limit:200 }).then(r=>setProducts(r.data.data)).catch(()=>{});
    warehouseAPI.getBins().then(r=>setBins(r.data.data)).catch(()=>{});
  }, []);

  const handleCreate = async () => {
    if (!form.product_id || !form.quantity) return toast.error('Product and quantity required');
    setSaving(true);
    try {
      await damageAPI.create({ ...form, quantity: parseInt(form.quantity) });
      toast.success('Damage declaration submitted');
      setModal(false);
      fetch();
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  const handleApprove = async (id: string) => {
    try { await damageAPI.approve(id); toast.success('Damage approved — stock updated'); fetch(); } catch { toast.error('Failed'); }
  };
  const handleReject = async (id: string) => {
    try { await damageAPI.reject(id); toast.success('Damage rejected'); fetch(); } catch { toast.error('Failed'); }
  };

  const columns = [
    { key: 'damage_number', label: 'Damage #', render: (r: DamageLog) => <span className="font-semibold text-red-600">{r.damage_number as string}</span> },
    { key: 'product_name', label: 'Product', render: (r: DamageLog) => <div><p className="font-medium text-sm">{r.product_name as string}</p><p className="text-xs text-gray-400 font-mono">{r.sku as string}</p></div> },
    { key: 'damage_type', label: 'Type', render: (r: DamageLog) => <StatusBadge status={r.damage_type as string}/> },
    { key: 'quantity', label: 'Qty', render: (r: DamageLog) => <span className="font-bold text-red-500">{r.quantity as string}</span> },
    { key: 'from_bin_code', label: 'From Bin', render: (r: DamageLog) => <span className="font-mono text-xs">{(r.from_bin_code as string)||'—'}</span> },
    { key: 'to_bin_code', label: 'To Bin', render: (r: DamageLog) => <span className="font-mono text-xs">{(r.to_bin_code as string)||'—'}</span> },
    { key: 'declared_by_name', label: 'Declared By', render: (r: DamageLog) => <span className="text-sm text-gray-500">{r.declared_by_name as string}</span> },
    { key: 'status', label: 'Status', render: (r: DamageLog) => <StatusBadge status={r.status as string}/> },
    { key: 'created_at', label: 'Date', render: (r: DamageLog) => (() => { try { return format(new Date(r.created_at as string),'dd MMM yy'); } catch { return '—'; } })() },
    {
      key: 'actions', label: '',
      render: (r: DamageLog) => r.status==='pending' && can('damage_management','edit') ? (
        <div className="flex gap-1">
          <button onClick={e=>{e.stopPropagation();handleApprove(r.id as string);}} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600"><CheckCircle className="w-3.5 h-3.5"/></button>
          <button onClick={e=>{e.stopPropagation();handleReject(r.id as string);}} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><XCircle className="w-3.5 h-3.5"/></button>
        </div>
      ) : null
    },
  ];

  return (
    <div>
      <PageHeader title="Damage Management" subtitle="Track damaged, expired, lost, and scrap stock"
        actions={can('damage_management','create') ? <button className="btn-danger" onClick={()=>{setForm({product_id:'',variant_id:'',from_bin_id:'',to_bin_id:'',quantity:'1',damage_type:'damage',reason:''});setModal(true);}}><Plus className="w-4 h-4"/>Declare Damage</button> : undefined}
      />

      <div className="flex items-center gap-1 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 p-1 mb-5">
        {['','pending','approved','rejected'].map(s=>(
          <button key={s} onClick={()=>setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${statusFilter===s?'bg-brand-500 text-white':'text-gray-500 hover:bg-gray-100'}`}>
            {s||'All'}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <DataTable columns={columns} data={logs} loading={loading}
          emptyState={<EmptyState icon={<AlertTriangle className="w-6 h-6"/>} title="No damage records" description="Declare damaged, expired, or lost products here"/>}
        />
      </div>

      <Modal isOpen={modal} onClose={()=>setModal(false)} title="Declare Damage / Loss">
        <div className="space-y-4">
          <FormField label="Product" required>
            <select className="select" value={form.product_id} onChange={e=>setForm({...form,product_id:e.target.value})}>
              <option value="">Select product</option>
              {products.map(p=><option key={p.id as string} value={p.id as string}>{p.name as string} ({p.sku as string})</option>)}
            </select>
          </FormField>
          <FormField label="Damage Type" required>
            <select className="select" value={form.damage_type} onChange={e=>setForm({...form,damage_type:e.target.value})}>
              {['damage','expired','lost','scrap'].map(t=><option key={t}>{t}</option>)}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Source Bin (From)">
              <select className="select" value={form.from_bin_id} onChange={e=>setForm({...form,from_bin_id:e.target.value})}>
                <option value="">Select bin</option>
                {bins.filter(b=>b.bin_type==='good').map(b=><option key={b.id as string} value={b.id as string}>{b.code as string} — {b.name as string}</option>)}
              </select>
            </FormField>
            <FormField label="Destination Bin (To)">
              <select className="select" value={form.to_bin_id} onChange={e=>setForm({...form,to_bin_id:e.target.value})}>
                <option value="">Select bin</option>
                {bins.filter(b=>['scrap','damage'].includes(b.bin_type as string)).map(b=><option key={b.id as string} value={b.id as string}>{b.code as string} ({b.bin_type as string})</option>)}
              </select>
            </FormField>
          </div>
          <FormField label="Quantity" required>
            <input type="number" className="input" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})} min="1"/>
          </FormField>
          <FormField label="Reason / Notes">
            <textarea className="input resize-none" rows={3} value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})} placeholder="Describe how the damage occurred..."/>
          </FormField>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100">
          <button className="btn-secondary" onClick={()=>setModal(false)}>Cancel</button>
          <button className="btn-danger" onClick={handleCreate} disabled={saving}>{saving?'Submitting...':'Submit Declaration'}</button>
        </div>
      </Modal>
    </div>
  );
}

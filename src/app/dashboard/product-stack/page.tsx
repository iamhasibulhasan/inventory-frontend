'use client';
import { useState, useEffect, useCallback } from 'react';
import { stackAPI, warehouseAPI } from '@/lib/api';
import { PageHeader, DataTable, StatusBadge, Modal, FormField, EmptyState, Badge } from '@/components/ui';
import { Layers, Plus, MapPin, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

type InboundItem = Record<string, unknown>;
type Bin = Record<string, unknown>;

export default function ProductStackPage() {
  const [pendingItems, setPendingItems] = useState<InboundItem[]>([]);
  const [stackedItems, setStackedItems] = useState<Record<string,unknown>[]>([]);
  const [stores, setStores] = useState<Record<string,unknown>[]>([]);
  const [bins, setBins] = useState<Bin[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pending'|'stacked'>('pending');
  const [modal, setModal] = useState<InboundItem|null>(null);
  const [form, setForm] = useState({ store_id:'', bin_id:'', quantity:'', notes:'' });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'pending') {
        const r = await stackAPI.getInboundPending();
        setPendingItems(r.data.data);
      } else {
        const r = await stackAPI.getAll({ status: 'stacked' });
        setStackedItems(r.data.data);
      }
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { warehouseAPI.getStores().then(r=>setStores(r.data.data)).catch(()=>{}); }, []);

  const loadBins = async (storeId: string) => {
    try {
      const r = await stackAPI.getBins(storeId);
      setBins(r.data.data);
    } catch {}
  };

  const openStack = (item: InboundItem) => {
    setModal(item);
    setForm({ store_id: item.store_id as string||'', bin_id:'', quantity: String(Number(item.received_quantity||0)-Number(item.stacked_qty||0)), notes:'' });
    if (item.store_id) loadBins(item.store_id as string);
  };

  const handleStack = async () => {
    if (!modal) return;
    if (!form.bin_id || !form.quantity) return toast.error('Select bin and enter quantity');
    setSaving(true);
    try {
      await stackAPI.create({
        inbound_id: modal.inbound_id,
        product_id: modal.product_id,
        variant_id: modal.variant_id,
        bin_id: form.bin_id,
        quantity: parseInt(form.quantity),
        notes: form.notes,
      });
      toast.success('Product stacked successfully!');
      setModal(null);
      fetchData();
    } catch (e: unknown) { toast.error((e as {response?:{data?:{message?:string}}})?.response?.data?.message||'Failed'); }
    finally { setSaving(false); }
  };

  const pendingColumns = [
    { key: 'product_name', label: 'Product', render: (r: InboundItem) => (
      <div>
        <p className="font-medium text-gray-900 dark:text-white">{r.product_name as string}</p>
        <p className="text-xs text-gray-400 font-mono">{r.sku as string}</p>
      </div>
    )},
    { key: 'inbound_number', label: 'Inbound Ref', render: (r: InboundItem) => <Badge variant="info">{r.inbound_number as string}</Badge> },
    { key: 'store_name', label: 'Store', render: (r: InboundItem) => <span className="text-sm text-gray-500">{r.store_name as string}</span> },
    { key: 'received_quantity', label: 'Total Received', render: (r: InboundItem) => <span className="font-semibold">{r.received_quantity as string}</span> },
    { key: 'stacked_qty', label: 'Already Stacked', render: (r: InboundItem) => <span className="text-green-600">{r.stacked_qty as string||'0'}</span> },
    { key: 'remaining', label: 'Remaining', render: (r: InboundItem) => {
      const rem = Number(r.received_quantity||0)-Number(r.stacked_qty||0);
      return <span className={`font-bold ${rem>0?'text-orange-500':'text-gray-400'}`}>{rem}</span>;
    }},
    {
      key: 'actions', label: '',
      render: (r: InboundItem) => {
        const rem = Number(r.received_quantity||0)-Number(r.stacked_qty||0);
        return rem > 0 ? (
          <button onClick={e=>{e.stopPropagation();openStack(r);}} className="btn-primary btn-sm"><Layers className="w-3 h-3"/>Stack</button>
        ) : <Badge variant="success">✓ Done</Badge>;
      }
    },
  ];

  const stackedColumns = [
    { key: 'product_name', label: 'Product', render: (r: Record<string,unknown>) => (
      <div><p className="font-medium">{r.product_name as string}</p><p className="text-xs text-gray-400 font-mono">{r.sku as string}</p></div>
    )},
    { key: 'bin_code', label: 'Bin', render: (r: Record<string,unknown>) => (
      <div className="flex items-center gap-1.5 text-sm"><MapPin className="w-3.5 h-3.5 text-brand-500"/><span className="font-mono font-medium">{r.bin_code as string}</span></div>
    )},
    { key: 'bin_type', label: 'Bin Type', render: (r: Record<string,unknown>) => <StatusBadge status={r.bin_type as string}/> },
    { key: 'quantity', label: 'Quantity', render: (r: Record<string,unknown>) => <span className="font-bold text-lg">{r.quantity as string}</span> },
    { key: 'stacked_by_name', label: 'Stacked By', render: (r: Record<string,unknown>) => <span className="text-sm text-gray-500">{r.stacked_by_name as string}</span> },
    { key: 'stacked_at', label: 'Stacked At', render: (r: Record<string,unknown>) => r.stacked_at ? (() => { try { return format(new Date(r.stacked_at as string),'dd MMM yy, HH:mm'); } catch { return '—'; } })() : '—' },
    { key: 'status', label: 'Status', render: (r: Record<string,unknown>) => <StatusBadge status={r.status as string}/> },
  ];

  return (
    <div>
      <PageHeader title="Product Stack" subtitle="Stack received products into warehouse bins" />

      <div className="flex items-center gap-1 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-1 mb-5 w-fit">
        {[{k:'pending',l:'📦 Pending for Stack'},{k:'stacked',l:'✅ Stacked Products'}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k as 'pending'|'stacked')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab===t.k?'bg-brand-500 text-white':'text-gray-600 hover:bg-gray-100'}`}>
            {t.l}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {tab==='pending' ? (
          <DataTable columns={pendingColumns} data={pendingItems} loading={loading}
            emptyState={<EmptyState icon={<Package className="w-6 h-6"/>} title="No products pending for stack" description="Complete an inbound to see products here"/>}
          />
        ) : (
          <DataTable columns={stackedColumns} data={stackedItems} loading={loading}
            emptyState={<EmptyState icon={<Layers className="w-6 h-6"/>} title="No stacked products"/>}
          />
        )}
      </div>

      {/* Stack Modal */}
      {modal && (
        <Modal isOpen={!!modal} onClose={()=>setModal(null)} title={`Stack: ${modal.product_name as string}`}>
          <div className="space-y-4">
            <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-xl text-sm">
              <p className="text-brand-700 dark:text-brand-300 font-medium">Select a bin to store this product</p>
              <p className="text-brand-500 text-xs mt-0.5">Available: {Number(modal.received_quantity||0)-Number(modal.stacked_qty||0)} units</p>
            </div>

            <FormField label="Warehouse / Store">
              <select className="select" value={form.store_id} onChange={e=>{setForm({...form,store_id:e.target.value,bin_id:''});loadBins(e.target.value);}}>
                <option value="">Select store</option>
                {stores.map(s=><option key={s.id as string} value={s.id as string}>{s.name as string}</option>)}
              </select>
            </FormField>

            {bins.length > 0 && (
              <FormField label="Select Bin" required>
                <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto">
                  {bins.map(bin=>(
                    <button key={bin.id as string} type="button"
                      onClick={()=>setForm({...form,bin_id:bin.id as string})}
                      className={`p-2.5 rounded-xl border-2 text-left transition-all ${form.bin_id===bin.id?'border-brand-500 bg-brand-50 dark:bg-brand-900/20':'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                      <p className="font-mono text-xs font-semibold text-gray-900 dark:text-white">{bin.code as string}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{bin.row_name as string} → {bin.rack_name as string}</p>
                      <div className="flex items-center justify-between mt-1">
                        <StatusBadge status={bin.bin_type as string}/>
                        <span className="text-[10px] text-gray-400">{bin.current_stock as string}/{bin.max_capacity as string}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </FormField>
            )}

            <FormField label="Quantity" required>
              <input type="number" className="input" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})} min="1"
                max={String(Number(modal.received_quantity||0)-Number(modal.stacked_qty||0))}/>
            </FormField>
            <FormField label="Notes">
              <input className="input" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/>
            </FormField>
          </div>
          <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button className="btn-secondary" onClick={()=>setModal(null)}>Cancel</button>
            <button className="btn-primary" onClick={handleStack} disabled={saving||!form.bin_id}>{saving?'Stacking...':'Confirm Stack'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

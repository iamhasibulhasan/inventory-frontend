'use client';
import { useState, useEffect, useCallback } from 'react';
import { prAPI, suppliersAPI, commercialAPI } from '@/lib/api';
import { PageHeader, DataTable, StatusBadge, Modal, FormField, EmptyState, Badge } from '@/components/ui';
import { Plus, ClipboardList, CheckCircle, XCircle, Eye, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store';
import { format } from 'date-fns';

type PR = Record<string, unknown>;
type Supplier = { id: string; name: string };
type Product = { id: string; name: string; sku: string; purchase_price: number };

export default function PurchaseRequisitionPage() {
  const { can } = useAuthStore();
  const [prs, setPRs] = useState<PR[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState<string|null>(null);
  const [selected, setSelected] = useState<PR|null>(null);
  const [detail, setDetail] = useState<PR|null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ supplier_id:'', priority:'normal', required_date:'', notes:'' });
  const [items, setItems] = useState([{ product_id:'', quantity:'1', unit_price:'' }]);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const r = await prAPI.getAll({ status: statusFilter || undefined });
      setPRs(r.data.data);
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => {
    suppliersAPI.getAll().then(r=>setSuppliers(r.data.data)).catch(()=>{});
    commercialAPI.getProducts({ limit:200 }).then(r=>setProducts(r.data.data)).catch(()=>{});
  }, []);

  const viewDetail = async (pr: PR) => {
    try {
      const r = await prAPI.getById(pr.id as string);
      setDetail(r.data.data);
      setModal('view');
    } catch { toast.error('Failed to load detail'); }
  };

  const handleCreate = async () => {
    if (!form.supplier_id) return toast.error('Select supplier');
    if (!items[0].product_id) return toast.error('Add at least one product');
    setSaving(true);
    try {
      await prAPI.create({ ...form, items: items.map(i=>({...i,quantity:parseInt(i.quantity),unit_price:parseFloat(i.unit_price)||0})) });
      toast.success('PR created');
      setModal(null);
      fetch();
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  const handleSubmit = async (id: string) => {
    try { await prAPI.submit(id); toast.success('PR submitted for approval'); fetch(); } catch { toast.error('Failed'); }
  };

  const handleApprove = async (id: string) => {
    try {
      await prAPI.approve(id);
      toast.success('PR approved — Purchase Order created automatically!');
      fetch();
    } catch { toast.error('Failed'); }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Rejection reason:');
    if (reason === null) return;
    try { await prAPI.reject(id, { reason }); toast.success('PR rejected'); fetch(); } catch { toast.error('Failed'); }
  };

  const STATUS_TABS = ['','draft','pending','approved','rejected','converted'];

  const columns = [
    { key: 'pr_number', label: 'PR Number', render: (r: PR) => <span className="font-semibold text-brand-600">{r.pr_number as string}</span> },
    { key: 'supplier_name', label: 'Supplier', render: (r: PR) => <span className="text-sm">{r.supplier_name as string}</span> },
    { key: 'requested_by_name', label: 'Requested By', render: (r: PR) => <span className="text-sm text-gray-500">{(r.requested_by_name as string)||'—'}</span> },
    { key: 'item_count', label: 'Items', render: (r: PR) => <Badge variant="info">{r.item_count as string} items</Badge> },
    { key: 'priority', label: 'Priority', render: (r: PR) => <StatusBadge status={r.priority as string}/> },
    { key: 'status', label: 'Status', render: (r: PR) => <StatusBadge status={r.status as string}/> },
    { key: 'required_date', label: 'Required', render: (r: PR) => r.required_date ? (() => { try { return format(new Date(r.required_date as string),'dd MMM'); } catch { return '—'; } })() : '—' },
    { key: 'created_at', label: 'Created', render: (r: PR) => (() => { try { return format(new Date(r.created_at as string),'dd MMM yy'); } catch { return '—'; } })() },
    {
      key: 'actions', label: '',
      render: (r: PR) => (
        <div className="flex items-center gap-1">
          <button onClick={e=>{e.stopPropagation();viewDetail(r);}} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500" title="View"><Eye className="w-3.5 h-3.5"/></button>
          {r.status==='draft' && can('purchase_requisition','edit') && (
            <button onClick={e=>{e.stopPropagation();handleSubmit(r.id as string);}} className="p-1.5 rounded-lg hover:bg-yellow-50 text-yellow-600" title="Submit"><Send className="w-3.5 h-3.5"/></button>
          )}
          {r.status==='pending' && can('purchase_requisition','edit') && <>
            <button onClick={e=>{e.stopPropagation();handleApprove(r.id as string);}} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600" title="Approve"><CheckCircle className="w-3.5 h-3.5"/></button>
            <button onClick={e=>{e.stopPropagation();handleReject(r.id as string);}} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Reject"><XCircle className="w-3.5 h-3.5"/></button>
          </>}
        </div>
      )
    },
  ];

  return (
    <div>
      <PageHeader title="Purchase Requisition" subtitle="Request products from suppliers"
        actions={can('purchase_requisition','create') ? <button className="btn-primary" onClick={()=>{setForm({supplier_id:'',priority:'normal',required_date:'',notes:''});setItems([{product_id:'',quantity:'1',unit_price:''}]);setModal('create');}}><Plus className="w-4 h-4"/>New Requisition</button> : undefined}
      />

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-1 flex-wrap mb-5">
        {STATUS_TABS.map(s=>(
          <button key={s} onClick={()=>setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${statusFilter===s?'bg-brand-500 text-white':'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            {s||'All'}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <DataTable columns={columns} data={prs} loading={loading}
          emptyState={<EmptyState icon={<ClipboardList className="w-6 h-6"/>} title="No purchase requisitions" description="Create a requisition to request products from suppliers"/>}
        />
      </div>

      {/* Create PR Modal */}
      <Modal isOpen={modal==='create'} onClose={()=>setModal(null)} title="New Purchase Requisition" size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Supplier" required className="col-span-2">
              <select className="select" value={form.supplier_id} onChange={e=>setForm({...form,supplier_id:e.target.value})}>
                <option value="">Select supplier</option>
                {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </FormField>
            <FormField label="Priority">
              <select className="select" value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}>
                {['low','normal','high','urgent'].map(p=><option key={p}>{p}</option>)}
              </select>
            </FormField>
          </div>
          <FormField label="Required Date">
            <input type="date" className="input" value={form.required_date} onChange={e=>setForm({...form,required_date:e.target.value})}/>
          </FormField>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Products *</label>
              <button type="button" onClick={()=>setItems([...items,{product_id:'',quantity:'1',unit_price:''}])} className="text-xs text-brand-500 hover:underline font-medium">+ Add Row</button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select className="select flex-1" value={item.product_id}
                    onChange={e=>{
                      const updated=[...items]; updated[i]={...updated[i],product_id:e.target.value};
                      const p=products.find(p=>p.id===e.target.value);
                      if(p) updated[i].unit_price=String(p.purchase_price);
                      setItems(updated);
                    }}>
                    <option value="">Select product</option>
                    {products.map(p=><option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                  </select>
                  <input type="number" className="input w-24" placeholder="Qty" value={item.quantity}
                    onChange={e=>{const u=[...items];u[i]={...u[i],quantity:e.target.value};setItems(u);}} min="1"/>
                  <input type="number" className="input w-28" placeholder="Unit price ৳" value={item.unit_price}
                    onChange={e=>{const u=[...items];u[i]={...u[i],unit_price:e.target.value};setItems(u);}}/>
                  {items.length>1 && <button onClick={()=>setItems(items.filter((_,idx)=>idx!==i))} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>}
                </div>
              ))}
            </div>
          </div>
          <FormField label="Notes">
            <textarea className="input resize-none" rows={2} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/>
          </FormField>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button className="btn-secondary" onClick={()=>setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={handleCreate} disabled={saving}>{saving?'Creating...':'Create PR'}</button>
        </div>
      </Modal>

      {/* View PR Detail */}
      {detail && (
        <Modal isOpen={modal==='view'} onClose={()=>setModal(null)} title={`PR: ${detail.pr_number as string}`} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                {l:'Status',v:<StatusBadge status={detail.status as string}/>},
                {l:'Priority',v:<StatusBadge status={detail.priority as string}/>},
                {l:'Supplier',v:<span className="font-medium text-sm">{detail.supplier_name as string}</span>},
              ].map(({l,v})=>(
                <div key={l} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">{l}</p>{v}
                </div>
              ))}
            </div>
            <div>
              <p className="label mb-2">Items</p>
              <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>{['Product','SKU','Qty','Unit Price'].map(h=><th key={h} className="px-4 py-2.5 text-left table-header">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {((detail.items as Record<string,unknown>[])||[]).map((item,i)=>(
                      <tr key={i} className="bg-white dark:bg-gray-900">
                        <td className="px-4 py-2.5 font-medium">{item.product_name as string}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{item.sku as string}</td>
                        <td className="px-4 py-2.5">{item.requested_quantity as string}</td>
                        <td className="px-4 py-2.5">৳{Number(item.unit_price||0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

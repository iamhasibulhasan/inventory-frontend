'use client';
import { useState, useEffect, useCallback } from 'react';
import { poAPI, warehouseAPI } from '@/lib/api';
import { PageHeader, DataTable, StatusBadge, Modal, EmptyState, Badge } from '@/components/ui';
import { FileText, CheckCircle, Eye, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store';
import { format } from 'date-fns';

type PO = Record<string, unknown>;

export default function PurchaseOrderPage() {
  const { can } = useAuthStore();
  const [pos, setPOs] = useState<PO[]>([]);
  const [stores, setStores] = useState<Record<string,unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [detail, setDetail] = useState<PO|null>(null);
  const [modal, setModal] = useState(false);
  const [opsModal, setOpsModal] = useState<PO|null>(null);
  const [opsStoreId, setOpsStoreId] = useState('');
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const r = await poAPI.getAll({ status: statusFilter||undefined });
      setPOs(r.data.data);
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => { warehouseAPI.getStores().then(r=>setStores(r.data.data)).catch(()=>{}); }, []);

  const viewDetail = async (po: PO) => {
    try {
      const r = await poAPI.getById(po.id as string);
      setDetail(r.data.data);
      setModal(true);
    } catch { toast.error('Failed'); }
  };

  const handleApprove = async (id: string) => {
    try { await poAPI.approve(id); toast.success('PO approved — sent to operations'); fetch(); } catch { toast.error('Failed'); }
  };

  const handleOpsApprove = async () => {
    if (!opsStoreId) return toast.error('Select a store/warehouse');
    setSaving(true);
    try {
      await poAPI.operationsApprove(opsModal!.id as string, { store_id: opsStoreId });
      toast.success('Operations approved — Inbound record created!');
      setOpsModal(null); fetch();
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  const STATUS_TABS = ['','pending','approved','operations_approved','inbound','completed','cancelled'];

  const columns = [
    { key: 'po_number', label: 'PO Number', render: (r: PO) => <span className="font-semibold text-brand-600">{r.po_number as string}</span> },
    { key: 'supplier_name', label: 'Supplier', render: (r: PO) => <span className="text-sm">{r.supplier_name as string}</span> },
    { key: 'store_name', label: 'Store', render: (r: PO) => <span className="text-sm text-gray-500">{(r.store_name as string)||'—'}</span> },
    { key: 'total_amount', label: 'Total', render: (r: PO) => <span className="font-semibold">৳{Number(r.total_amount).toLocaleString()}</span> },
    { key: 'payment_status', label: 'Payment', render: (r: PO) => <StatusBadge status={r.payment_status as string}/> },
    { key: 'status', label: 'Status', render: (r: PO) => <StatusBadge status={r.status as string}/> },
    { key: 'order_date', label: 'Date', render: (r: PO) => (() => { try { return format(new Date(r.order_date as string),'dd MMM yy'); } catch { return '—'; } })() },
    {
      key: 'actions', label: '',
      render: (r: PO) => (
        <div className="flex items-center gap-1">
          <button onClick={e=>{e.stopPropagation();viewDetail(r);}} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Eye className="w-3.5 h-3.5"/></button>
          {r.status==='pending' && can('purchase_order','edit') && (
            <button onClick={e=>{e.stopPropagation();handleApprove(r.id as string);}} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600" title="Approve"><CheckCircle className="w-3.5 h-3.5"/></button>
          )}
          {r.status==='approved' && can('purchase_order','edit') && (
            <button onClick={e=>{e.stopPropagation();setOpsModal(r);setOpsStoreId('');}} className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600 text-xs font-semibold" title="Operations Approve"><Package className="w-3.5 h-3.5"/></button>
          )}
        </div>
      )
    },
  ];

  return (
    <div>
      <PageHeader title="Purchase Orders" subtitle="Manage purchase orders and approvals" />

      <div className="flex items-center gap-1 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-1 flex-wrap mb-5">
        {STATUS_TABS.map(s=>(
          <button key={s} onClick={()=>setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all whitespace-nowrap ${statusFilter===s?'bg-brand-500 text-white':'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            {s.replace(/_/g,' ')||'All'}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <DataTable columns={columns} data={pos} loading={loading}
          onRowClick={viewDetail}
          emptyState={<EmptyState icon={<FileText className="w-6 h-6"/>} title="No purchase orders" description="Purchase orders are auto-created when PRs are approved"/>}
        />
      </div>

      {/* Detail Modal */}
      {detail && (
        <Modal isOpen={modal} onClose={()=>setModal(false)} title={`PO: ${detail.po_number as string}`} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[{l:'Status',v:<StatusBadge status={detail.status as string}/>},{l:'Supplier',v:<span className="text-sm font-medium">{detail.supplier_name as string}</span>},{l:'Total',v:<span className="font-bold text-brand-600">৳{Number(detail.total_amount).toLocaleString()}</span>}].map(({l,v})=>(
                <div key={l} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3"><p className="text-xs text-gray-400 mb-1">{l}</p>{v}</div>
              ))}
            </div>
            <div>
              <p className="label mb-2">Order Items</p>
              <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>{['Product','Qty','Rcvd','Unit Price','VAT','Total'].map(h=><th key={h} className="px-3 py-2 text-left table-header">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {((detail.items as Record<string,unknown>[])||[]).map((item,i)=>(
                      <tr key={i} className="bg-white dark:bg-gray-900">
                        <td className="px-3 py-2 font-medium">{item.product_name as string}</td>
                        <td className="px-3 py-2">{item.ordered_quantity as string}</td>
                        <td className="px-3 py-2 text-green-600">{item.received_quantity as string}</td>
                        <td className="px-3 py-2">৳{Number(item.unit_price).toLocaleString()}</td>
                        <td className="px-3 py-2">{item.vat_rate as string}%</td>
                        <td className="px-3 py-2 font-semibold">৳{Number(item.line_total||0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Ops Approve Modal */}
      {opsModal && (
        <Modal isOpen={!!opsModal} onClose={()=>setOpsModal(null)} title="Operations Approval" size="sm">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Approve PO <span className="font-semibold text-gray-900 dark:text-white">{opsModal.po_number as string}</span> and assign to a warehouse. This will create an inbound record.</p>
          <div className="space-y-3">
            <div>
              <label className="label">Destination Store / Warehouse *</label>
              <select className="select" value={opsStoreId} onChange={e=>setOpsStoreId(e.target.value)}>
                <option value="">Select warehouse</option>
                {stores.map(s=><option key={s.id as string} value={s.id as string}>{s.name as string}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button className="btn-secondary" onClick={()=>setOpsModal(null)}>Cancel</button>
            <button className="btn-success" onClick={handleOpsApprove} disabled={saving}>{saving?'Approving...':'Approve & Create Inbound'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

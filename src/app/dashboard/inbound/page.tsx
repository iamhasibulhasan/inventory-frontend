'use client';
import { useState, useEffect, useCallback } from 'react';
import { inboundAPI } from '@/lib/api';
import { PageHeader, DataTable, StatusBadge, Modal, FormField, EmptyState, Badge } from '@/components/ui';
import { PackageOpen, CheckCircle, Eye, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

type Inbound = Record<string, unknown>;
type POItem = Record<string, unknown>;

export default function InboundPage() {
  const [inbounds, setInbounds] = useState<Inbound[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [detail, setDetail] = useState<Inbound|null>(null);
  const [receiveModal, setReceiveModal] = useState<{inbound: Inbound; poItem: POItem}|null>(null);
  const [modal, setModal] = useState(false);
  const [receiveForm, setReceiveForm] = useState({ received_quantity:'', expiry_date:'', serial_numbers:'', item_condition:'good' });
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const r = await inboundAPI.getAll({ status: statusFilter||undefined });
      setInbounds(r.data.data);
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  const viewDetail = async (ib: Inbound) => {
    try {
      const r = await inboundAPI.getById(ib.id as string);
      setDetail(r.data.data);
      setModal(true);
    } catch { toast.error('Failed'); }
  };

  const handleReceiveItem = async () => {
    if (!receiveModal || !receiveForm.received_quantity) return toast.error('Enter quantity');
    setSaving(true);
    try {
      const serials = receiveForm.serial_numbers ? receiveForm.serial_numbers.split('\n').filter(Boolean) : [];
      await inboundAPI.addItem(receiveModal.inbound.id as string, {
        po_item_id: receiveModal.poItem.id,
        product_id: receiveModal.poItem.product_id,
        variant_id: receiveModal.poItem.variant_id,
        received_quantity: parseInt(receiveForm.received_quantity),
        expiry_date: receiveForm.expiry_date || null,
        serial_numbers: serials,
        item_condition: receiveForm.item_condition,
      });
      toast.success('Item received');
      setReceiveModal(null);
      const r = await inboundAPI.getById(receiveModal.inbound.id as string);
      setDetail(r.data.data);
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  const handleComplete = async (id: string) => {
    if (!confirm('Complete inbound? Stock will be updated and products marked as pending for stack.')) return;
    setSaving(true);
    try {
      await inboundAPI.complete(id);
      toast.success('Inbound completed! Products ready for stacking.');
      setModal(false);
      fetch();
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  const STATUS_TABS = ['','in_progress','pending_stack','completed'];

  const columns = [
    { key: 'inbound_number', label: 'Inbound #', render: (r: Inbound) => <span className="font-semibold text-brand-600">{r.inbound_number as string}</span> },
    { key: 'po_number', label: 'PO Reference', render: (r: Inbound) => <Badge variant="info">{r.po_number as string}</Badge> },
    { key: 'store_name', label: 'Warehouse', render: (r: Inbound) => <span className="text-sm">{r.store_name as string}</span> },
    { key: 'received_by_name', label: 'Received By', render: (r: Inbound) => <span className="text-sm text-gray-500">{(r.received_by_name as string)||'—'}</span> },
    { key: 'item_count', label: 'Items', render: (r: Inbound) => <span className="font-semibold">{r.item_count as string}</span> },
    { key: 'status', label: 'Status', render: (r: Inbound) => <StatusBadge status={r.status as string}/> },
    { key: 'received_date', label: 'Date', render: (r: Inbound) => (() => { try { return format(new Date(r.received_date as string),'dd MMM yy'); } catch { return '—'; } })() },
    {
      key: 'actions', label: '',
      render: (r: Inbound) => (
        <button onClick={e=>{e.stopPropagation();viewDetail(r);}} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Eye className="w-3.5 h-3.5"/></button>
      )
    },
  ];

  return (
    <div>
      <PageHeader title="Inbound" subtitle="Receive and verify incoming purchase orders" />

      <div className="flex items-center gap-1 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-1 flex-wrap mb-5">
        {STATUS_TABS.map(s=>(
          <button key={s} onClick={()=>setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all whitespace-nowrap ${statusFilter===s?'bg-brand-500 text-white':'text-gray-500 hover:bg-gray-100'}`}>
            {s.replace(/_/g,' ')||'All'}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <DataTable columns={columns} data={inbounds} loading={loading} onRowClick={viewDetail}
          emptyState={<EmptyState icon={<PackageOpen className="w-6 h-6"/>} title="No inbound records" description="Inbound records are created when Purchase Orders are operations-approved"/>}
        />
      </div>

      {/* Inbound Detail Modal */}
      {detail && (
        <Modal isOpen={modal} onClose={()=>setModal(false)} title={`Inbound: ${detail.inbound_number as string}`} size="xl">
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <StatusBadge status={detail.status as string}/>
              <span className="text-sm text-gray-500">PO: <span className="font-medium text-gray-800 dark:text-gray-200">{detail.po_number as string}</span></span>
              <span className="text-sm text-gray-500">Store: <span className="font-medium">{detail.store_name as string}</span></span>
            </div>

            {/* PO Items to receive */}
            {detail.status === 'in_progress' && (
              <div>
                <p className="label mb-2">PO Items (Click to receive)</p>
                <div className="space-y-2">
                  {((detail.po_items as POItem[])||[]).map(item=>(
                    <div key={item.id as string} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      <div>
                        <p className="font-medium text-sm">{item.product_name as string}</p>
                        <p className="text-xs text-gray-400 font-mono">{item.sku as string}</p>
                        {(item.has_expiry||item.has_serial) && (
                          <div className="flex gap-2 mt-1">
                            {item.has_expiry && <Badge variant="warning">Expiry Required</Badge>}
                            {item.has_serial && <Badge variant="info">Serial Required</Badge>}
                          </div>
                        )}
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div className="text-center">
                          <p className="text-xs text-gray-400">Ordered</p>
                          <p className="font-bold">{item.ordered_quantity as string}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-400">Received</p>
                          <p className="font-bold text-green-600">{item.received_quantity as string}</p>
                        </div>
                        <button
                          onClick={()=>{setReceiveModal({inbound:detail,poItem:item});setReceiveForm({received_quantity:String((item.ordered_quantity as number)-(item.received_quantity as number||0)),expiry_date:'',serial_numbers:'',item_condition:'good'});}}
                          className="btn-primary btn-sm">
                          <Plus className="w-3 h-3"/>Receive
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Received Items */}
            {((detail.items as Record<string,unknown>[])||[]).length > 0 && (
              <div>
                <p className="label mb-2">Received Items</p>
                <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800/50">
                      <tr>{['Product','Qty','Condition','Expiry'].map(h=><th key={h} className="px-4 py-2.5 text-left table-header">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {(detail.items as Record<string,unknown>[]).map((item,i)=>(
                        <tr key={i} className="bg-white dark:bg-gray-900">
                          <td className="px-4 py-2.5 font-medium">{item.product_name as string}</td>
                          <td className="px-4 py-2.5 font-semibold text-green-600">+{item.received_quantity as string}</td>
                          <td className="px-4 py-2.5"><StatusBadge status={item.item_condition as string}/></td>
                          <td className="px-4 py-2.5 text-xs text-gray-400">{item.expiry_date ? (() => { try { return format(new Date(item.expiry_date as string),'dd MMM yyyy'); } catch { return '—'; } })() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {detail.status==='in_progress' && (
              <div className="flex justify-end pt-2">
                <button className="btn-success" onClick={()=>handleComplete(detail.id as string)} disabled={saving}>
                  <CheckCircle className="w-4 h-4"/>{saving?'Completing...':'Complete Inbound'}
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Receive Item Modal */}
      {receiveModal && (
        <Modal isOpen={!!receiveModal} onClose={()=>setReceiveModal(null)} title={`Receive: ${receiveModal.poItem.product_name as string}`}>
          <div className="space-y-4">
            <FormField label="Received Quantity" required>
              <input type="number" className="input" value={receiveForm.received_quantity} onChange={e=>setReceiveForm({...receiveForm,received_quantity:e.target.value})} min="1"/>
            </FormField>
            <FormField label="Condition">
              <select className="select" value={receiveForm.item_condition} onChange={e=>setReceiveForm({...receiveForm,item_condition:e.target.value})}>
                {['good','damaged','expired'].map(c=><option key={c}>{c}</option>)}
              </select>
            </FormField>
            {receiveModal.poItem.has_expiry && (
              <FormField label="Expiry Date">
                <input type="date" className="input" value={receiveForm.expiry_date} onChange={e=>setReceiveForm({...receiveForm,expiry_date:e.target.value})}/>
              </FormField>
            )}
            {receiveModal.poItem.has_serial && (
              <FormField label="Serial Numbers (one per line)">
                <textarea className="input resize-none font-mono text-xs" rows={4} value={receiveForm.serial_numbers} onChange={e=>setReceiveForm({...receiveForm,serial_numbers:e.target.value})} placeholder="IMEI/Serial number&#10;one per line"/>
              </FormField>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button className="btn-secondary" onClick={()=>setReceiveModal(null)}>Cancel</button>
            <button className="btn-primary" onClick={handleReceiveItem} disabled={saving}>{saving?'Saving...':'Confirm Receipt'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

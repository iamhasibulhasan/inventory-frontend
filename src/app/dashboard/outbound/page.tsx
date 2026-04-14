'use client';
import { useState, useEffect, useCallback } from 'react';
import { outboundAPI, commercialAPI, warehouseAPI } from '@/lib/api';
import { PageHeader, DataTable, StatusBadge, Modal, FormField, EmptyState, Badge, StatCard } from '@/components/ui';
import { ShoppingCart, Plus, CheckCircle, XCircle, Eye, Package, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store';
import { format } from 'date-fns';

type Order = Record<string, unknown>;

export default function OutboundPage() {
  const { can } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [detail, setDetail] = useState<Order|null>(null);
  const [modal, setModal] = useState(false);

  const [createModal, setCreateModal] = useState(false);
const [products, setProducts] = useState<Record<string,unknown>[]>([]);
const [stores, setStores] = useState<Record<string,unknown>[]>([]);
const [orderForm, setOrderForm] = useState({
  order_source: 'manual', customer_name: '', customer_phone: '', customer_address: '',
  store_id: '', payment_method: 'cash', notes: '', shipping_charge: '0',
  items: [{ product_id: '', quantity: '1', unit_price: '' }]
});
const [orderSaving, setOrderSaving] = useState(false);
useEffect(() => {
  commercialAPI.getProducts({ limit: 200 }).then(r => setProducts(r.data.data)).catch(() => {});
  warehouseAPI.getStores().then(r => setStores(r.data.data)).catch(() => {});
}, []);

const handleCreateOrder = async () => {
  if (!orderForm.store_id) return toast.error('Select a warehouse');
  if (!orderForm.items[0].product_id) return toast.error('Add at least one product');
  setOrderSaving(true);
  try {
    await outboundAPI.create({
      order_source: orderForm.order_source,
      store_id: orderForm.store_id,
      payment_method: orderForm.payment_method,
      notes: orderForm.notes,
      shipping_charge: parseFloat(orderForm.shipping_charge) || 0,
      customer: {
        name: orderForm.customer_name || 'Walk-in Customer',
        phone: orderForm.customer_phone,
        address: orderForm.customer_address,
      },
      items: orderForm.items
        .filter(i => i.product_id)
        .map(i => ({
          product_id: i.product_id,
          quantity: parseInt(i.quantity),
          unit_price: parseFloat(i.unit_price),
        })),
    });
    toast.success('Order created successfully');
    setCreateModal(false);
    fetchOrders();
  } catch (e: unknown) {
    toast.error((e as {response?:{data?:{message?:string}}})?.response?.data?.message || 'Failed to create order');
  } finally { setOrderSaving(false); }
};

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [ordR, statR] = await Promise.all([
        outboundAPI.getAll({ status: statusFilter||undefined, source: sourceFilter||undefined }),
        outboundAPI.getStats()
      ]);
      setOrders(ordR.data.data);
      setStats(statR.data.data);
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  }, [statusFilter, sourceFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  const viewDetail = async (o: Order) => {
    try {
      const r = await outboundAPI.getById(o.id as string);
      setDetail(r.data.data);
      setModal(true);
    } catch {}
  };

  const handleApprove = async (id: string) => {
    try { await outboundAPI.approve(id); toast.success('Order approved — stock on hold'); fetch(); } catch (e: unknown) { toast.error((e as {response?:{data?:{message?:string}}})?.response?.data?.message||'Failed'); }
  };

  const handleSendPackaging = async (id: string) => {
    try { await outboundAPI.sendToPackaging(id); toast.success('Sent to packaging'); fetch(); } catch { toast.error('Failed'); }
  };

  const handleCancel = async (id: string) => {
    const reason = prompt('Cancellation reason:');
    if (reason === null) return;
    try { await outboundAPI.cancel(id, { reason }); toast.success('Order cancelled'); fetch(); } catch { toast.error('Failed'); }
  };

  const STATUS_TABS = ['','pending','approved','packaging','processing','shipped','delivered','cancelled'];
  const fmt = (n: number) => `৳${Number(n).toLocaleString('en-BD')}`;

  const columns = [
    { key: 'order_number', label: 'Order #', render: (r: Order) => <span className="font-semibold text-brand-600">{r.order_number as string}</span> },
    { key: 'order_source', label: 'Source', render: (r: Order) => <Badge variant={r.order_source==='marketplace'?'warning':r.order_source==='ecommerce'?'info':'default'}>{(r.order_source as string)?.replace('_',' ')}</Badge> },
    { key: 'customer_name', label: 'Customer', render: (r: Order) => <div><p className="text-sm font-medium">{(r.customer_name as string)||'Walk-in'}</p><p className="text-xs text-gray-400">{(r.customer_phone as string)||''}</p></div> },
    { key: 'item_count', label: 'Items', render: (r: Order) => <span className="font-medium">{r.item_count as string}</span> },
    { key: 'total_amount', label: 'Total', render: (r: Order) => <span className="font-semibold">{fmt(r.total_amount as number)}</span> },
    { key: 'payment_status', label: 'Payment', render: (r: Order) => <StatusBadge status={r.payment_status as string}/> },
    { key: 'status', label: 'Status', render: (r: Order) => <StatusBadge status={r.status as string}/> },
    { key: 'created_at', label: 'Date', render: (r: Order) => (() => { try { return format(new Date(r.created_at as string),'dd MMM yy'); } catch { return '—'; } })() },
    {
      key: 'actions', label: '',
      render: (r: Order) => (
        <div className="flex items-center gap-1">
          <button onClick={e=>{e.stopPropagation();viewDetail(r);}} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Eye className="w-3.5 h-3.5"/></button>
          {r.status==='pending' && can('outbound_orders','edit') && <button onClick={e=>{e.stopPropagation();handleApprove(r.id as string);}} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600"><CheckCircle className="w-3.5 h-3.5"/></button>}
          {r.status==='approved' && can('outbound_orders','edit') && <button onClick={e=>{e.stopPropagation();handleSendPackaging(r.id as string);}} className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600 text-xs font-bold" title="Send to Packaging"><Package className="w-3.5 h-3.5"/></button>}
          {!['shipped','delivered','cancelled'].includes(r.status as string) && can('outbound_orders','edit') && <button onClick={e=>{e.stopPropagation();handleCancel(r.id as string);}} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><XCircle className="w-3.5 h-3.5"/></button>}
        </div>
      )
    },
  ];

  return (
    <div>
      <PageHeader title="Outbound Orders" subtitle="Marketplace, e-commerce and manual orders"
        actions={can('outbound_orders','create') ? <button className="btn-primary" onClick={() => setCreateModal(true)}>
  <Plus className="w-4 h-4" /> New Order
</button> : undefined}
      />

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Pending', val: stats.pending||0, color: 'bg-yellow-50 text-yellow-600' },
          { label: 'Packaging', val: stats.packaging||0, color: 'bg-orange-50 text-orange-600' },
          { label: 'Shipped', val: stats.shipped||0, color: 'bg-cyan-50 text-cyan-600' },
          { label: 'Delivered', val: stats.delivered||0, color: 'bg-green-50 text-green-600' },
        ].map(s=>(
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}><TrendingUp className="w-5 h-5"/></div>
            <div><p className="text-xl font-bold">{s.val}</p><p className="text-xs text-gray-500">{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* Source filter */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-1 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 p-1">
          {['','marketplace','ecommerce','manual'].map(s=>(
            <button key={s} onClick={()=>setSourceFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${sourceFilter===s?'bg-brand-500 text-white':'text-gray-500 hover:bg-gray-100'}`}>
              {s||'All Sources'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 p-1 flex-wrap mb-5">
        {STATUS_TABS.map(s=>(
          <button key={s} onClick={()=>setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all whitespace-nowrap ${statusFilter===s?'bg-brand-500 text-white':'text-gray-500 hover:bg-gray-100'}`}>
            {s.replace(/_/g,' ')||'All'}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <DataTable columns={columns} data={orders} loading={loading} onRowClick={viewDetail}
          emptyState={<EmptyState icon={<ShoppingCart className="w-6 h-6"/>} title="No orders" description="Orders from marketplace, e-commerce, or manual entry appear here"/>}
        />
      </div>

      {/* Detail Modal */}
      {detail && (
        <Modal isOpen={modal} onClose={()=>setModal(false)} title={`Order: ${detail.order_number as string}`} size="xl">
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              {[
                {l:'Status',v:<StatusBadge status={detail.status as string}/>},
                {l:'Source',v:<Badge variant="info">{(detail.order_source as string)?.replace('_',' ')}</Badge>},
                {l:'Payment',v:<StatusBadge status={detail.payment_status as string}/>},
                {l:'Total',v:<span className="font-bold text-brand-600">{fmt(detail.total_amount as number)}</span>},
              ].map(({l,v})=>(
                <div key={l} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3"><p className="text-xs text-gray-400 mb-1">{l}</p>{v}</div>
              ))}
            </div>
            {detail.customer_name && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-2">Customer</p>
                <p className="font-semibold">{detail.customer_name as string}</p>
                <p className="text-sm text-gray-500">{(detail.customer_phone as string)||''}</p>
                <p className="text-sm text-gray-500">{(detail.customer_address as string)||''}</p>
              </div>
            )}
            <div>
              <p className="label mb-2">Order Items</p>
              <div className="overflow-hidden rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>{['Product','Variant','Qty','Unit Price','Total'].map(h=><th key={h} className="px-4 py-2.5 text-left table-header">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {((detail.items as Record<string,unknown>[])||[]).map((item,i)=>(
                      <tr key={i} className="bg-white dark:bg-gray-900">
                        <td className="px-4 py-2.5 font-medium">{item.product_name as string}</td>
                        <td className="px-4 py-2.5 text-gray-400 text-xs">{(item.variant_sku as string)||'—'}</td>
                        <td className="px-4 py-2.5">{item.quantity as string}</td>
                        <td className="px-4 py-2.5">{fmt(item.unit_price as number)}</td>
                        <td className="px-4 py-2.5 font-semibold">{fmt(item.line_total as number)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Create New Order" size="lg">
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <FormField label="Order Source">
        <select className="select" value={orderForm.order_source} onChange={e => setOrderForm({...orderForm, order_source: e.target.value})}>
          {['manual','ecommerce','marketplace'].map(s => <option key={s}>{s}</option>)}
        </select>
      </FormField>
      <FormField label="Warehouse *">
        <select className="select" value={orderForm.store_id} onChange={e => setOrderForm({...orderForm, store_id: e.target.value})}>
          <option value="">Select warehouse</option>
          {stores.map(s => <option key={s.id as string} value={s.id as string}>{s.name as string}</option>)}
        </select>
      </FormField>
      <FormField label="Customer Name">
        <input className="input" value={orderForm.customer_name} onChange={e => setOrderForm({...orderForm, customer_name: e.target.value})} placeholder="Walk-in Customer" />
      </FormField>
      <FormField label="Customer Phone">
        <input className="input" value={orderForm.customer_phone} onChange={e => setOrderForm({...orderForm, customer_phone: e.target.value})} placeholder="017XXXXXXXX" />
      </FormField>
      <FormField label="Payment Method">
        <select className="select" value={orderForm.payment_method} onChange={e => setOrderForm({...orderForm, payment_method: e.target.value})}>
          {['cash','card','bkash','nagad','bank_transfer'].map(m => <option key={m}>{m}</option>)}
        </select>
      </FormField>
      <FormField label="Shipping Charge (৳)">
        <input type="number" className="input" value={orderForm.shipping_charge} onChange={e => setOrderForm({...orderForm, shipping_charge: e.target.value})} />
      </FormField>
    </div>

    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="label mb-0">Order Items *</label>
        <button type="button" className="text-xs text-brand-500 hover:underline"
          onClick={() => setOrderForm({...orderForm, items: [...orderForm.items, {product_id:'', quantity:'1', unit_price:''}]})}>
          + Add Item
        </button>
      </div>
      {orderForm.items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 mb-2">
          <select className="select flex-1" value={item.product_id}
            onChange={e => {
              const prod = products.find(p => (p.id as string) === e.target.value);
              const items = [...orderForm.items];
              items[i] = {...items[i], product_id: e.target.value, unit_price: String((prod?.selling_price as number) || '')};
              setOrderForm({...orderForm, items});
            }}>
            <option value="">Select product</option>
            {products.map(p => <option key={p.id as string} value={p.id as string}>{p.name as string} ({p.sku as string})</option>)}
          </select>
          <input type="number" className="input w-20" placeholder="Qty" min="1"
            value={item.quantity} onChange={e => { const items=[...orderForm.items]; items[i]={...items[i],quantity:e.target.value}; setOrderForm({...orderForm,items}); }} />
          <input type="number" className="input w-28" placeholder="Price ৳"
            value={item.unit_price} onChange={e => { const items=[...orderForm.items]; items[i]={...items[i],unit_price:e.target.value}; setOrderForm({...orderForm,items}); }} />
          {orderForm.items.length > 1 && (
            <button onClick={() => setOrderForm({...orderForm, items: orderForm.items.filter((_,idx)=>idx!==i)})}
              className="p-1.5 text-red-400 hover:text-red-600">✕</button>
          )}
        </div>
      ))}
    </div>

    <FormField label="Notes">
      <textarea className="input resize-none" rows={2} value={orderForm.notes}
        onChange={e => setOrderForm({...orderForm, notes: e.target.value})} />
    </FormField>
  </div>
  <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
    <button className="btn-secondary" onClick={() => setCreateModal(false)}>Cancel</button>
    <button className="btn-primary" onClick={handleCreateOrder} disabled={orderSaving}>
      {orderSaving ? 'Creating...' : 'Create Order'}
    </button>
  </div>
</Modal>
    </div>
  );
}

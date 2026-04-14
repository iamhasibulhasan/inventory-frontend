'use client';
import { useState, useEffect, useCallback } from 'react';
import { packagingAPI, outboundAPI } from '@/lib/api';
import { PageHeader, DataTable, StatusBadge, Modal, FormField, EmptyState, Badge, StatCard, Tabs } from '@/components/ui';
import { Archive, Plus, Package, Truck, CheckCircle, X, Weight } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

type Pkg = Record<string, unknown>;
type Order = Record<string, unknown>;

export default function PackagingPage() {
  const [tab, setTab] = useState('pending-orders');
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [materials, setMaterials] = useState<Record<string, unknown>[]>([]);
  const [vehicles, setVehicles] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [packModal, setPackModal] = useState(false);
  const [masterModal, setMasterModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderDetail, setOrderDetail] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);

  const [packForm, setPackForm] = useState({
    weight_kg: '',
    notes: '',
    items: [] as { order_item_id: string; quantity: number; serial_numbers: string[] }[],
    materials: [] as { material_id: string; quantity: number }[],
  });
  const [masterForm, setMasterForm] = useState({ vehicle_id: '', notes: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pkgsRes, pendRes, matsRes, vehRes] = await Promise.all([
        packagingAPI.getPackages(),
        packagingAPI.getPendingOrders(),
        packagingAPI.getMaterials(),
        packagingAPI.getVehicles(),
      ]);
      setPackages(pkgsRes.data.data);
      setPendingOrders(pendRes.data.data);
      setMaterials(matsRes.data.data);
      setVehicles(vehRes.data.data);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openPackModal = async (order: Order) => {
    setSelectedOrder(order);
    try {
      const res = await outboundAPI.getById(String(order.id));
      const detail = res.data.data;
      setOrderDetail(detail);
      setPackForm({
        weight_kg: '',
        notes: '',
        items: (detail.items as Record<string, unknown>[]).map((item) => ({
          order_item_id: String(item.id),
          quantity: Number(item.quantity),
          serial_numbers: [],
        })),
        materials: [],
      });
    } catch { toast.error('Failed to load order details'); }
    setPackModal(true);
  };

  const addMaterial = () => {
    setPackForm(f => ({ ...f, materials: [...f.materials, { material_id: '', quantity: 1 }] }));
  };

  const handlePack = async () => {
    if (!selectedOrder) return;
    setSaving(true);
    try {
      await packagingAPI.createPackage({
        order_id: selectedOrder.id,
        items: packForm.items,
        materials: packForm.materials.filter(m => m.material_id),
        weight_kg: packForm.weight_kg ? parseFloat(packForm.weight_kg) : undefined,
        notes: packForm.notes,
      });
      toast.success('Package created');
      setPackModal(false);
      fetchData();
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create package');
    } finally { setSaving(false); }
  };

  const handleComplete = async (pkgId: string) => {
    try {
      await packagingAPI.completePackage(pkgId);
      toast.success('Package completed — stock moved to Processing');
      fetchData();
    } catch { toast.error('Failed to complete package'); }
  };

  const handleMasterPackage = async () => {
    if (!selectedPackages.length) return toast.error('Select at least one package');
    setSaving(true);
    try {
      await packagingAPI.createMasterPackage({
        vehicle_id: masterForm.vehicle_id || undefined,
        package_ids: selectedPackages,
        notes: masterForm.notes,
      });
      toast.success('Master package dispatched — orders marked as Shipped');
      setMasterModal(false);
      setSelectedPackages([]);
      fetchData();
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const fmt = (n: unknown) => `৳${Number(n).toLocaleString('en-BD')}`;

  const tabs = [
    { key: 'pending-orders', label: `📦 Pending Orders (${pendingOrders.length})` },
    { key: 'packages', label: `📫 Packages (${packages.length})` },
  ];

  const orderCols = [
    { key: 'order_number', label: 'Order', render: (r: Order) => <span className="font-medium text-brand-600">{String(r.order_number)}</span> },
    { key: 'customer_name', label: 'Customer', render: (r: Order) => <span className="text-sm">{String(r.customer_name || '—')}</span> },
    { key: 'item_count', label: 'Items', render: (r: Order) => <Badge variant="info">{String(r.item_count)} items</Badge> },
    { key: 'total_amount', label: 'Total', render: (r: Order) => <span className="font-semibold text-sm">{fmt(r.total_amount)}</span> },
    { key: 'order_source', label: 'Source', render: (r: Order) => <StatusBadge status={String(r.order_source)} /> },
    {
      key: 'action', label: '',
      render: (r: Order) => (
        <button className="btn-primary py-1.5 text-xs" onClick={e => { e.stopPropagation(); openPackModal(r); }}>
          <Package className="w-3.5 h-3.5" /> Pack Order
        </button>
      )
    },
  ];

  const pkgCols = [
    { key: 'package_number', label: 'Package', render: (r: Pkg) => <span className="font-medium text-brand-600">{String(r.package_number)}</span> },
    { key: 'order_number', label: 'Order', render: (r: Pkg) => <span className="text-sm">{String(r.order_number)}</span> },
    { key: 'packed_by_name', label: 'Packed By', render: (r: Pkg) => <span className="text-sm">{String(r.packed_by_name || '—')}</span> },
    { key: 'weight_kg', label: 'Weight', render: (r: Pkg) => r.weight_kg ? <span className="text-sm">{String(r.weight_kg)} kg</span> : <span className="text-gray-400">—</span> },
    { key: 'status', label: 'Status', render: (r: Pkg) => <StatusBadge status={String(r.status)} /> },
    {
      key: 'created_at', label: 'Date',
      render: (r: Pkg) => <span className="text-xs text-gray-400">{r.created_at ? (() => { try { return format(new Date(String(r.created_at)), 'dd MMM HH:mm'); } catch { return '—'; } })() : '—'}</span>
    },
    {
      key: 'action', label: '',
      render: (r: Pkg) => (
        <div className="flex items-center gap-1">
          {r.status === 'pending' && (
            <button className="p-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-600" onClick={e => { e.stopPropagation(); handleComplete(String(r.id)); }} title="Complete">
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
          {r.status === 'packed' && (
            <input type="checkbox" className="w-4 h-4 accent-brand-500"
              checked={selectedPackages.includes(String(r.id))}
              onChange={e => setSelectedPackages(prev => e.target.checked ? [...prev, String(r.id)] : prev.filter(p => p !== String(r.id)))}
              onClick={e => e.stopPropagation()}
            />
          )}
        </div>
      )
    },
  ];

  return (
    <div>
      <PageHeader title="Packaging" subtitle="Pack orders and create delivery packages"
        actions={
          <div className="flex gap-2">
            {selectedPackages.length > 0 && (
              <button className="btn-primary" onClick={() => setMasterModal(true)}>
                <Truck className="w-4 h-4" /> Create Master Package ({selectedPackages.length})
              </button>
            )}
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {[
          { title: 'Pending to Pack', value: pendingOrders.length, icon: <Package className="w-5 h-5" />, bg: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20' },
          { title: 'Packed (Ready)', value: packages.filter(p => p.status === 'packed').length, icon: <Archive className="w-5 h-5" />, bg: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' },
          { title: 'Dispatched', value: packages.filter(p => p.status === 'dispatched').length, icon: <Truck className="w-5 h-5" />, bg: 'bg-green-50 text-green-600 dark:bg-green-900/20' },
          { title: 'Packaging Materials', value: materials.length, icon: <Weight className="w-5 h-5" />, bg: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20' },
        ].map(s => (
          <StatCard key={s.title} title={s.title} value={s.value} icon={s.icon} iconBg={s.bg} />
        ))}
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      <div className="card overflow-hidden">
        {tab === 'pending-orders' ? (
          <DataTable columns={orderCols} data={pendingOrders} loading={loading}
            emptyState={<EmptyState icon={<Archive className="w-6 h-6" />} title="No orders pending packaging" description="Approved orders will appear here" />}
          />
        ) : (
          <DataTable columns={pkgCols} data={packages} loading={loading}
            emptyState={<EmptyState icon={<Package className="w-6 h-6" />} title="No packages yet" />}
          />
        )}
      </div>

      {selectedPackages.length > 0 && (
        <div className="mt-3 p-3 bg-brand-50 dark:bg-brand-900/20 rounded-xl border border-brand-200 dark:border-brand-800 flex items-center gap-3">
          <Archive className="w-4 h-4 text-brand-500 flex-shrink-0" />
          <span className="text-sm text-brand-700 dark:text-brand-300 flex-1">
            {selectedPackages.length} package(s) selected for dispatch
          </span>
          <button className="btn-secondary text-xs py-1.5" onClick={() => setSelectedPackages([])}>Clear</button>
          <button className="btn-primary text-xs py-1.5" onClick={() => setMasterModal(true)}>
            <Truck className="w-3.5 h-3.5" /> Dispatch
          </button>
        </div>
      )}

      {/* Pack Order Modal */}
      <Modal isOpen={packModal} onClose={() => setPackModal(false)} title={`Pack Order: ${String(selectedOrder?.order_number || '')}`} size="lg">
        {orderDetail && (
          <div className="space-y-5">
            {/* Order items */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Order Items</p>
              <div className="space-y-2">
                {(orderDetail.items as Record<string, unknown>[]).map((item, idx) => (
                  <div key={String(item.id)} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{String(item.product_name)}</p>
                      <p className="text-xs text-gray-400">{String(item.sku)}{item.variant_sku ? ` / ${item.variant_sku}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Qty:</span>
                      <input
                        type="number"
                        className="input w-16 py-1 text-center"
                        value={packForm.items[idx]?.quantity || Number(item.quantity)}
                        onChange={e => {
                          const items = [...packForm.items];
                          items[idx] = { ...items[idx], quantity: parseInt(e.target.value) };
                          setPackForm({ ...packForm, items });
                        }}
                        max={Number(item.quantity)}
                      />
                    </div>
                    {/* Serial numbers if product requires it */}
                    <div className="flex items-center gap-1">
                      <input
                        className="input w-32 py-1 text-xs"
                        placeholder="Serial numbers"
                        onChange={e => {
                          const items = [...packForm.items];
                          items[idx] = { ...items[idx], serial_numbers: e.target.value.split(',').map(s => s.trim()).filter(Boolean) };
                          setPackForm({ ...packForm, items });
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Packaging materials */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Packaging Materials</p>
                <button className="text-xs text-brand-500 hover:underline" onClick={addMaterial}>+ Add Material</button>
              </div>
              {packForm.materials.map((mat, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <select className="select flex-1" value={mat.material_id} onChange={e => {
                    const mats = [...packForm.materials]; mats[i] = { ...mats[i], material_id: e.target.value };
                    setPackForm({ ...packForm, materials: mats });
                  }}>
                    <option value="">Select material</option>
                    {materials.map(m => <option key={String(m.id)} value={String(m.id)}>{String(m.name)} (Stock: {String(m.stock_qty)})</option>)}
                  </select>
                  <input type="number" className="input w-20" value={mat.quantity} min={1} onChange={e => {
                    const mats = [...packForm.materials]; mats[i] = { ...mats[i], quantity: parseInt(e.target.value) };
                    setPackForm({ ...packForm, materials: mats });
                  }} />
                  <button onClick={() => setPackForm({ ...packForm, materials: packForm.materials.filter((_, idx) => idx !== i) })} className="p-1.5 text-red-400 hover:text-red-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {packForm.materials.length === 0 && <p className="text-xs text-gray-400">No materials added</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Weight (kg)">
                <input type="number" className="input" value={packForm.weight_kg} onChange={e => setPackForm({ ...packForm, weight_kg: e.target.value })} placeholder="0.5" step="0.1" />
              </FormField>
              <FormField label="Notes">
                <input className="input" value={packForm.notes} onChange={e => setPackForm({ ...packForm, notes: e.target.value })} placeholder="Optional notes" />
              </FormField>
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button className="btn-secondary" onClick={() => setPackModal(false)}>Cancel</button>
          <button className="btn-primary" onClick={handlePack} disabled={saving}>
            <Package className="w-4 h-4" />
            {saving ? 'Creating...' : 'Create Package'}
          </button>
        </div>
      </Modal>

      {/* Master Package Modal */}
      <Modal isOpen={masterModal} onClose={() => setMasterModal(false)} title="Create Master Package & Dispatch">
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>{selectedPackages.length} packages</strong> will be loaded into this master package.
              Orders will be marked as <strong>Shipped</strong> and stock will be deducted.
            </p>
          </div>
          <FormField label="Vehicle">
            <select className="select" value={masterForm.vehicle_id} onChange={e => setMasterForm({ ...masterForm, vehicle_id: e.target.value })}>
              <option value="">Select vehicle (optional)</option>
              {vehicles.map(v => (
                <option key={String(v.id)} value={String(v.id)}>
                  {String(v.name)} — {String(v.plate_number)} (Driver: {String(v.driver_name)})
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Notes">
            <textarea className="input resize-none" rows={2} value={masterForm.notes} onChange={e => setMasterForm({ ...masterForm, notes: e.target.value })} placeholder="Delivery notes..." />
          </FormField>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button className="btn-secondary" onClick={() => setMasterModal(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleMasterPackage} disabled={saving}>
            <Truck className="w-4 h-4" />
            {saving ? 'Dispatching...' : 'Dispatch Master Package'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { outboundAPI, commercialAPI, warehouseAPI } from '@/lib/api';
import {
  PageHeader,
  DataTable,
  StatusBadge,
  Modal,
  FormField,
  EmptyState,
  Badge
} from '@/components/ui';
import {
  ShoppingCart,
  Plus,
  CheckCircle,
  XCircle,
  Eye,
  Package,
  TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store';
import { format } from 'date-fns';

/* ================= TYPES ================= */

type OrderItem = {
  product_name: string;
  variant_sku?: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

type Order = {
  id: string;
  order_number: string;
  order_source: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  status: string;
  payment_status: string;
  total_amount: number;
  item_count: number;
  created_at: string;
  items?: OrderItem[];
};

/* ================= COMPONENT ================= */

export default function OutboundPage() {
  const { can } = useAuthStore();

  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');

  const [detail, setDetail] = useState<Order | null>(null);
  const [modal, setModal] = useState(false);

  const [createModal, setCreateModal] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);

  const [orderSaving, setOrderSaving] = useState(false);

  const [orderForm, setOrderForm] = useState({
    order_source: 'manual',
    customer_name: '',
    customer_phone: '',
    customer_address: '',
    store_id: '',
    payment_method: 'cash',
    notes: '',
    shipping_charge: '0',
    items: [{ product_id: '', quantity: '1', unit_price: '' }]
  });

  /* ================= FETCH PRODUCTS & STORES ================= */

  useEffect(() => {
    commercialAPI.getProducts({ limit: 200 })
      .then(r => setProducts(r?.data?.data || []))
      .catch(() => {});

    warehouseAPI.getStores()
      .then(r => setStores(r?.data?.data || []))
      .catch(() => {});
  }, []);

  /* ================= FETCH ORDERS ================= */

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const [ordR, statR] = await Promise.all([
        outboundAPI.getAll({
          status: statusFilter || undefined,
          source: sourceFilter || undefined
        }),
        outboundAPI.getStats()
      ]);

      setOrders(ordR?.data?.data || []);
      setStats(statR?.data?.data || {});
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sourceFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  /* ================= CREATE ORDER ================= */

  const handleCreateOrder = async () => {
    if (!orderForm.store_id) {
      return toast.error('Select a warehouse');
    }

    if (!orderForm.items.some(i => i.product_id)) {
      return toast.error('Add at least one product');
    }

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
          address: orderForm.customer_address
        },
        items: orderForm.items
          .filter(i => i.product_id)
          .map(i => ({
            product_id: i.product_id,
            quantity: parseInt(i.quantity) || 1,
            unit_price: parseFloat(i.unit_price) || 0
          }))
      });

      toast.success('Order created successfully');

      setCreateModal(false);
      fetchOrders();

    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to create order');
    } finally {
      setOrderSaving(false);
    }
  };

  /* ================= ACTIONS ================= */

  const viewDetail = async (o: Order) => {
    try {
      const r = await outboundAPI.getById(o.id);
      setDetail(r?.data?.data);
      setModal(true);
    } catch {}
  };

  const handleApprove = async (id: string) => {
    try {
      await outboundAPI.approve(id);
      toast.success('Order approved');
      fetchOrders();
    } catch {
      toast.error('Failed');
    }
  };

  const handleSendPackaging = async (id: string) => {
    try {
      await outboundAPI.sendToPackaging(id);
      toast.success('Sent to packaging');
      fetchOrders();
    } catch {
      toast.error('Failed');
    }
  };

  const handleCancel = async (id: string) => {
    const reason = prompt('Cancellation reason:');
    if (reason === null) return;

    try {
      await outboundAPI.cancel(id, { reason });
      toast.success('Order cancelled');
      fetchOrders();
    } catch {
      toast.error('Failed');
    }
  };

  /* ================= HELPERS ================= */

  const fmt = (n: number) =>
    `৳${Number(n || 0).toLocaleString('en-BD')}`;

  const safeDate = (d?: string) => {
    if (!d) return '—';
    const date = new Date(d);
    return isNaN(date.getTime()) ? '—' : format(date, 'dd MMM yy');
  };

  /* ================= TABLE ================= */

  const columns = [
    {
      key: 'order_number',
      label: 'Order #',
      render: (r: Order) => (
        <span className="font-semibold text-brand-600">
          {r.order_number}
        </span>
      )
    },
    {
      key: 'customer',
      label: 'Customer',
      render: (r: Order) => (
        <div>
          <p>{r.customer_name || 'Walk-in'}</p>
          <p className="text-xs text-gray-400">
            {r.customer_phone || ''}
          </p>
        </div>
      )
    },
    {
      key: 'total',
      label: 'Total',
      render: (r: Order) => (
        <span className="font-semibold">
          {fmt(r.total_amount)}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (r: Order) => (
        <StatusBadge status={r.status} />
      )
    },
    {
      key: 'date',
      label: 'Date',
      render: (r: Order) => safeDate(r.created_at)
    },
    {
      key: 'actions',
      label: '',
      render: (r: Order) => (
        <div className="flex gap-1">
          <button onClick={() => viewDetail(r)}>
            <Eye className="w-4" />
          </button>

          {r.status === 'pending' && (
            <button onClick={() => handleApprove(r.id)}>
              <CheckCircle className="w-4 text-green-600" />
            </button>
          )}

          {r.status === 'approved' && (
            <button onClick={() => handleSendPackaging(r.id)}>
              <Package className="w-4 text-purple-600" />
            </button>
          )}

          {!['shipped','delivered','cancelled'].includes(r.status) && (
            <button onClick={() => handleCancel(r.id)}>
              <XCircle className="w-4 text-red-500" />
            </button>
          )}
        </div>
      )
    }
  ];

  /* ================= UI ================= */

  return (
    <div>

      <PageHeader
        title="Outbound Orders"
        subtitle="Manage all orders"
        actions={
          can('outbound_orders', 'create') && (
            <button
              className="btn-primary"
              onClick={() => setCreateModal(true)}
            >
              <Plus className="w-4 h-4" /> New Order
            </button>
          )
        }
      />

      <div className="card">
        <DataTable
          columns={columns}
          data={orders}
          loading={loading}
          onRowClick={viewDetail}
          emptyState={
            <EmptyState
              icon={<ShoppingCart />}
              title="No orders"
              description="Orders will appear here"
            />
          }
        />
      </div>

      {/* CREATE MODAL */}
      <Modal
  isOpen={createModal}
  onClose={() => setCreateModal(false)}
  title="Create New Order"
  size="lg"
>
  <div className="space-y-4">

    {/* BASIC INFO */}
    <div className="grid grid-cols-2 gap-4">

      <FormField label="Order Source">
        <select
          className="select"
          value={orderForm.order_source}
          onChange={e =>
            setOrderForm({ ...orderForm, order_source: e.target.value })
          }
        >
          {['manual','ecommerce','marketplace'].map(s => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </FormField>

      <FormField label="Warehouse *">
        <select
          className="select"
          value={orderForm.store_id}
          onChange={e =>
            setOrderForm({ ...orderForm, store_id: e.target.value })
          }
        >
          <option value="">Select warehouse</option>
          {stores.map(s => (
            <option key={s.id as string} value={s.id as string}>
              {s.name as string}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Customer Name">
        <input
          className="input"
          value={orderForm.customer_name}
          onChange={e =>
            setOrderForm({ ...orderForm, customer_name: e.target.value })
          }
          placeholder="Walk-in Customer"
        />
      </FormField>

      <FormField label="Customer Phone">
        <input
          className="input"
          value={orderForm.customer_phone}
          onChange={e =>
            setOrderForm({ ...orderForm, customer_phone: e.target.value })
          }
          placeholder="017XXXXXXXX"
        />
      </FormField>

      <FormField label="Payment Method">
        <select
          className="select"
          value={orderForm.payment_method}
          onChange={e =>
            setOrderForm({ ...orderForm, payment_method: e.target.value })
          }
        >
          {['cash','card','bkash','nagad','bank_transfer'].map(m => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </FormField>

      <FormField label="Shipping Charge (৳)">
        <input
          type="number"
          className="input"
          value={orderForm.shipping_charge}
          onChange={e =>
            setOrderForm({ ...orderForm, shipping_charge: e.target.value })
          }
        />
      </FormField>

    </div>

    {/* ORDER ITEMS */}
    <div>
      <div className="flex justify-between mb-2">
        <label className="label">Order Items *</label>
        <button
          type="button"
          className="text-xs text-brand-500"
          onClick={() =>
            setOrderForm({
              ...orderForm,
              items: [
                ...orderForm.items,
                { product_id: '', quantity: '1', unit_price: '' }
              ]
            })
          }
        >
          + Add Item
        </button>
      </div>

      {orderForm.items.map((item, i) => (
        <div key={i} className="flex gap-2 mb-2">

          {/* PRODUCT */}
          <select
            className="select flex-1"
            value={item.product_id}
            onChange={e => {
              const prod = products.find(
                p => (p.id as string) === e.target.value
              );

              const items = [...orderForm.items];
              items[i] = {
                ...items[i],
                product_id: e.target.value,
                unit_price: String(prod?.selling_price || '')
              };

              setOrderForm({ ...orderForm, items });
            }}
          >
            <option value="">Select product</option>
            {products.map(p => (
              <option key={p.id as string} value={p.id as string}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>

          {/* QTY */}
          <input
            type="number"
            className="input w-20"
            min="1"
            value={item.quantity}
            onChange={e => {
              const items = [...orderForm.items];
              items[i].quantity = e.target.value;
              setOrderForm({ ...orderForm, items });
            }}
          />

          {/* PRICE */}
          <input
            type="number"
            className="input w-28"
            value={item.unit_price}
            onChange={e => {
              const items = [...orderForm.items];
              items[i].unit_price = e.target.value;
              setOrderForm({ ...orderForm, items });
            }}
          />

          {/* REMOVE */}
          {orderForm.items.length > 1 && (
            <button
              onClick={() =>
                setOrderForm({
                  ...orderForm,
                  items: orderForm.items.filter((_, idx) => idx !== i)
                })
              }
              className="text-red-500"
            >
              ✕
            </button>
          )}

        </div>
      ))}
    </div>

    {/* NOTES */}
    <FormField label="Notes">
      <textarea
        className="input"
        rows={2}
        value={orderForm.notes}
        onChange={e =>
          setOrderForm({ ...orderForm, notes: e.target.value })
        }
      />
    </FormField>

  </div>

  {/* FOOTER */}
  <div className="flex justify-end gap-2 mt-5 pt-4 border-t">
    <button
      className="btn-secondary"
      onClick={() => setCreateModal(false)}
    >
      Cancel
    </button>

    <button
      className="btn-primary"
      onClick={handleCreateOrder}
      disabled={orderSaving}
    >
      {orderSaving ? 'Creating...' : 'Create Order'}
    </button>
  </div>
</Modal>

    </div>
  );
}
'use client';
import { useEffect, useState, useCallback } from 'react';
import { dashboardAPI } from '@/lib/api';
import { StatCard, StatusBadge, LoadingPage, Badge } from '@/components/ui';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts';
import {
  TrendingUp, ShoppingCart, AlertTriangle, Package, DollarSign,
  ArrowRight, Clock, ClipboardList, FileText, PackageOpen,
  Layers, Archive, AlertOctagon, TrendingDown
} from 'lucide-react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';

interface DashboardData {
  summary: {
    total_sales: number; order_count: number;
    lost_sales: number; growth_percent: number; low_stock_count: number;
  };
  operations: {
    pending_prs: string; pending_pos: string; active_inbounds: string;
    pending_stacks: string; packaging_orders: string; pending_damage: string;
  };
  sales_graph: Array<{ date: string; revenue: number; orders: number }>;
  low_stock_items: Array<{ id: string; name: string; sku: string; current_stock: number; min_stock_level: number }>;
  top_products: Array<{ name: string; sku: string; units_sold: number; revenue: number }>;
  recent_orders: Array<{ order_number: string; status: string; total_amount: number; created_at: string; customer_name: string; order_source: string }>;
  orders_by_status: Array<{ status: string; count: string }>;
}

const PERIOD_OPTIONS = [{ label: '7D', value: 7 }, { label: '30D', value: 30 }, { label: '90D', value: 90 }];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashboardAPI.getAnalytics(period);
      setData(res.data.data);
    } catch {
      setData(DEMO_DATA);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fmt = (n: number) => `৳${Number(n).toLocaleString('en-BD')}`;
  const fmtShort = (n: number) => {
    if (n >= 100000) return `৳${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `৳${(n / 1000).toFixed(1)}K`;
    return `৳${n}`;
  };

  if (loading && !data) return <LoadingPage />;
  const d = data!;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Inventory & operations overview</p>
        </div>
        <div className="flex items-center gap-1 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-1">
          {PERIOD_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${period === opt.value ? 'bg-brand-500 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={fmtShort(d.summary.total_sales)}
          icon={<DollarSign className="w-5 h-5" />}
          iconBg="bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
          trend={d.summary.growth_percent} loading={loading} />
        <StatCard title="Total Orders" value={d.summary.order_count.toLocaleString()}
          icon={<ShoppingCart className="w-5 h-5" />}
          iconBg="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
          loading={loading} />
        <StatCard title="Lost Revenue" value={fmtShort(d.summary.lost_sales)}
          subtitle="From cancelled orders"
          icon={<TrendingDown className="w-5 h-5" />}
          iconBg="bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400"
          loading={loading} />
        <StatCard title="Low Stock Alerts" value={d.summary.low_stock_count}
          subtitle="Products below minimum"
          icon={<AlertTriangle className="w-5 h-5" />}
          iconBg="bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400"
          loading={loading} />
      </div>

      {/* Operations Alerts */}
      {d.operations && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: 'Pending PRs', value: d.operations.pending_prs, href: '/dashboard/purchase-requisition', icon: <ClipboardList className="w-4 h-4" />, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' },
            { label: 'Pending POs', value: d.operations.pending_pos, href: '/dashboard/purchase-order', icon: <FileText className="w-4 h-4" />, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Active Inbounds', value: d.operations.active_inbounds, href: '/dashboard/inbound', icon: <PackageOpen className="w-4 h-4" />, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
            { label: 'Pending Stack', value: d.operations.pending_stacks, href: '/dashboard/product-stack', icon: <Layers className="w-4 h-4" />, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' },
            { label: 'Packaging Queue', value: d.operations.packaging_orders, href: '/dashboard/packaging', icon: <Archive className="w-4 h-4" />, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/20' },
            { label: 'Damage Pending', value: d.operations.pending_damage, href: '/dashboard/damage', icon: <AlertOctagon className="w-4 h-4" />, color: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
          ].map(op => (
            <Link key={op.label} href={op.href}>
              <div className="card p-3 hover:shadow-card-md transition-shadow cursor-pointer">
                <div className={`w-8 h-8 rounded-lg ${op.color} flex items-center justify-center mb-2`}>
                  {op.icon}
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{op.value || '0'}</p>
                <p className="text-xs text-gray-500 mt-0.5">{op.label}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Revenue Graph + Order Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Revenue Trend</h2>
            <span className="text-xs text-gray-500">Last {period} days</span>
          </div>
          {loading ? <div className="h-56 bg-gray-50 dark:bg-gray-800 animate-pulse rounded-xl" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={d.sales_graph} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F4511E" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#F4511E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tickFormatter={v => { try { return format(parseISO(v), 'dd MMM'); } catch { return v; } }} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => fmtShort(v)} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => [fmt(v), 'Revenue']} labelFormatter={l => { try { return format(parseISO(l as string), 'dd MMM yyyy'); } catch { return l as string; } }} contentStyle={{ borderRadius: '12px', border: '1px solid #f3f4f6', fontSize: '12px' }} />
                <Area type="monotone" dataKey="revenue" stroke="#F4511E" strokeWidth={2.5} fill="url(#revGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Orders by Status</h2>
          {loading ? (
            <div className="space-y-3">{Array(5).fill(0).map((_, i) => <div key={i} className="h-7 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" />)}</div>
          ) : (
            <div className="space-y-2.5">
              {d.orders_by_status.map(s => (
                <div key={s.status} className="flex items-center justify-between">
                  <StatusBadge status={s.status} />
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full"
                        style={{ width: `${Math.min((parseInt(s.count) / Math.max(d.summary.order_count, 1)) * 100, 100)}%` }} />
                    </div>
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300 w-7 text-right">{s.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Orders */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="font-semibold text-gray-900 dark:text-white">Recent Orders</h2>
            <Link href="/dashboard/outbound" className="text-xs text-brand-500 flex items-center gap-1 hover:underline">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>{['Order', 'Customer', 'Source', 'Amount', 'Status', 'Date'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left table-header">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {loading ? Array(5).fill(0).map((_, i) => (
                  <tr key={i}>{Array(6).fill(0).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" /></td>)}</tr>
                )) : d.recent_orders.map(o => (
                  <tr key={o.order_number} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-brand-600">{o.order_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{o.customer_name || 'Walk-in'}</td>
                    <td className="px-4 py-3"><Badge variant="info">{o.order_source}</Badge></td>
                    <td className="px-4 py-3 text-sm font-semibold">{fmtShort(parseFloat(String(o.total_amount)))}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3 text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {(() => { try { return format(new Date(o.created_at), 'dd MMM'); } catch { return '—'; } })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Low Stock</h2>
            <Link href="/dashboard/stock-overview" className="text-xs text-brand-500 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {d.low_stock_items.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">✅ All products well stocked</p>
          ) : d.low_stock_items.slice(0, 6).map(item => (
            <div key={item.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
              <div className="w-8 h-8 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{item.name}</p>
                <p className="text-xs text-gray-400 font-mono">{item.sku}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-sm font-bold text-red-500">{item.current_stock}</span>
                <p className="text-[10px] text-gray-400">/ min {item.min_stock_level}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Products Chart */}
      {d.top_products.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Top Selling Products</h2>
            <Link href="/dashboard/stock-overview" className="text-xs text-brand-500 hover:underline flex items-center gap-1">
              Stock overview <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {loading ? <div className="h-44 bg-gray-50 dark:bg-gray-800 animate-pulse rounded-xl" /> : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={d.top_products.map(p => ({ ...p, name: p.name.length > 18 ? p.name.slice(0, 18) + '…' : p.name }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #f3f4f6', fontSize: '12px' }} />
                <Bar dataKey="units_sold" fill="#F4511E" radius={[6, 6, 0, 0]} name="Units Sold" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}

// Demo data when API is unavailable
const DEMO_DATA: DashboardData = {
  summary: { total_sales: 1840000, order_count: 342, lost_sales: 95000, growth_percent: 12.5, low_stock_count: 7 },
  operations: { pending_prs: '5', pending_pos: '8', active_inbounds: '3', pending_stacks: '12', packaging_orders: '7', pending_damage: '2' },
  sales_graph: Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    return { date: d.toISOString().split('T')[0], revenue: Math.floor(30000 + Math.random() * 70000), orders: Math.floor(5 + Math.random() * 20) };
  }),
  low_stock_items: [
    { id: '1', name: 'Samsung Galaxy A55 5G', sku: 'SKU-EL-001', current_stock: 2, min_stock_level: 5 },
    { id: '2', name: 'Cotton Polo Shirt', sku: 'SKU-CL-001', current_stock: 8, min_stock_level: 20 },
    { id: '3', name: 'ACI Hand Sanitizer', sku: 'SKU-HB-001', current_stock: 15, min_stock_level: 50 },
  ],
  top_products: [
    { name: 'Samsung Galaxy A55', sku: 'SKU-EL-001', units_sold: 145, revenue: 5510000 },
    { name: 'Polo Shirt', sku: 'SKU-CL-001', units_sold: 312, revenue: 218188 },
    { name: 'Hand Sanitizer', sku: 'SKU-HB-001', units_sold: 456, revenue: 34200 },
  ],
  recent_orders: [
    { order_number: 'ORD-87654321', status: 'delivered', total_amount: 38000, created_at: new Date().toISOString(), customer_name: 'Arif Hossain', order_source: 'manual' },
    { order_number: 'ORD-87654322', status: 'shipped', total_amount: 1398, created_at: new Date().toISOString(), customer_name: 'Fatema Begum', order_source: 'ecommerce' },
    { order_number: 'ORD-87654323', status: 'packaging', total_amount: 75, created_at: new Date().toISOString(), customer_name: 'Rahim Uddin', order_source: 'marketplace' },
    { order_number: 'ORD-87654324', status: 'pending', total_amount: 33000, created_at: new Date().toISOString(), customer_name: 'Nasrin Akter', order_source: 'manual' },
  ],
  orders_by_status: [
    { status: 'pending', count: '28' }, { status: 'approved', count: '15' },
    { status: 'packaging', count: '7' }, { status: 'shipped', count: '89' },
    { status: 'delivered', count: '198' }, { status: 'cancelled', count: '24' },
  ],
};

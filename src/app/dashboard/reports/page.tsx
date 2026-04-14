'use client';
import { useState, useEffect } from 'react';
import { dashboardAPI } from '@/lib/api';
import { PageHeader, LoadingPage, Badge } from '@/components/ui';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { BarChart3, TrendingUp, ShoppingCart, Package } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const COLORS = ['#F4511E', '#3B82F6', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899'];

export default function ReportsPage() {
  const [data, setData] = useState<{
    summary: { total_sales: number; order_count: number; lost_sales: number; growth_percent: number };
    sales_graph: Array<{ date: string; revenue: number; orders: number }>;
    orders_by_status: Array<{ status: string; count: string }>;
    top_products: Array<{ name: string; units_sold: number; revenue: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    setLoading(true);
    dashboardAPI.getAnalytics(period)
      .then(r => setData(r.data.data))
      .catch(() => setData(DEMO_REPORT))
      .finally(() => setLoading(false));
  }, [period]);

  const fmt = (n: number) => `৳${Number(n).toLocaleString('en-BD')}`;
  const fmtShort = (n: number) => n >= 100000 ? `৳${(n/100000).toFixed(1)}L` : n >= 1000 ? `৳${(n/1000).toFixed(1)}K` : `৳${n}`;

  if (loading && !data) return <LoadingPage />;
  const d = data!;

  const pieData = d.orders_by_status.map((s, i) => ({ name: s.status, value: parseInt(s.count), color: COLORS[i % COLORS.length] }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Reports & Analytics" subtitle="Sales and inventory performance overview" />
        <div className="flex items-center gap-1 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-1">
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setPeriod(d)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${period === d ? 'bg-brand-500 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Revenue', value: fmtShort(d.summary.total_sales), icon: <TrendingUp className="w-5 h-5" />, color: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400', trend: d.summary.growth_percent },
          { label: 'Orders', value: d.summary.order_count, icon: <ShoppingCart className="w-5 h-5" />, color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400', trend: null },
          { label: 'Avg Order Value', value: d.summary.order_count > 0 ? fmtShort(d.summary.total_sales / d.summary.order_count) : '৳0', icon: <BarChart3 className="w-5 h-5" />, color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400', trend: null },
          { label: 'Lost Revenue', value: fmtShort(d.summary.lost_sales), icon: <Package className="w-5 h-5" />, color: 'bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400', trend: null },
        ].map(k => (
          <div key={k.label} className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${k.color}`}>{k.icon}</div>
              {k.trend !== null && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${Number(k.trend) >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {Number(k.trend) >= 0 ? '+' : ''}{k.trend}%
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{k.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue trend */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Revenue Trend — Last {period} Days</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={d.sales_graph}>
            <defs>
              <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F4511E" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#F4511E" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="date" tickFormatter={(v) => { try { return format(parseISO(v), 'dd MMM'); } catch { return v; } }} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="revenue" tickFormatter={(v) => fmtShort(v)} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="orders" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(v: number, name: string) => [name === 'revenue' ? fmt(v) : v, name === 'revenue' ? 'Revenue' : 'Orders']}
              labelFormatter={(l) => { try { return format(parseISO(l), 'dd MMM yyyy'); } catch { return l; } }}
              contentStyle={{ borderRadius: '12px', border: '1px solid #f3f4f6', fontSize: '12px' }}
            />
            <Legend />
            <Area yAxisId="revenue" type="monotone" dataKey="revenue" stroke="#F4511E" strokeWidth={2.5} fill="url(#revGrad2)" dot={false} name="Revenue" />
            <Area yAxisId="orders" type="monotone" dataKey="orders" stroke="#3B82F6" strokeWidth={2} fill="url(#ordGrad)" dot={false} name="Orders" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Order status pie */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Order Distribution</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {pieData.map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-sm capitalize text-gray-600 dark:text-gray-400">{s.name}</span>
                  </div>
                  <span className="text-sm font-semibold">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top products */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Top Products by Revenue</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.top_products.slice(0, 5).map(p => ({ ...p, name: p.name.length > 15 ? p.name.slice(0, 15)+'…' : p.name }))} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => fmtShort(v)} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={100} />
              <Tooltip formatter={(v: number) => [fmt(v), 'Revenue']} contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
              <Bar dataKey="revenue" fill="#F4511E" radius={[0, 6, 6, 0]} name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

const DEMO_REPORT = {
  summary: { total_sales: 1840000, order_count: 342, lost_sales: 95000, growth_percent: 12.5 },
  sales_graph: Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    return { date: d.toISOString().split('T')[0], revenue: Math.floor(30000 + Math.random() * 80000), orders: Math.floor(5 + Math.random() * 20) };
  }),
  orders_by_status: [
    { status: 'pending', count: '28' }, { status: 'processing', count: '45' },
    { status: 'shipped', count: '89' }, { status: 'delivered', count: '198' }, { status: 'cancelled', count: '24' },
  ],
  top_products: [
    { name: 'Samsung Galaxy A55', units_sold: 145, revenue: 5510000 },
    { name: 'Walton Fridge 220L', units_sold: 62, revenue: 2046000 },
    { name: 'Cotton Polo Shirt', units_sold: 312, revenue: 218188 },
    { name: 'ACI Hand Sanitizer', units_sold: 456, revenue: 34200 },
    { name: 'Pran Juice 250ml', units_sold: 890, revenue: 22250 },
  ],
};

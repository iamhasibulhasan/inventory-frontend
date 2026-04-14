'use client';
import { ReactNode } from 'react';
import clsx from 'clsx';
import { X, Loader2, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

const STATUS_COLOR: Record<string,string> = {
  draft:'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  pending:'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  approved:'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  rejected:'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  converted:'bg-blue-100 text-blue-800',
  in_progress:'bg-blue-100 text-blue-800',
  pending_stack:'bg-purple-100 text-purple-800',
  completed:'bg-teal-100 text-teal-800',
  stacked:'bg-indigo-100 text-indigo-800',
  packaging:'bg-orange-100 text-orange-800',
  processing:'bg-indigo-100 text-indigo-800',
  packed:'bg-purple-100 text-purple-800',
  shipped:'bg-cyan-100 text-cyan-800',
  delivered:'bg-green-100 text-green-800',
  cancelled:'bg-red-100 text-red-800',
  loaded:'bg-blue-100 text-blue-800',
  operations_approved:'bg-teal-100 text-teal-800',
  inbound:'bg-blue-100 text-blue-800',
  unpaid:'bg-red-100 text-red-700',
  paid:'bg-green-100 text-green-700',
  active:'bg-green-100 text-green-700',
  inactive:'bg-gray-100 text-gray-600',
  good:'bg-green-50 text-green-700 border border-green-200',
  scrap:'bg-gray-100 text-gray-600',
  damage:'bg-red-50 text-red-700 border border-red-200',
  hold:'bg-yellow-50 text-yellow-700',
  normal:'bg-gray-100 text-gray-700',
  high:'bg-orange-100 text-orange-700',
  urgent:'bg-red-100 text-red-700',
  low:'bg-blue-100 text-blue-700',
};
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return <span className={clsx('badge', STATUS_COLOR[status?.toLowerCase()]||'bg-gray-100 text-gray-600', className)}>{status?.replace(/_/g,' ')}</span>;
}

export function Badge({ children, variant='default', className }: { children: ReactNode; variant?: string; className?: string }) {
  const v: Record<string,string> = {
    default:'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    success:'bg-green-100 text-green-700',
    warning:'bg-yellow-100 text-yellow-700',
    danger:'bg-red-100 text-red-700',
    info:'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    purple:'bg-purple-100 text-purple-700',
    brand:'bg-brand-100 text-brand-700',
  };
  return <span className={clsx('badge', v[variant]||v.default, className)}>{children}</span>;
}

export function Modal({ isOpen, onClose, title, children, size='md' }: {
  isOpen: boolean; onClose: ()=>void; title: string; children: ReactNode; size?: 'sm'|'md'|'lg'|'xl'|'2xl';
}) {
  if (!isOpen) return null;
  const sizes = { sm:'max-w-md', md:'max-w-lg', lg:'max-w-2xl', xl:'max-w-4xl', '2xl':'max-w-6xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"/>
      <div className={clsx('relative card w-full shadow-card-lg max-h-[92vh] flex flex-col', sizes[size])} onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-4 h-4 text-gray-500"/>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ title, value, icon, trend, iconBg='bg-brand-50 text-brand-500', subtitle, loading }: {
  title: string; value: string|number; icon: ReactNode; trend?: number; iconBg?: string; subtitle?: string; loading?: boolean;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', iconBg)}>{icon}</div>
        {trend!==undefined && (
          <span className={clsx('flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full', trend>=0?'bg-green-100 text-green-700':'bg-red-100 text-red-700')}>
            {trend>=0?<TrendingUp className="w-3 h-3"/>:<TrendingDown className="w-3 h-3"/>}{Math.abs(trend)}%
          </span>
        )}
      </div>
      {loading ? (
        <div className="space-y-2"><div className="h-7 w-24 bg-gray-100 animate-pulse rounded"/><div className="h-4 w-20 bg-gray-100 animate-pulse rounded"/></div>
      ) : (
        <>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-sm text-gray-500 mt-0.5">{title}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </>
      )}
    </div>
  );
}

export function FormField({ label, error, required, children, className }: {
  label: string; error?: string; required?: boolean; children: ReactNode; className?: string;
}) {
  return (
    <div className={clsx('space-y-1', className)}>
      <label className="label">{label}{required&&<span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
      {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{error}</p>}
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 mb-4">{icon}</div>}
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</p>
      {description && <p className="text-xs text-gray-400 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={clsx('animate-spin text-brand-500', className||'w-5 h-5')}/>;
}
export function LoadingPage() {
  return <div className="flex items-center justify-center h-64"><Spinner className="w-8 h-8"/></div>;
}

interface Column<T> { key: string; label: string; render?: (row: T) => ReactNode; className?: string; }
export function DataTable<T extends { id?: string }>({ columns, data, loading, emptyState, onRowClick }: {
  columns: Column<T>[]; data: T[]; loading?: boolean; emptyState?: ReactNode; onRowClick?: (row: T) => void;
}) {
  if (loading) return (
    <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-800/50">
          <tr>{columns.map(c=><th key={c.key} className="px-4 py-3 text-left table-header">{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {Array(4).fill(0).map((_,i)=>(
            <tr key={i} className="border-t border-gray-50">
              {columns.map(c=><td key={c.key} className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-800 animate-pulse rounded w-3/4"/></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
      <table className="w-full min-w-[640px]">
        <thead className="bg-gray-50 dark:bg-gray-800/50">
          <tr>{columns.map(c=><th key={c.key} className={clsx('px-4 py-3 text-left table-header',c.className)}>{c.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
          {data.length===0 ? (
            <tr><td colSpan={columns.length}>{emptyState||<div className="py-12 text-center text-xs text-gray-400">No data found</div>}</td></tr>
          ) : data.map((row,i)=>(
            <tr key={(row as Record<string,unknown>).id as string||i} onClick={()=>onRowClick?.(row)}
              className={clsx('bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors', onRowClick&&'cursor-pointer')}>
              {columns.map(c=>(
                <td key={c.key} className={clsx('px-4 py-3 text-sm text-gray-700 dark:text-gray-300',c.className)}>
                  {c.render?c.render(row):String((row as Record<string,unknown>)[c.key]??'—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ page, total, limit, onPageChange }: { page: number; total: number; limit: number; onPageChange: (p: number) => void }) {
  const pages = Math.ceil(total/limit);
  if (pages<=1) return null;
  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-xs text-gray-500">Showing {((page-1)*limit)+1}–{Math.min(page*limit,total)} of {total}</p>
      <div className="flex items-center gap-1">
        <button onClick={()=>onPageChange(page-1)} disabled={page===1} className="btn-secondary btn-sm disabled:opacity-40">Prev</button>
        <span className="px-2 text-xs font-medium">{page}/{pages}</span>
        <button onClick={()=>onPageChange(page+1)} disabled={page===pages} className="btn-secondary btn-sm disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}

export function Tabs({ tabs, active, onChange }: { tabs: { key: string; label: string }[]; active: string; onChange: (k: string) => void }) {
  return (
    <div className="flex items-center gap-1 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-1 flex-wrap mb-5">
      {tabs.map(t=>(
        <button key={t.key} onClick={()=>onChange(t.key)}
          className={clsx('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
            active===t.key?'bg-brand-500 text-white':'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel='Confirm', variant='danger' }: {
  isOpen: boolean; onClose: ()=>void; onConfirm: ()=>void; title: string; message: string; confirmLabel?: string; variant?: string;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}/>
      <div className="relative card p-6 max-w-sm w-full shadow-card-lg">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <button className="btn-secondary btn-sm" onClick={onClose}>Cancel</button>
          <button className={clsx(variant==='danger'?'btn-danger':'btn-success','btn-sm')} onClick={()=>{onConfirm();onClose();}}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export function StockTypeBadge({ type, qty }: { type: string; qty: number }) {
  const colors: Record<string,string> = {
    good:'bg-green-100 text-green-700', damage:'bg-red-100 text-red-700',
    expired:'bg-orange-100 text-orange-700', lost:'bg-gray-100 text-gray-600',
    scrap:'bg-slate-100 text-slate-600', hold:'bg-yellow-100 text-yellow-700',
    processing:'bg-purple-100 text-purple-700',
  };
  return (
    <div className={clsx('flex flex-col items-center px-2 py-1 rounded-lg', colors[type]||'bg-gray-100 text-gray-600')}>
      <span className="text-sm font-bold leading-none">{qty}</span>
      <span className="text-[9px] uppercase tracking-wide mt-0.5">{type}</span>
    </div>
  );
}

'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuthStore, useUIStore } from '@/store';
import clsx from 'clsx';
import {
  Users, Shield, MapPin, Globe, Map, Building2, Truck, Package, Tag, Box,
  Sliders, Layers, Ruler, ClipboardList, FileText, PackageOpen, BarChart3,
  ShoppingCart, Archive, AlertTriangle, Warehouse, Store, DoorOpen, Server,
  AlignJustify, Grid, ChevronLeft, ChevronRight, ChevronDown, ChevronRight as CR
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  Users, Shield, MapPin, Globe, Map, Building2, Truck, Package, Tag, Box,
  Sliders, Layers, Ruler, ClipboardList, FileText, PackageOpen, BarChart3,
  ShoppingCart, Archive, AlertTriangle, Warehouse, Store, DoorOpen, Server,
  AlignJustify, Grid
};

const ROUTE_MAP: Record<string, string> = {
  user_management: '/dashboard/users',
  role_permissions: '/dashboard/role-permissions',
  location: '/dashboard/location',
  location_country: '/dashboard/location?tab=country',
  location_state: '/dashboard/location?tab=state',
  location_city: '/dashboard/location?tab=city',
  supplier: '/dashboard/suppliers',
  commercial: '/dashboard/commercial',
  commercial_category: '/dashboard/commercial?tab=category',
  commercial_product: '/dashboard/commercial?tab=product',
  commercial_attribute: '/dashboard/commercial?tab=attribute',
  commercial_variant: '/dashboard/commercial?tab=variant',
  commercial_uom: '/dashboard/commercial?tab=uom',
  purchase_requisition: '/dashboard/purchase-requisition',
  purchase_order: '/dashboard/purchase-order',
  inbound: '/dashboard/inbound',
  product_stack: '/dashboard/product-stack',
  stock_overview: '/dashboard/stock-overview',
  outbound_orders: '/dashboard/outbound',
  packaging: '/dashboard/packaging',
  damage_management: '/dashboard/damage',
  warehouse_settings: '/dashboard/warehouse-settings',
  warehouse_store: '/dashboard/warehouse-settings?tab=store',
  warehouse_floor: '/dashboard/warehouse-settings?tab=floor',
  warehouse_room: '/dashboard/warehouse-settings?tab=room',
  warehouse_rack: '/dashboard/warehouse-settings?tab=rack',
  warehouse_row: '/dashboard/warehouse-settings?tab=row',
  warehouse_bin: '/dashboard/warehouse-settings?tab=bin',
  warehouse_mapping: '/dashboard/warehouse-settings?tab=mapping',
};

const MENU_TREE = [
  { key: 'user_management', label: 'User Management', icon: 'Users' },
  { key: 'role_permissions', label: 'Role Menu Permission', icon: 'Shield' },
  {
    key: 'location', label: 'Location', icon: 'MapPin',
    children: [
      { key: 'location_country', label: 'Country', icon: 'Globe' },
      { key: 'location_state', label: 'State', icon: 'Map' },
      { key: 'location_city', label: 'City', icon: 'Building2' },
    ]
  },
  { key: 'supplier', label: 'Supplier', icon: 'Truck' },
  {
    key: 'commercial', label: 'Commercial', icon: 'Package',
    children: [
      { key: 'commercial_category', label: 'Category', icon: 'Tag' },
      { key: 'commercial_product', label: 'Product', icon: 'Box' },
      { key: 'commercial_attribute', label: 'Product Attribute', icon: 'Sliders' },
      { key: 'commercial_variant', label: 'Product Variant', icon: 'Layers' },
      { key: 'commercial_uom', label: 'Unit of Measurement', icon: 'Ruler' },
    ]
  },
  { key: 'purchase_requisition', label: 'Purchase Requisition', icon: 'ClipboardList' },
  { key: 'purchase_order', label: 'Purchase Order', icon: 'FileText' },
  { key: 'inbound', label: 'Inbound', icon: 'PackageOpen' },
  { key: 'product_stack', label: 'Product Stack', icon: 'Layers' },
  { key: 'stock_overview', label: 'Stock Overview', icon: 'BarChart3' },
  { key: 'outbound_orders', label: 'Outbound Orders', icon: 'ShoppingCart' },
  { key: 'packaging', label: 'Packaging', icon: 'Archive' },
  { key: 'damage_management', label: 'Damage Management', icon: 'AlertTriangle' },
  {
    key: 'warehouse_settings', label: 'Warehouse Settings', icon: 'Warehouse',
    children: [
      { key: 'warehouse_store', label: 'Store', icon: 'Store' },
      { key: 'warehouse_floor', label: 'Floor', icon: 'Layers' },
      { key: 'warehouse_room', label: 'Room', icon: 'DoorOpen' },
      { key: 'warehouse_rack', label: 'Rack', icon: 'Server' },
      { key: 'warehouse_row', label: 'Row', icon: 'AlignJustify' },
      { key: 'warehouse_bin', label: 'Bin', icon: 'Box' },
      { key: 'warehouse_mapping', label: 'Warehouse Mapping', icon: 'Grid' },
    ]
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || '';
  const { user, can } = useAuthStore();
  const { sidebarCollapsed, expandedMenus, toggleSidebar, toggleMenu } = useUIStore();

  const isActive = (key: string): boolean => {
    const route = ROUTE_MAP[key];
    if (!route) return false;

    const [base, query] = route.split('?');
    const tabValue = query ? new URLSearchParams(query).get('tab') || '' : '';

    // Route has a tab query param — must match BOTH path AND tab value
    if (tabValue) {
      return pathname === base && currentTab === tabValue;
    }

    // Route has no query param — exact path match only (no startsWith)
    return pathname === base;
  };

  const renderItem = (item: typeof MENU_TREE[0]) => {
    if (!can(item.key)) return null;
    const Icon = ICON_MAP[item.icon] || Box;
    const hasChildren = 'children' in item && item.children;
    const isExpanded = expandedMenus.includes(item.key);
    const active = isActive(item.key);
    const childActive = hasChildren ? item.children!.some(c => isActive(c.key)) : false;

    if (hasChildren) {
      return (
        <div key={item.key}>
          <button
            onClick={() => !sidebarCollapsed && toggleMenu(item.key)}
            className={clsx(
              'sidebar-item w-full',
              childActive
                ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
                : active
                ? 'sidebar-item-active'
                : 'sidebar-item-inactive',
              sidebarCollapsed && 'justify-center px-2'
            )}
          >
            <Icon className="w-[18px] h-[18px] flex-shrink-0" />
            {!sidebarCollapsed && (
              <>
                <span className="flex-1 text-left">{item.label}</span>
                {isExpanded
                  ? <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                  : <CR className="w-3.5 h-3.5 opacity-60" />
                }
              </>
            )}
          </button>

          {!sidebarCollapsed && isExpanded && (
            <div className="ml-3 pl-3 border-l border-gray-100 dark:border-gray-800 mt-1 mb-1 space-y-0.5">
              {item.children!.map(child => {
                if (!can(child.key)) return null;
                const CIcon = ICON_MAP[child.icon] || Box;
                const cActive = isActive(child.key);
                return (
                  <Link key={child.key} href={ROUTE_MAP[child.key] || '#'}>
                    <div className={clsx(
                      'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer',
                      cActive
                        ? 'bg-brand-500 text-white'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                    )}>
                      <CIcon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{child.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link key={item.key} href={ROUTE_MAP[item.key] || '#'} title={sidebarCollapsed ? item.label : ''}>
        <div className={clsx(
          'sidebar-item',
          active ? 'sidebar-item-active' : 'sidebar-item-inactive',
          sidebarCollapsed && 'justify-center px-2'
        )}>
          <Icon className="w-[18px] h-[18px] flex-shrink-0" />
          {!sidebarCollapsed && <span>{item.label}</span>}
        </div>
      </Link>
    );
  };

  return (
    <aside className={clsx(
      'fixed left-0 top-0 h-full bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 z-40 flex flex-col transition-all duration-300',
      sidebarCollapsed ? 'w-[72px]' : 'w-[256px]'
    )}>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <Warehouse className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold text-gray-900 dark:text-white">Inventory</span>
              <span className="block text-[9px] text-gray-400 -mt-0.5 uppercase tracking-widest">Management</span>
            </div>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center mx-auto">
            <Warehouse className="w-5 h-5 text-white" />
          </div>
        )}
        {!sidebarCollapsed && (
          <button onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
        {MENU_TREE.map(item => renderItem(item))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-gray-100 dark:border-gray-800 p-2.5">
        {!sidebarCollapsed && user && (
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{user.name}</p>
              <p className="text-[10px] text-gray-400 capitalize truncate">{user.role?.replace('_', ' ')}</p>
            </div>
          </div>
        )}
        {sidebarCollapsed && (
          <button onClick={toggleSidebar} className="flex items-center justify-center w-full p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
}

'use client';
import { useState } from 'react';
import { useAuthStore, useUIStore } from '@/store';
import { Bell, Search, Sun, Moon, LogOut, User, Settings, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

interface Notification {
  id: string;
  message: string;
  type: 'warning' | 'info' | 'success';
  time: string;
  read: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: '1', message: '5 products are low on stock', type: 'warning', time: '5m ago', read: false },
  { id: '2', message: 'PO-12345678 approved by admin', type: 'success', time: '1h ago', read: false },
  { id: '3', message: 'New order ORD-87654321 received', type: 'info', time: '2h ago', read: true },
];

export default function Topbar() {
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed, theme, toggleTheme } = useUIStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadCount = MOCK_NOTIFICATIONS.filter(n => !n.read).length;

  return (
    <header className={clsx(
      'fixed top-0 right-0 h-16 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 z-30 flex items-center px-4 gap-3 transition-all duration-300',
      sidebarCollapsed ? 'left-[72px]' : 'left-[256px]'
    )}>
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search products, orders..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Dark mode */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
            className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-brand-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 card shadow-card-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <span className="font-semibold text-sm">Notifications</span>
                <span className="text-xs text-brand-500">{unreadCount} unread</span>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {MOCK_NOTIFICATIONS.map(n => (
                  <div key={n.id} className={clsx('px-4 py-3', !n.read && 'bg-brand-50 dark:bg-brand-900/10')}>
                    <div className="flex items-start gap-2">
                      <div className={clsx('w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                        n.type === 'warning' ? 'bg-yellow-500' : n.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                      )} />
                      <div>
                        <p className="text-sm text-gray-800 dark:text-gray-200">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5 text-center border-t border-gray-100 dark:border-gray-800">
                <button className="text-xs text-brand-500 font-medium">View all notifications</button>
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-sm font-semibold">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-gray-900 dark:text-white leading-none">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize mt-0.5">{user?.role}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 card shadow-card-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <p className="font-medium text-sm text-gray-900 dark:text-white">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <div className="py-1">
                <button className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <User className="w-4 h-4" /> My Profile
                </button>
                <button className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <Settings className="w-4 h-4" /> Settings
                </button>
              </div>
              <div className="border-t border-gray-100 dark:border-gray-800 py-1">
                <button
                  onClick={logout}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

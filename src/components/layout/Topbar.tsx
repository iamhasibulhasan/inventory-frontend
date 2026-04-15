'use client';

import { useState } from 'react';
import { useAuthStore, useUIStore } from '@/store';
import {
  Bell,
  Search,
  Sun,
  Moon,
  LogOut,
  User,
  Settings,
  ChevronDown,
} from 'lucide-react';
import clsx from 'clsx';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui';

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
  const { user, logout, setUser } = useAuthStore() as any;
  const { sidebarCollapsed, theme, toggleTheme } = useUIStore();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const unreadCount = MOCK_NOTIFICATIONS.filter(n => !n.read).length;

  const [profileModal, setProfileModal] = useState(false);
  const [profileTab, setProfileTab] = useState<'info' | 'password'>('info');

  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [saving, setSaving] = useState(false);

  // ---------------- OPEN PROFILE ----------------
  const openProfile = () => {
    setProfileForm({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });

    setProfileTab('info');
    setProfileModal(true);
    setProfileOpen(false);
  };


  // ---------------- UPDATE PROFILE ----------------
const handleSaveProfile = async () => {
  setSaving(true);
  try {
    const res = await authAPI.updateProfile(profileForm);

    toast.success('Profile updated');

    // 👇 directly update store from response
    setUser?.(res.data);

    setProfileModal(false);
  } catch (err) {
    toast.error('Failed to update profile');
  } finally {
    setSaving(false);
  }
};

  // ---------------- CHANGE PASSWORD ----------------
  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return toast.error('Passwords do not match');
    }

    setSaving(true);
    try {
      await authAPI.changePassword({
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      });

      toast.success('Password changed');

      setPasswordForm({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      setProfileModal(false);
    } catch (err) {
      toast.error('Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <header
      className={clsx(
        'fixed top-0 right-0 h-16 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 z-30 flex items-center px-4 gap-3 transition-all duration-300',
        sidebarCollapsed ? 'left-[72px]' : 'left-[256px]'
      )}
    >
      {/* SEARCH */}
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
        {/* THEME */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>

        {/* NOTIFICATIONS */}
        <div className="relative">
          <button
            onClick={() => {
              setNotifOpen(!notifOpen);
              setProfileOpen(false);
            }}
            className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-brand-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* PROFILE */}
        <div className="relative">
          <button
            onClick={() => {
              setProfileOpen(!profileOpen);
              setNotifOpen(false);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-sm font-semibold">
              {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>

            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {user?.name}
              </p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>

            <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 card shadow-card-lg overflow-hidden">
              <div className="px-4 py-3 border-b">
                <p className="font-medium text-sm">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>

              <div className="py-1">
                <button
                  onClick={openProfile}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm"
                >
                  <User className="w-4 h-4" /> My Profile
                </button>

                <button className="flex items-center gap-3 w-full px-4 py-2.5 text-sm">
                  <Settings className="w-4 h-4" /> Settings
                </button>
              </div>

              <div className="border-t py-1">
                <button
                  onClick={logout}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PROFILE MODAL */}
      {profileModal && (
        <Modal
          isOpen={profileModal}
          onClose={() => setProfileModal(false)}
          title="My Profile"
        >
          <div className="flex gap-2 mb-4">
            {['info', 'password'].map(t => (
              <button
                key={t}
                onClick={() => setProfileTab(t as any)}
                className={`px-3 py-1 rounded-lg text-sm ${
                  profileTab === t
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* INFO */}
          {profileTab === 'info' && (
            <div className="space-y-3">
              <input
                className="input"
                value={profileForm.name}
                onChange={e =>
                  setProfileForm({ ...profileForm, name: e.target.value })
                }
                placeholder="Name"
              />

              <input
                className="input"
                value={profileForm.email}
                onChange={e =>
                  setProfileForm({ ...profileForm, email: e.target.value })
                }
                placeholder="Email"
              />

              <input
                className="input"
                value={profileForm.phone}
                onChange={e =>
                  setProfileForm({ ...profileForm, phone: e.target.value })
                }
                placeholder="Phone"
              />

              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="btn-primary"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}

          {/* PASSWORD */}
          {profileTab === 'password' && (
            <div className="space-y-3">
              <input
                className="input"
                type="password"
                placeholder="Old password"
                value={passwordForm.oldPassword}
                onChange={e =>
                  setPasswordForm({
                    ...passwordForm,
                    oldPassword: e.target.value,
                  })
                }
              />

              <input
                className="input"
                type="password"
                placeholder="New password"
                value={passwordForm.newPassword}
                onChange={e =>
                  setPasswordForm({
                    ...passwordForm,
                    newPassword: e.target.value,
                  })
                }
              />

              <input
                className="input"
                type="password"
                placeholder="Confirm password"
                value={passwordForm.confirmPassword}
                onChange={e =>
                  setPasswordForm({
                    ...passwordForm,
                    confirmPassword: e.target.value,
                  })
                }
              />

              <button
                onClick={handleChangePassword}
                disabled={saving}
                className="btn-primary"
              >
                {saving ? 'Updating...' : 'Change Password'}
              </button>
            </div>
          )}
        </Modal>
      )}
    </header>
  );
}
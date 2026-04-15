import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Permission {
  menu_key: string;
  menu_label: string;
  parent_key: string | null;
  icon: string;
  sort_order: number;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  role_id: string;
  avatar_url?: string;
  permissions: Permission[];
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  logout: () => void;
  can: (menuKey: string, action?: 'view'|'create'|'edit'|'delete') => boolean;
  getMenuPermissions: () => Permission[];
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
        if (typeof window !== 'undefined') {
          // Small delay to let state settle before redirect
          setTimeout(() => { window.location.href = '/auth/login'; }, 100);
        }
      },
      can: (menuKey, action = 'view') => {
        const { user } = get();
        if (!user) return false;
        if (user.role === 'admin') return true;
        const perm = user.permissions.find(p => p.menu_key === menuKey);
        if (!perm) return false;
        if (action === 'view') return perm.can_view;
        if (action === 'create') return perm.can_create;
        if (action === 'edit') return perm.can_edit;
        if (action === 'delete') return perm.can_delete;
        return false;
      },
      getMenuPermissions: () => {
        const { user } = get();
        if (!user) return [];
        return user.permissions.filter(p => p.can_view);
      },
    }),
    {
      name: 'inventory-auth',
      partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }),
    }
  )
);

interface UIState {
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark';
  expandedMenus: string[];
  toggleSidebar: () => void;
  toggleTheme: () => void;
  toggleMenu: (key: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      theme: 'light',
      expandedMenus: [],
      toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light';
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', next === 'dark');
          localStorage.setItem('theme', next);
        }
        set({ theme: next });
      },
      toggleMenu: (key) => set(s => ({
        expandedMenus: s.expandedMenus.includes(key)
          ? s.expandedMenus.filter(k => k !== key)
          : [...s.expandedMenus, key]
      })),
    }),
    { name: 'inventory-ui' }
  )
);
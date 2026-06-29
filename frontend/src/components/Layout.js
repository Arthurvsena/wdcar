import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import {
  LayoutDashboard, Users, Package2, Wrench, FileText,
  BarChart3, DollarSign, LogOut, Wrench as LogoIcon,
  Menu, X, ChevronRight, Bell, Settings as SettingsIcon,
  Activity, Banknote, Truck, ShoppingCart,
} from 'lucide-react';
import { isAdmin, isDev, hasPermission, NAV_ITEMS, ADMIN_NAV_ITEMS } from '../utils/permissions';

const iconMap = {
  LayoutDashboard,
  Users,
  Package2,
  Wrench,
  FileText,
  BarChart3,
  DollarSign,
  Settings: SettingsIcon,
  Activity,
  Banknote,
  Truck,
  ShoppingCart,
};

const bottomNav = [
  { label: 'Início', icon: LayoutDashboard, path: '/' },
  { label: 'Mecânico', icon: Wrench, path: '/mecanico' },
  { label: 'OS', icon: FileText, path: '/os' },
  { label: 'Clientes', icon: Users, path: '/clientes' },
  { label: 'Peças', icon: Package2, path: '/pecas' },
];

const getNavItems = (user) => {
  if (!user) return [];
  if (isDev(user)) return [];

  let items = NAV_ITEMS.filter(item => hasPermission(user, item.permission));

  if (user.role === 'mecanico') {
    items = items.filter(item => item.key !== 'financeiro' && item.key !== 'caixa');
  }

  if (isAdmin(user)) {
    items = [...items, ...ADMIN_NAV_ITEMS];
  }

  return items;
};

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = () => {
    setDrawerOpen(false);
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const navItems = React.useMemo(() => getNavItems(user), [user]);

  if (isDev(user)) {
    return (
      <div className="min-h-screen bg-grafite-950 flex items-center justify-center pb-16 md:pb-0">
        <div className="bg-grafite-900 border border-grafite-800 rounded-xl p-8 text-center max-w-sm mx-4">
          <div className="w-16 h-16 bg-laranja-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔒</span>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Modo Dev</h1>
          <p className="text-gray-400 text-sm mb-6">Acesso restrito para desenvolvedores</p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-grafite-800 hover:bg-grafite-700 text-gray-300 px-6 py-3 rounded-lg text-sm mx-auto"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </div>
    );
  }

  const avatarPath = isAdmin(user) ? '/configuracoes' : '/perfil';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-grafite-950 text-gray-900 dark:text-gray-100 pb-16 md:pb-0 md:flex transition-colors duration-200">
      {/* ===== TOP BAR (mobile) ===== */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-grafite-900 border-b border-gray-200 dark:border-grafite-800 px-4 h-14 flex items-center justify-between">
        <button onClick={() => setDrawerOpen(true)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1">
          <Menu size={24} />
        </button>
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-laranja-600 rounded-lg flex items-center justify-center">
            <LogoIcon size={18} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 dark:text-white">WDOcar</span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="relative">
            <Bell size={20} className="text-gray-600 dark:text-gray-400" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
          </div>
          <button onClick={() => navigate(avatarPath)} className="w-8 h-8 bg-gray-200 dark:bg-grafite-700 rounded-full flex items-center justify-center text-xs font-bold text-laranja-600 dark:text-laranja-400 hover:bg-gray-300 dark:hover:bg-grafite-600 transition-colors">
            {user?.username?.charAt(0).toUpperCase()}
          </button>
        </div>
      </header>

      {/* ===== DRAWER OVERLAY ===== */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/60"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ===== DRAWER (mobile) ===== */}
      <aside
        className={`md:hidden fixed top-0 left-0 z-50 h-full w-72 bg-white dark:bg-grafite-900 border-r border-gray-200 dark:border-grafite-800 transform transition-transform duration-300 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-grafite-800">
          <Link to="/" onClick={() => setDrawerOpen(false)} className="flex items-center gap-3">
            <div className="w-10 h-10 bg-laranja-600 rounded-lg flex items-center justify-center">
              <LogoIcon size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">WDOcar</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">{user?.nome_oficina}</p>
            </div>
          </Link>
          <button onClick={() => setDrawerOpen(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1">
            <X size={22} />
          </button>
        </div>

        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const IconComponent = iconMap[item.icon];
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setDrawerOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${
                  active
                    ? 'bg-laranja-600/20 text-laranja-600 dark:text-laranja-400 border border-laranja-600/30'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-grafite-800 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {IconComponent && <IconComponent size={20} />}
                <span className="flex-1">{item.label}</span>
                <ChevronRight size={16} className="text-gray-400 dark:text-gray-600" />
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-200 dark:border-grafite-800">
          <button onClick={() => { setDrawerOpen(false); navigate(avatarPath); }} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-grafite-800 rounded-lg transition-all mb-1">
            <div className="w-8 h-8 bg-gray-100 dark:bg-grafite-700 rounded-full flex items-center justify-center text-xs font-bold text-laranja-600 dark:text-laranja-400">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <span className="truncate">{user?.username}</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-500 dark:text-gray-400 hover:text-red-400 hover:bg-gray-100 dark:hover:bg-grafite-800 rounded-lg transition-all"
          >
            <LogOut size={20} />
            Sair
          </button>
        </div>
      </aside>

      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-white dark:bg-grafite-900 border-r border-gray-200 dark:border-grafite-800 h-screen sticky top-0">
        <div className="p-5 border-b border-gray-200 dark:border-grafite-800">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-laranja-600 rounded-lg flex items-center justify-center">
                <LogoIcon size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">WDOcar</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user?.nome_oficina}</p>
              </div>
            </Link>
            <div className="relative">
<Bell size={20} className="text-gray-500 dark:text-gray-400" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const IconComponent = iconMap[item.icon];
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all ${
                  active
                    ? 'bg-laranja-600/20 text-laranja-600 dark:text-laranja-400 border border-laranja-600/30'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-grafite-800 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {IconComponent && <IconComponent size={18} />}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-200 dark:border-grafite-800">
          <button onClick={() => navigate(avatarPath)} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-grafite-800 rounded-lg transition-all">
            <div className="w-8 h-8 bg-gray-100 dark:bg-grafite-700 rounded-full flex items-center justify-center text-xs font-bold text-laranja-600 dark:text-laranja-400">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <span className="truncate">{user?.username}</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-red-400 hover:bg-gray-100 dark:hover:bg-grafite-800 rounded-lg transition-all"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 overflow-y-auto md:pt-0 pt-14">
        <div className="max-w-5xl mx-auto p-3 md:p-6">
          {children}
        </div>
      </main>

      {/* ===== BOTTOM NAV (mobile) ===== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-grafite-900 border-t border-gray-200 dark:border-grafite-800 flex items-center justify-around px-1 pb-safe" style={{ paddingBottom: 'env(safe-area-inset-bottom, 4px)' }}>
        {bottomNav.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 min-w-0 rounded-lg transition-colors ${
                active ? 'text-laranja-600 dark:text-laranja-400' : 'text-gray-500 dark:text-gray-500'
              }`}
            >
              <item.icon size={20} />
              <span className="text-[10px] leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMediaUrl } from '../api';
import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';
import CommandPalette from './CommandPalette';
import {
  LayoutDashboard, Users, Package2, Wrench, FileText,
  BarChart3, DollarSign, LogOut, Wrench as LogoIcon,
  Menu, X, ChevronRight, Settings as SettingsIcon,
  Activity, HardHat, Wallet, Truck, ShoppingCart, ShieldCheck,
  History, FileBarChart, TerminalSquare, Search,
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
  HardHat,
  Wallet,
  Truck,
  ShoppingCart,
  ShieldCheck,
  History,
  FileBarChart,
};

const BOTTOM_NAV_ITEMS = [
  { label: 'Início', icon: LayoutDashboard, path: '/', permission: 'dashboard' },
  { label: 'Clientes', icon: Users, path: '/clientes', permission: 'clientes' },
  { label: 'OS', icon: FileText, path: '/os', permission: 'os' },
  { label: 'Caixa', icon: Wallet, path: '/caixa', permission: 'caixa' },
  { label: 'Peças', icon: Package2, path: '/pecas', permission: 'pecas' },
  { label: 'Mais', icon: Menu, path: '/analytics' },
];

const getBottomNav = (user) =>
  BOTTOM_NAV_ITEMS.filter((item) => !item.permission || hasPermission(user, item.permission));

const getNavItems = (user) => {
  if (!user) return [];
  if (isDev(user)) return [];

  let items = NAV_ITEMS.filter(item => hasPermission(user, item.permission));

  if (isAdmin(user)) {
    items = [...items, ...ADMIN_NAV_ITEMS];
  }

  return items;
};

// Logo da oficina na navbar; sem logo, usa o nome da oficina como marca
function OficinaBrand({ oficina, compact = false }) {
  const nome = oficina?.nome || 'GiroCerto';
  if (oficina?.logo) {
    return (
      <img
        src={getMediaUrl(oficina.logo)}
        alt={nome}
        className={`${compact ? 'h-8' : 'h-10'} max-w-[150px] object-contain`}
      />
    );
  }
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} bg-laranja-600 rounded-lg flex items-center justify-center shrink-0`}>
        <span className={`text-white font-bold ${compact ? 'text-sm' : 'text-base'}`}>
          {nome.charAt(0).toUpperCase()}
        </span>
      </div>
      <span className={`font-bold text-gray-900 dark:text-white truncate ${compact ? 'text-base' : 'text-lg'}`}>
        {nome}
      </span>
    </div>
  );
}

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, oficina, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const devUser = isDev(user);

  React.useEffect(() => {
    if (devUser) return undefined;
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [devUser]);

  const handleLogout = () => {
    setDrawerOpen(false);
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const navItems = React.useMemo(() => getNavItems(user), [user]);

  // ===== PAINEL DEV =====
  if (isDev(user)) {
    if (location.pathname !== '/dev') {
      return <Navigate to="/dev" replace />;
    }
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-grafite-950 text-gray-900 dark:text-gray-100 transition-colors duration-200">
        <header className="sticky top-0 z-40 bg-white dark:bg-grafite-900 border-b border-gray-200 dark:border-grafite-800 h-14 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-laranja-600 rounded-lg flex items-center justify-center">
              <LogoIcon size={18} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white">GiroCerto</span>
            <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-laranja-600/15 text-laranja-600 dark:text-laranja-400 font-medium">
              <TerminalSquare size={12} />
              Painel Dev
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-red-400 transition-colors"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </header>
        <main className="max-w-5xl mx-auto p-4 md:p-6">{children}</main>
      </div>
    );
  }

  // ===== PRIMEIRO ACESSO: master ainda não configurou a oficina =====
  if (user && oficina && !oficina.setup_completo && isAdmin(user)) {
    return <Navigate to="/setup" replace />;
  }

  const avatarPath = isAdmin(user) ? '/configuracoes' : '/perfil';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-grafite-950 text-gray-900 dark:text-gray-100 pb-16 md:pb-0 md:flex transition-colors duration-200">
      {/* ===== TOP BAR (mobile) ===== */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-grafite-900 border-b border-gray-200 dark:border-grafite-800 px-4 h-14 flex items-center justify-between">
        <button onClick={() => setDrawerOpen(true)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1">
          <Menu size={24} />
        </button>
        <Link to="/" className="flex items-center min-w-0 px-2">
          <OficinaBrand oficina={oficina} compact />
        </Link>
        <div className="flex items-center gap-3">
          <button onClick={() => setPaletteOpen(true)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1" aria-label="Buscar">
            <Search size={20} />
          </button>
          <ThemeToggle />
          <NotificationBell align="right" />
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
          <Link to="/" onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <OficinaBrand oficina={oficina} />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">GiroCerto - Gestão de Oficinas</p>
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
          <Link to="/" className="block min-w-0">
            <OficinaBrand oficina={oficina} />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">GiroCerto - Gestão de Oficinas</p>
          </Link>
          <div className="flex items-center gap-4 mt-3">
            <ThemeToggle />
            <NotificationBell align="left" />
          </div>
          <button
            onClick={() => setPaletteOpen(true)}
            className="mt-3 w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-grafite-800 border border-gray-200 dark:border-grafite-700 text-xs text-gray-500 dark:text-gray-400 hover:border-laranja-500 transition-colors"
          >
            <Search size={14} />
            <span className="flex-1 text-left">Buscar...</span>
            <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-gray-300 dark:border-grafite-600">Ctrl+K</kbd>
          </button>
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

      {/* ===== BUSCA GLOBAL (Ctrl+K) ===== */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 overflow-y-auto md:pt-0 pt-14">
        <div className="max-w-5xl mx-auto p-3 md:p-6">
          {children}
        </div>
      </main>

      {/* ===== BOTTOM NAV (mobile) ===== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-grafite-900 border-t border-gray-200 dark:border-grafite-800 flex items-center justify-around px-1 pb-safe" style={{ paddingBottom: 'env(safe-area-inset-bottom, 4px)' }}>
        {getBottomNav(user).map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 py-2 px-2 min-w-0 rounded-lg transition-colors ${
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

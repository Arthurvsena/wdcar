import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, Package2, Wrench, FileText,
  BarChart3, DollarSign, LogOut, Wrench as LogoIcon,
  Menu, X, ChevronRight,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Clientes', icon: Users, path: '/clientes' },
  { label: 'Peças', icon: Package2, path: '/pecas' },
  { label: 'Serviços', icon: Wrench, path: '/servicos' },
  { label: 'OS', icon: FileText, path: '/os' },
  { label: 'Financeiro', icon: DollarSign, path: '/financeiro' },
  { label: 'Analytics', icon: BarChart3, path: '/analytics' },
];

const bottomNav = [
  { label: 'Início', icon: LayoutDashboard, path: '/' },
  { label: 'Clientes', icon: Users, path: '/clientes' },
  { label: 'OS', icon: FileText, path: '/os' },
  { label: 'Peças', icon: Package2, path: '/pecas' },
  { label: 'Mais', icon: Menu, path: '/analytics' },
];

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

  return (
    <div className="min-h-screen bg-grafite-950 text-gray-100 pb-16 md:pb-0 md:flex">
      {/* ===== TOP BAR (mobile) ===== */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-grafite-900 border-b border-grafite-800 px-4 h-14 flex items-center justify-between">
        <button onClick={() => setDrawerOpen(true)} className="text-gray-400 hover:text-white p-1">
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-laranja-600 rounded-lg flex items-center justify-center">
            <LogoIcon size={18} className="text-white" />
          </div>
          <span className="font-bold text-white">WDOcar</span>
        </div>
        <div className="w-8 h-8 bg-grafite-700 rounded-full flex items-center justify-center text-xs font-bold text-laranja-400">
          {user?.username?.charAt(0).toUpperCase()}
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
        className={`md:hidden fixed top-0 left-0 z-50 h-full w-72 bg-grafite-900 border-r border-grafite-800 transform transition-transform duration-300 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-grafite-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-laranja-600 rounded-lg flex items-center justify-center">
              <LogoIcon size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">WDOcar</h1>
              <p className="text-xs text-gray-400">{user?.nome_oficina}</p>
            </div>
          </div>
          <button onClick={() => setDrawerOpen(false)} className="text-gray-400 hover:text-white p-1">
            <X size={22} />
          </button>
        </div>

        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setDrawerOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${
                  active
                    ? 'bg-laranja-600/20 text-laranja-400 border border-laranja-600/30'
                    : 'text-gray-400 hover:bg-grafite-800 hover:text-gray-200'
                }`}
              >
                <item.icon size={20} />
                <span className="flex-1">{item.label}</span>
                <ChevronRight size={16} className="text-gray-600" />
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-grafite-800">
          <div className="flex items-center gap-3 px-4 py-2 text-sm text-gray-400 mb-1">
            <div className="w-8 h-8 bg-grafite-700 rounded-full flex items-center justify-center text-xs font-bold text-laranja-400">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <span className="truncate">{user?.username}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-400 hover:text-red-400 hover:bg-grafite-800 rounded-lg transition-all"
          >
            <LogOut size={20} />
            Sair
          </button>
        </div>
      </aside>

      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-grafite-900 border-r border-grafite-800 h-screen sticky top-0">
        <div className="p-5 border-b border-grafite-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-laranja-600 rounded-lg flex items-center justify-center">
              <LogoIcon size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">WDOcar</h1>
              <p className="text-xs text-gray-400">{user?.nome_oficina}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all ${
                  active
                    ? 'bg-laranja-600/20 text-laranja-400 border border-laranja-600/30'
                    : 'text-gray-400 hover:bg-grafite-800 hover:text-gray-200'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-grafite-800">
          <div className="flex items-center gap-3 px-4 py-2 text-sm text-gray-400">
            <div className="w-8 h-8 bg-grafite-700 rounded-full flex items-center justify-center text-xs font-bold text-laranja-400">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <span className="truncate">{user?.username}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-400 hover:text-red-400 hover:bg-grafite-800 rounded-lg transition-all mt-1"
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-grafite-900 border-t border-grafite-800 flex items-center justify-around px-1 pb-safe" style={{ paddingBottom: 'env(safe-area-inset-bottom, 4px)' }}>
        {bottomNav.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 min-w-0 rounded-lg transition-colors ${
                active ? 'text-laranja-400' : 'text-gray-500'
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

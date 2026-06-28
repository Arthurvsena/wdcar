import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isAdmin, isDev, isMaster } from '../utils/permissions';
import { LogOut } from 'lucide-react';

function DevModeUI() {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-grafite-950 flex items-center justify-center">
      <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-8 text-center">
        <div className="w-16 h-16 bg-laranja-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🔒</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Modo Dev</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Acesso restrito para desenvolvedores</p>
        <button
          onClick={() => { logout(); window.location.href = '/login'; }}
          className="flex items-center gap-2 bg-gray-100 dark:bg-grafite-800 hover:bg-gray-200 dark:hover:bg-grafite-700 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg text-sm mx-auto"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </div>
  );
}

export default function ProtectedRoute({ children, allowedRoles, requiredPermission }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-grafite-950 text-laranja-600 dark:text-laranja-400">Carregando...</div>;
  }
  if (!user) return <Navigate to="/login" replace />;

  if (isDev(user)) {
    return <DevModeUI />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role) && !user.is_master) {
    return <Navigate to="/" replace />;
  }

  return children;
}
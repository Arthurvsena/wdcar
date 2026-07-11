import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isDev } from '../utils/permissions';

export default function ProtectedRoute({ children, allowedRoles, requiredPermission }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-grafite-950 text-laranja-600 dark:text-laranja-400">Carregando...</div>;
  }
  if (!user) return <Navigate to="/login" replace />;

  // Usuários dev passam direto: o Layout os leva ao painel /dev
  if (isDev(user)) {
    return children;
  }

  if (allowedRoles && !allowedRoles.includes(user.role) && !user.is_master) {
    return <Navigate to="/" replace />;
  }

  return children;
}

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';
import { isAdmin, isDev } from '../utils/permissions';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [oficina, setOficina] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshOficina = useCallback(async (currentUser) => {
    const u = currentUser || user;
    if (!u || isDev(u)) {
      setOficina(null);
      return null;
    }
    try {
      const { data } = await api.get('/oficina');
      setOficina(data);
      return data;
    } catch (e) {
      return null;
    }
  }, [user]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const saved = localStorage.getItem('user');
    if (!token) {
      setLoading(false);
      return;
    }
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {
        console.warn('Failed to parse stored user:', e);
      }
    }
    api.get('/auth/me')
      .then(({ data }) => {
        localStorage.setItem('user', JSON.stringify(data));
        setUser(data);
        return refreshOficina(data);
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    const oficinaData = await refreshOficina(data.user);
    return { ...data, oficina: oficinaData };
  };

  const register = async (username, password, nome_oficina) => {
    const { data } = await api.post('/auth/register', {
      username,
      password,
      nome_oficina,
    });
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    await refreshOficina(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setOficina(null);
  };

  const canAccess = (permission) => {
    if (!user) return false;
    if (isAdmin(user)) return true;
    if (isDev(user)) return false;
    if (!user.permissoes) return false;
    return user.permissoes.split(',').map(p => p.trim()).filter(Boolean).includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user, oficina, login, register, logout, loading, canAccess, refreshOficina }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

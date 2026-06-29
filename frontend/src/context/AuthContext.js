import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';
import { isAdmin, isDev } from '../utils/permissions';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    api.get('/auth/me')
      .then(({ data }) => {
        localStorage.setItem('user', JSON.stringify(data));
        setUser(data);
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
    return data;
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
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const canAccess = (permission) => {
    if (!user) return false;
    if (isAdmin(user)) return true;
    if (isDev(user)) return false;
    if (!user.permissoes) return false;
    return user.permissoes.split(',').map(p => p.trim()).filter(Boolean).includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, canAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

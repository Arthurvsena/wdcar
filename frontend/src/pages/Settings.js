import React, { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { User, Shield, Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { isAdmin, ROLES } from '../utils/permissions';

const getErrorMessage = (err) => {
  const detail = err.response?.data?.detail;
  if (!detail) return 'Erro ao salvar usuário';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map(e => e.msg).filter(Boolean).join(', ');
  }
  if (typeof detail === 'object' && detail.msg) return detail.msg;
  return 'Erro ao salvar usuário';
};

const ROLE_COLORS = {
  master: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  admin: 'bg-laranja-500/20 text-laranja-400 border-laranja-500/30',
  user: 'bg-grafite-700 text-gray-400 border-grafite-600',
};

const ROLE_LABELS = {
  master: 'MASTER',
  admin: 'ADMIN',
  user: 'USER',
};

export default function Settings() {
  const { user: authUser } = useAuth();

  if (!isAdmin(authUser)) {
    return <Navigate to="/perfil" replace />;
  }

  const fileRef = useRef(null);
  const [users, setUsers] = useState([]);
  const [userForm, setUserForm] = useState({ username: '', password: '', email: '', permissoes: '', role: 'user' });
  const [editingUserId, setEditingUserId] = useState(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('info');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    api.get('/auth/users').then(({ data }) => setUsers(data)).catch(() => {});
  };

  const showMsg = (text, type = 'info') => {
    setMsg(text);
    setMsgType(type);
    setTimeout(() => { setMsg(''); setMsgType('info'); }, 3000);
  };

  const startEditUser = (u) => {
    setUserForm({
      username: u.username,
      password: '',
      email: u.email || '',
      permissoes: u.permissoes || '',
      role: u.role || 'user',
    });
    setEditingUserId(u.id);
    setShowUserForm(true);
  };

  const saveUser = async (e) => {
    e.preventDefault();
    if (!userForm.username.trim()) return;
    setSaving(true);
    try {
      const payload = { ...userForm };
      if (!payload.password) delete payload.password;
      if (editingUserId) {
        await api.put(`/auth/users/${editingUserId}`, payload);
      } else {
        await api.post('/auth/users', payload);
      }
      setShowUserForm(false);
      setEditingUserId(null);
      setUserForm({ username: '', password: '', email: '', permissoes: '', role: 'user' });
      loadUsers();
      showMsg(editingUserId ? 'Usuário atualizado!' : 'Usuário criado!', 'success');
    } catch (err) {
      showMsg(getErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Remover este usuário?')) return;
    try {
      await api.delete(`/auth/users/${id}`);
      loadUsers();
      showMsg('Usuário removido', 'success');
    } catch (err) {
      showMsg(getErrorMessage(err), 'error');
    }
  };

  const promoteToAdmin = async (id) => {
    try {
      await api.put(`/auth/users/${id}`, { role: 'admin' });
      loadUsers();
      showMsg('Usuário promovido a Admin!', 'success');
    } catch (err) {
      showMsg(getErrorMessage(err), 'error');
    }
  };

  const togglePermissao = (perm) => {
    const current = userForm.permissoes ? userForm.permissoes.split(',').filter(Boolean) : [];
    const idx = current.indexOf(perm);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(perm);
    }
    setUserForm({ ...userForm, permissoes: current.join(',') });
  };

  const hasPerm = (perm) => {
    return userForm.permissoes ? userForm.permissoes.split(',').includes(perm) : true;
  };

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Configurações</h1>

      {msg && (
        <div className={`px-4 py-3 rounded-xl text-sm flex items-center gap-2 ${
          msgType === 'error' ? 'bg-red-500/10 border border-red-500/30 text-red-400' :
          msgType === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' :
          'bg-laranja-600/20 border border-laranja-600/30 text-laranja-600 dark:text-laranja-400'
        }`}>
          {msgType === 'error' ? <X size={16} /> : <Check size={16} />}
          {msg}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex justify-end">
          <button
            onClick={() => { setShowUserForm(true); setEditingUserId(null); setUserForm({ username: '', password: '', email: '', permissoes: '', role: 'user' }); }}
            className="flex items-center gap-2 bg-laranja-600 hover:bg-laranja-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
          >
            <Plus size={18} /> Novo Usuário
          </button>
        </div>

        {showUserForm && (
          <form onSubmit={saveUser} className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4 md:p-5 space-y-3">
            <h3 className="text-gray-900 dark:text-white font-semibold text-sm">{editingUserId ? 'Editar Usuário' : 'Novo Usuário'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input placeholder="Nome de usuário" value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500" required />
              <input placeholder={editingUserId ? 'Nova senha (deixar vazio para manter)' : 'Senha'} type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500" required={!editingUserId} />
              <input placeholder="Email" type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500" />
              <select
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500"
              >
                <option value="user">USER</option>
                <option value="admin">ADMIN</option>
                {authUser?.is_master && <option value="master">MASTER</option>}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Acesso às abas</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {['dashboard', 'clientes', 'pecas', 'servicos', 'os', 'financeiro', 'analytics'].map((perm) => (
                  <label key={perm} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                    hasPerm(perm) ? 'bg-laranja-600/20 border-laranja-600/30 text-laranja-600 dark:text-laranja-400' : 'bg-gray-100 dark:bg-grafite-800 border-gray-300 dark:border-grafite-700 text-gray-500 dark:text-gray-400'
                  }`}>
                    <input
                      type="checkbox"
                      checked={hasPerm(perm)}
                      onChange={() => togglePermissao(perm)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                      hasPerm(perm) ? 'bg-laranja-600 border-laranja-600' : 'bg-gray-200 dark:bg-grafite-700 border-gray-400 dark:border-grafite-600'
                    }`}>
                      {hasPerm(perm) && <Check size={10} className="text-white" />}
                    </div>
                    <span className="text-xs capitalize">{perm}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" className="flex-1 bg-laranja-600 hover:bg-laranja-700 text-white py-3 rounded-lg text-sm font-medium">
                {editingUserId ? 'Atualizar' : 'Criar'}
              </button>
              <button type="button" onClick={() => { setShowUserForm(false); setEditingUserId(null); }} className="flex-1 bg-gray-200 dark:bg-grafite-700 hover:bg-gray-300 dark:hover:bg-grafite-600 text-gray-700 dark:text-gray-300 py-3 rounded-lg text-sm">
                Cancelar
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {users.length === 0 ? (
            <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Nenhum usuário</div>
          ) : (
            users.map((u) => (
              <div key={u.id} className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-grafite-700 flex items-center justify-center flex-shrink-0">
                  {u.avatar ? (
                    <img src={u.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User size={18} className="text-gray-500 dark:text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-gray-900 dark:text-white text-sm font-medium">{u.username}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${ROLE_COLORS[u.role] || ROLE_COLORS.user}`}>
                      {ROLE_LABELS[u.role] || 'USER'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.email || 'Sem email'}</p>
                  {u.permissoes && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {u.permissoes.split(',').filter(Boolean).map((p) => (
                        <span key={p} className="text-[10px] px-1.5 py-0.5 rounded-full bg-laranja-500/10 text-laranja-600 dark:text-laranja-400 capitalize">
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  {authUser?.is_master && u.role !== 'master' && !u.is_master && u.role !== 'admin' && (
                    <button onClick={() => promoteToAdmin(u.id)} className="text-gray-400 dark:text-gray-500 hover:text-purple-400 p-1.5" title="Promover a Admin">
                      <Shield size={14} />
                    </button>
                  )}
                  <button onClick={() => startEditUser(u)} className="text-gray-400 dark:text-gray-500 hover:text-laranja-400 p-1.5">
                    <Pencil size={14} />
                  </button>
                  {u.id !== authUser?.id && (
                    <button onClick={() => deleteUser(u.id)} className="text-gray-400 dark:text-gray-500 hover:text-red-400 p-1.5">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
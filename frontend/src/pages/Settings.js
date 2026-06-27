import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { User, Shield, Key, Plus, Trash2, Pencil, Camera, Save, X, Check, AlertCircle } from 'lucide-react';

const TAB_LIST = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'clientes', label: 'Clientes' },
  { key: 'pecas', label: 'Peças' },
  { key: 'servicos', label: 'Serviços' },
  { key: 'os', label: 'OS' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'analytics', label: 'Analytics' },
];

export default function Settings() {
  const { user: authUser, login } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [activeTab, setActiveTab] = useState('perfil');
  const [users, setUsers] = useState([]);
  const [profile, setProfile] = useState({ username: '', nome_oficina: '', email: '' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [userForm, setUserForm] = useState({ username: '', password: '', email: '', permissoes: '' });
  const [editingUserId, setEditingUserId] = useState(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('info');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/auth/me').then(({ data }) => {
      setProfile({
        username: data.username || '',
        nome_oficina: data.nome_oficina || '',
        email: data.email || '',
      });
    }).catch(() => {});
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

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/auth/me', profile);
      showMsg('Perfil atualizado!', 'success');
    } catch (err) {
      showMsg(err.response?.data?.detail || 'Erro ao atualizar perfil', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await api.post('/auth/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      login(authUser.username, '');
      showMsg('Avatar atualizado!', 'success');
    } catch (err) {
      showMsg('Erro ao enviar avatar', 'error');
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm) {
      showMsg('Senhas não conferem', 'error');
      return;
    }
    if (passwordForm.new_password.length < 4) {
      showMsg('Senha deve ter no mínimo 4 caracteres', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.put('/auth/me/password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      showMsg('Senha alterada com sucesso!', 'success');
      setPasswordForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      showMsg(err.response?.data?.detail || 'Erro ao alterar senha', 'error');
    } finally {
      setSaving(false);
    }
  };

  const startEditUser = (u) => {
    setUserForm({
      username: u.username,
      password: '',
      email: u.email || '',
      permissoes: u.permissoes || '',
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
      setUserForm({ username: '', password: '', email: '', permissoes: '' });
      loadUsers();
      showMsg(editingUserId ? 'Usuário atualizado!' : 'Usuário criado!', 'success');
    } catch (err) {
      showMsg(err.response?.data?.detail || 'Erro ao salvar usuário', 'error');
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
      showMsg(err.response?.data?.detail || 'Erro ao remover', 'error');
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
      <h1 className="text-xl md:text-2xl font-bold text-white">Configurações</h1>

      {msg && (
        <div className={`px-4 py-3 rounded-xl text-sm flex items-center gap-2 ${
          msgType === 'error' ? 'bg-red-500/10 border border-red-500/30 text-red-400' :
          msgType === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' :
          'bg-laranja-600/20 border border-laranja-600/30 text-laranja-400'
        }`}>
          {msgType === 'error' ? <XCircle size={16} /> : <Check size={16} />}
          {msg}
        </div>
      )}

      <div className="flex gap-1 bg-grafite-900 rounded-xl p-1 border border-grafite-800 overflow-x-auto">
        {[
          { key: 'perfil', label: 'Perfil', icon: User },
          { key: 'senha', label: 'Senha', icon: Key },
          { key: 'usuarios', label: 'Usuários', icon: Shield },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.key ? 'bg-laranja-600 text-white shadow-lg shadow-laranja-600/20' : 'text-gray-400 hover:text-white'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'perfil' && (
        <div className="bg-grafite-900 border border-grafite-800 rounded-xl p-4 md:p-6">
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-20 h-20 md:w-24 md:h-24 mb-3">
              {authUser?.avatar ? (
                <img src={authUser.avatar} alt="avatar" className="w-full h-full rounded-full object-cover border-2 border-laranja-600" />
              ) : (
                <div className="w-full h-full rounded-full bg-grafite-700 flex items-center justify-center border-2 border-laranja-600">
                  <User size={36} className="text-gray-400" />
                </div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 bg-laranja-600 rounded-full flex items-center justify-center hover:bg-laranja-700 transition-colors"
              >
                <Camera size={14} className="text-white" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
          </div>
          <form onSubmit={saveProfile} className="space-y-3 max-w-md mx-auto">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Nome de usuário</label>
              <input value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value })} className="w-full bg-grafite-800 border border-grafite-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-laranja-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Nome da oficina</label>
              <input value={profile.nome_oficina} onChange={(e) => setProfile({ ...profile, nome_oficina: e.target.value })} className="w-full bg-grafite-800 border border-grafite-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-laranja-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Email</label>
              <input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className="w-full bg-grafite-800 border border-grafite-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-laranja-500" />
            </div>
            <button type="submit" disabled={saving} className="w-full bg-laranja-600 hover:bg-laranja-700 text-white py-3 rounded-lg text-sm font-medium disabled:opacity-40">
              <Save size={16} className="inline mr-2" />Salvar
            </button>
          </form>
        </div>
      )}

      {activeTab === 'senha' && (
        <div className="bg-grafite-900 border border-grafite-800 rounded-xl p-4 md:p-6">
          <form onSubmit={changePassword} className="space-y-3 max-w-md mx-auto">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Senha atual</label>
              <input type="password" value={passwordForm.current_password} onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })} className="w-full bg-grafite-800 border border-grafite-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-laranja-500" required />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Nova senha</label>
              <input type="password" value={passwordForm.new_password} onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })} className="w-full bg-grafite-800 border border-grafite-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-laranja-500" required />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Confirmar nova senha</label>
              <input type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} className="w-full bg-grafite-800 border border-grafite-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-laranja-500" required />
            </div>
            <button type="submit" disabled={saving} className="w-full bg-laranja-600 hover:bg-laranja-700 text-white py-3 rounded-lg text-sm font-medium disabled:opacity-40">
              <Key size={16} className="inline mr-2" />Alterar Senha
            </button>
          </form>
        </div>
      )}

      {activeTab === 'usuarios' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={() => { setShowUserForm(true); setEditingUserId(null); setUserForm({ username: '', password: '', email: '', permissoes: '' }); }}
              className="flex items-center gap-2 bg-laranja-600 hover:bg-laranja-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            >
              <Plus size={18} /> Novo Usuário
            </button>
          </div>

          {showUserForm && (
            <form onSubmit={saveUser} className="bg-grafite-900 border border-grafite-800 rounded-xl p-4 md:p-5 space-y-3">
              <h3 className="text-white font-semibold text-sm">{editingUserId ? 'Editar Usuário' : 'Novo Usuário'}</h3>
              <div className="space-y-3">
                <input placeholder="Nome de usuário" value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} className="w-full bg-grafite-800 border border-grafite-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-laranja-500" required />
                <input placeholder={editingUserId ? 'Nova senha (deixar vazio para manter)' : 'Senha'} type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} className="w-full bg-grafite-800 border border-grafite-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-laranja-500" required={!editingUserId} />
                <input placeholder="Email" type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} className="w-full bg-grafite-800 border border-grafite-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-laranja-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Acesso às abas</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {TAB_LIST.map((tab) => (
                    <label key={tab.key} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                      hasPerm(tab.key) ? 'bg-laranja-600/20 border-laranja-600/30 text-laranja-400' : 'bg-grafite-800 border-grafite-700 text-gray-400'
                    }`}>
                      <input
                        type="checkbox"
                        checked={hasPerm(tab.key)}
                        onChange={() => togglePermissao(tab.key)}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                        hasPerm(tab.key) ? 'bg-laranja-600 border-laranja-600' : 'bg-grafite-700 border-grafite-600'
                      }`}>
                        {hasPerm(tab.key) && <Check size={10} className="text-white" />}
                      </div>
                      <span className="text-xs">{tab.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" className="flex-1 bg-laranja-600 hover:bg-laranja-700 text-white py-3 rounded-lg text-sm font-medium">
                  {editingUserId ? 'Atualizar' : 'Criar'}
                </button>
                <button type="button" onClick={() => { setShowUserForm(false); setEditingUserId(null); }} className="flex-1 bg-grafite-700 hover:bg-grafite-600 text-gray-300 py-3 rounded-lg text-sm">
                  Cancelar
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {users.length === 0 ? (
              <div className="bg-grafite-900 border border-grafite-800 rounded-xl p-8 text-center text-gray-500 text-sm">Nenhum usuário</div>
            ) : (
              users.map((u) => (
                <div key={u.id} className="bg-grafite-900 border border-grafite-800 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-grafite-700 flex items-center justify-center flex-shrink-0">
                    {u.avatar ? (
                      <img src={u.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User size={18} className="text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{u.username}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email || 'Sem email'}</p>
                    {u.permissoes && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {u.permissoes.split(',').filter(Boolean).map((p) => (
                          <span key={p} className="text-[10px] px-1.5 py-0.5 rounded-full bg-laranja-500/10 text-laranja-400">
                            {TAB_LIST.find((t) => t.key === p)?.label || p}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEditUser(u)} className="text-gray-500 hover:text-laranja-400 p-1.5">
                      <Pencil size={14} />
                    </button>
                    {u.id !== authUser?.id && (
                      <button onClick={() => deleteUser(u.id)} className="text-gray-500 hover:text-red-400 p-1.5">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import api, { getMediaUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import { User, Shield, Plus, Trash2, Pencil, Check, X, Building2, Upload, ScrollText } from 'lucide-react';
import { isAdmin, ROLES, ALL_PERMISSIONS, defaultPermsCsv } from '../utils/permissions';
import { getErrorMessage } from '../utils/errors';

const ROLE_COLORS = {
  master: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  admin: 'bg-laranja-500/20 text-laranja-400 border-laranja-500/30',
  user: 'bg-gray-200 dark:bg-grafite-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-grafite-600',
  mecanico: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const ROLE_LABELS = {
  master: 'MASTER',
  admin: 'ADMIN',
  user: 'USER',
  mecanico: 'MECÂNICO',
};

export default function Settings() {
  const { user: authUser, oficina, refreshOficina } = useAuth();
  const logoInputRef = useRef(null);
  const [nomeOficina, setNomeOficina] = useState('');
  const [savingOficina, setSavingOficina] = useState(false);

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

  const [auditItems, setAuditItems] = useState([]);
  const [auditTotal, setAuditTotal] = useState(0);

  const loadAudit = (skip = 0) => {
    api.get(`/oficina/audit?skip=${skip}&limit=20`).then(({ data }) => {
      setAuditItems((prev) => (skip === 0 ? data.items : [...prev, ...data.items]));
      setAuditTotal(data.total || 0);
    }).catch(() => {});
  };

  useEffect(() => {
    loadUsers();
    loadAudit();
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
      setUserForm({ username: '', password: '', email: '', permissoes: defaultPermsCsv('user'), role: 'user' });
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
    return userForm.permissoes ? userForm.permissoes.split(',').filter(Boolean).includes(perm) : false;
  };

  useEffect(() => {
    setNomeOficina(oficina?.nome || '');
  }, [oficina]);

  const saveOficina = async (e) => {
    e.preventDefault();
    if (!nomeOficina.trim()) return;
    setSavingOficina(true);
    try {
      await api.put('/oficina', { nome: nomeOficina.trim() });
      await refreshOficina();
      showMsg('Dados da oficina salvos!', 'success');
    } catch (err) {
      showMsg(getErrorMessage(err, 'Erro ao salvar oficina'), 'error');
    } finally {
      setSavingOficina(false);
    }
  };

  const uploadLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'image/png') {
      showMsg('A logo deve ser um arquivo PNG', 'error');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post('/oficina/logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      await refreshOficina();
      showMsg('Logo atualizada!', 'success');
    } catch (err) {
      showMsg(getErrorMessage(err, 'Erro ao enviar logo'), 'error');
    } finally {
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const removeLogo = async () => {
    try {
      await api.delete('/oficina/logo');
      await refreshOficina();
      showMsg('Logo removida', 'success');
    } catch (err) {
      showMsg(getErrorMessage(err, 'Erro ao remover logo'), 'error');
    }
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

      {/* ===== DADOS DA OFICINA ===== */}
      <form onSubmit={saveOficina} className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4 md:p-5 space-y-4">
        <h3 className="flex items-center gap-2 text-gray-900 dark:text-white font-semibold text-sm">
          <Building2 size={16} className="text-laranja-600 dark:text-laranja-400" />
          Dados da Oficina
        </h3>
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1">
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Nome da oficina</label>
            <input
              value={nomeOficina}
              onChange={(e) => setNomeOficina(e.target.value)}
              className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500"
              placeholder="Nome da oficina"
              required
            />
          </div>
          <button
            type="submit"
            disabled={savingOficina}
            className="bg-laranja-600 hover:bg-laranja-700 disabled:opacity-50 text-white px-5 py-3 rounded-lg text-sm font-medium transition-all"
          >
            {savingOficina ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Logo (PNG) - aparece na barra de navegação</label>
          <div className="flex items-center gap-4">
            {oficina?.logo ? (
              <>
                <img src={getMediaUrl(oficina.logo)} alt="Logo da oficina" className="h-12 max-w-[160px] object-contain bg-gray-100 dark:bg-grafite-800 rounded-lg p-1.5" />
                <button type="button" onClick={removeLogo} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300">
                  <Trash2 size={14} /> Remover
                </button>
                <button type="button" onClick={() => logoInputRef.current?.click()} className="flex items-center gap-1 text-xs text-laranja-600 dark:text-laranja-400 hover:underline">
                  <Upload size={14} /> Trocar
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="flex items-center gap-2 bg-gray-100 dark:bg-grafite-800 border border-dashed border-gray-300 dark:border-grafite-600 rounded-lg px-4 py-3 text-sm text-gray-500 dark:text-gray-400 hover:border-laranja-500 hover:text-laranja-500 transition-colors"
              >
                <Upload size={16} />
                Enviar logo em PNG
              </button>
            )}
            <input ref={logoInputRef} type="file" accept="image/png" onChange={uploadLogo} className="hidden" />
          </div>
        </div>
      </form>

      <div className="space-y-3">
        <div className="flex justify-end">
          <button
            onClick={() => { setShowUserForm(true); setEditingUserId(null); setUserForm({ username: '', password: '', email: '', permissoes: defaultPermsCsv('user'), role: 'user' }); }}
            className="flex items-center gap-2 bg-laranja-600 hover:bg-laranja-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
          >
            <Plus size={18} /> Novo Usuário
          </button>
        </div>

        {showUserForm && (
          <form onSubmit={saveUser} className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4 md:p-5 space-y-3">
            <h3 className="text-gray-900 dark:text-white font-semibold text-sm">{editingUserId ? 'Editar Usuário' : 'Novo Usuário'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Nome de usuário</label>
                <input placeholder="Nome de usuário" value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500" required />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Senha</label>
                <input placeholder={editingUserId ? 'Nova senha (deixar vazio para manter)' : 'Senha'} type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500" required={!editingUserId} />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Email</label>
                <input placeholder="Email" type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Nível de acesso</label>
                <select
                  value={userForm.role}
                  onChange={(e) => {
                    const role = e.target.value;
                    // Ao escolher o nível, pré-preenche as abas com o padrão do
                    // role (ex.: mecânico já vem com OS marcada) para não criar
                    // usuários sem acesso. O admin ainda pode ajustar manualmente.
                    setUserForm({ ...userForm, role, permissoes: defaultPermsCsv(role) });
                  }}
                  className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500"
                >
                  <option value="user">USER</option>
                  <option value="mecanico">MECÂNICO</option>
                  <option value="admin">ADMIN</option>
                  {authUser?.is_master && <option value="master">MASTER</option>}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Acesso às abas</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {ALL_PERMISSIONS.map((perm) => (
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
                    <img src={getMediaUrl(u.avatar)} alt="" className="w-full h-full rounded-full object-cover" />
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

      {/* ===== AUDITORIA DA OFICINA ===== */}
      <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4 md:p-5">
        <h3 className="flex items-center gap-2 text-gray-900 dark:text-white font-semibold text-sm mb-3">
          <ScrollText size={16} className="text-laranja-600 dark:text-laranja-400" />
          Atividade recente
          <span className="text-xs font-normal text-gray-400">({auditTotal})</span>
        </h3>
        {auditItems.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma atividade registrada ainda</p>
        ) : (
          <div className="space-y-1">
            {auditItems.map((a) => (
              <div key={a.id} className="flex items-center gap-3 text-xs py-1.5 border-b border-gray-100 dark:border-grafite-800/60 last:border-0">
                <span className="text-gray-400 dark:text-gray-500 whitespace-nowrap w-32 shrink-0">
                  {a.created_at ? new Date(a.created_at).toLocaleString('pt-BR') : '-'}
                </span>
                <span className="text-gray-700 dark:text-gray-300 font-medium shrink-0">{a.username || '-'}</span>
                <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-grafite-800 text-gray-600 dark:text-gray-400 whitespace-nowrap shrink-0">{a.acao}</span>
                <span className="text-gray-500 dark:text-gray-400 truncate">{a.detalhe || (a.entidade ? `${a.entidade} #${a.entidade_id}` : '')}</span>
              </div>
            ))}
            {auditItems.length < auditTotal && (
              <button onClick={() => loadAudit(auditItems.length)} className="mt-2 text-xs text-laranja-600 dark:text-laranja-400 hover:underline">
                Carregar mais
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
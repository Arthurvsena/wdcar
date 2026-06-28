import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { User, Camera, Save, Key, Check, X } from 'lucide-react';

export default function Perfil() {
  const { user: authUser, login } = useAuth();
  const fileRef = useRef(null);
  const [profile, setProfile] = useState({ username: '', nome_oficina: '', email: '' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm: '' });
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
  }, []);

  const showMsg = (text, type = 'info') => {
    setMsg(text);
    setMsgType(type);
    setTimeout(() => { setMsg(''); setMsgType('info'); }, 3000);
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/auth/me', profile);
      const updatedUser = { ...authUser, ...data };
      localStorage.setItem('user', JSON.stringify(updatedUser));
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
      const updatedUser = { ...authUser, avatar: data.url || data.avatar };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      window.location.reload();
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

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-xl md:text-2xl font-bold text-white">Meu Perfil</h1>

      {msg && (
        <div className={`px-4 py-3 rounded-xl text-sm flex items-center gap-2 ${
          msgType === 'error' ? 'bg-red-500/10 border border-red-500/30 text-red-400' :
          msgType === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' :
          'bg-laranja-600/20 border border-laranja-600/30 text-laranja-400'
        }`}>
          {msgType === 'error' ? <X size={16} /> : <Check size={16} />}
          {msg}
        </div>
      )}

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

      <div className="bg-grafite-900 border border-grafite-800 rounded-xl p-4 md:p-6">
        <h2 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
          <Key size={16} className="text-laranja-400" />
          Alterar Senha
        </h2>
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
    </div>
  );
}
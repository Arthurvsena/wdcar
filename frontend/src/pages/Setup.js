import React, { useState, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Wrench, Upload, X } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/errors';

export default function Setup() {
  const { user, oficina, refreshOficina, loading } = useAuth();
  const navigate = useNavigate();
  const [nome, setNome] = useState(oficina?.nome || '');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (oficina?.setup_completo) return <Navigate to="/" replace />;

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'image/png') {
      setError('A logo deve ser um arquivo PNG');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('A logo deve ter no máximo 5MB');
      return;
    }
    setError('');
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const clearLogo = () => {
    setLogoFile(null);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nome.trim()) {
      setError('Informe o nome da oficina');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await api.post('/oficina/setup', { nome: nome.trim() });
      if (logoFile) {
        const formData = new FormData();
        formData.append('file', logoFile);
        await api.post('/oficina/logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      await refreshOficina();
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao salvar configuração'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-grafite-950 flex flex-col items-center justify-center p-5 transition-colors duration-200">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-laranja-600 rounded-2xl mb-4 shadow-lg shadow-laranja-600/30">
            <Wrench size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bem-vindo ao GiroCerto!</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Vamos configurar a sua oficina antes de começar
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-2xl p-6 md:p-8 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Nome da oficina *</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-xl px-4 py-3.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500 transition-colors"
              placeholder="Ex: Oficina do João"
              required
            />
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
              Este nome aparece no painel e nos orçamentos enviados aos clientes
            </p>
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Logo (PNG, opcional)</label>
            {logoPreview ? (
              <div className="flex items-center gap-4 bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-xl p-4">
                <img src={logoPreview} alt="Prévia da logo" className="h-12 max-w-[140px] object-contain" />
                <button
                  type="button"
                  onClick={clearLogo}
                  className="ml-auto flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                >
                  <X size={14} />
                  Remover
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-grafite-800 border border-dashed border-gray-300 dark:border-grafite-600 rounded-xl px-4 py-6 text-sm text-gray-500 dark:text-gray-400 hover:border-laranja-500 hover:text-laranja-500 transition-colors"
              >
                <Upload size={18} />
                Enviar logo em PNG
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png"
              onChange={handleLogoChange}
              className="hidden"
            />
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
              Sem logo, o nome da oficina será usado como marca — você pode adicionar depois nas Configurações
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-laranja-600 hover:bg-laranja-700 disabled:opacity-50 text-white font-medium py-3.5 rounded-xl transition-colors text-sm active:scale-[0.98]"
          >
            {saving ? 'Salvando...' : 'Começar a usar'}
          </button>
        </form>
      </div>
    </div>
  );
}

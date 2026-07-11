import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Building2, Plus, Users, FileText, Power, CheckCircle2, XCircle, Clock,
  ScrollText, History, X,
} from 'lucide-react';
import api from '../api';
import { getErrorMessage } from '../utils/errors';

export default function DevPanel() {
  const [oficinas, setOficinas] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome_oficina: '', username: '', password: '', email: '' });

  const [auditItems, setAuditItems] = useState([]);
  const [auditTotal, setAuditTotal] = useState(0);
  // null = log de todas as oficinas; objeto oficina = log filtrado por ela
  const [auditOficina, setAuditOficina] = useState(null);
  const auditRef = useRef(null);

  const fetchAudit = useCallback(async (skip = 0, oficinaId = null) => {
    try {
      const params = new URLSearchParams({ skip: String(skip), limit: '30' });
      if (oficinaId != null) params.set('oficina_id', String(oficinaId));
      const { data } = await api.get(`/dev/audit?${params.toString()}`);
      setAuditItems((prev) => (skip === 0 ? data.items : [...prev, ...data.items]));
      setAuditTotal(data.total || 0);
    } catch (err) {
      // auditoria é secundária: não sobrescrever erros principais
    }
  }, []);

  const viewOficinaLog = (oficina) => {
    setAuditOficina(oficina);
    fetchAudit(0, oficina.id);
    auditRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const clearAuditFilter = () => {
    setAuditOficina(null);
    fetchAudit(0, null);
  };

  const fetchOficinas = useCallback(async () => {
    try {
      const { data } = await api.get('/dev/oficinas');
      setOficinas(data.items || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao carregar oficinas'));
    }
  }, []);

  useEffect(() => {
    fetchOficinas();
    fetchAudit();
  }, [fetchOficinas, fetchAudit]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const payload = { ...form, email: form.email.trim() || null };
      const { data } = await api.post('/dev/oficinas', payload);
      setSuccess(`Oficina "${data.oficina.nome}" criada! Usuário master: ${data.master.username}. No primeiro login será pedida a configuração de nome e logo.`);
      setForm({ nome_oficina: '', username: '', password: '', email: '' });
      setShowForm(false);
      fetchOficinas();
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao criar oficina'));
    } finally {
      setSaving(false);
    }
  };

  const toggleAtiva = async (oficina) => {
    setError('');
    setSuccess('');
    try {
      await api.patch(`/dev/oficinas/${oficina.id}`, { ativa: !oficina.ativa });
      fetchOficinas();
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao atualizar oficina'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Oficinas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Contas cadastradas na plataforma</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(''); setSuccess(''); }}
          className="flex items-center gap-2 bg-laranja-600 hover:bg-laranja-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={18} />
          Nova oficina
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-500 px-4 py-3 rounded-xl text-sm">
          {success}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-2xl p-5 md:p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Criar nova conta de oficina</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Nome da oficina *</label>
              <input
                type="text"
                value={form.nome_oficina}
                onChange={(e) => setForm({ ...form, nome_oficina: e.target.value })}
                className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500"
                placeholder="Ex: WDCar"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Email do responsável</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500"
                placeholder="Para recuperação de senha (opcional)"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Usuário master *</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500"
                placeholder="Login do dono da oficina"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Senha inicial *</label>
              <input
                type="text"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500"
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-laranja-600 hover:bg-laranja-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              {saving ? 'Criando...' : 'Criar oficina'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-4 py-2.5"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {oficinas.length === 0 ? (
          <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-2xl p-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Nenhuma oficina cadastrada ainda
          </div>
        ) : (
          oficinas.map((o) => (
            <div
              key={o.id}
              className={`bg-white dark:bg-grafite-900 border rounded-2xl p-4 md:p-5 flex items-center gap-4 ${
                o.ativa ? 'border-gray-200 dark:border-grafite-800' : 'border-red-500/30 opacity-70'
              }`}
            >
              <div className="w-11 h-11 bg-laranja-600/15 rounded-xl flex items-center justify-center shrink-0">
                <Building2 size={22} className="text-laranja-600 dark:text-laranja-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900 dark:text-white truncate">{o.nome}</span>
                  <span className="text-[11px] text-gray-400">#{o.id}</span>
                  {o.ativa ? (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-500">
                      <CheckCircle2 size={11} /> Ativa
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">
                      <XCircle size={11} /> Desativada
                    </span>
                  )}
                  {!o.setup_completo && (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-500">
                      <Clock size={11} /> Aguardando 1º acesso
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span className="inline-flex items-center gap-1"><Users size={12} /> {o.usuarios} usuário{o.usuarios !== 1 ? 's' : ''}</span>
                  <span className="inline-flex items-center gap-1"><FileText size={12} /> {o.ordens_servico} OS</span>
                  {o.created_at && (
                    <span className="hidden sm:inline">desde {new Date(o.created_at).toLocaleDateString('pt-BR')}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => viewOficinaLog(o)}
                  title="Ver log desta oficina"
                  className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-grafite-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-grafite-800 transition-colors"
                >
                  <History size={14} />
                  Log
                </button>
                <button
                  onClick={() => toggleAtiva(o)}
                  title={o.ativa ? 'Desativar oficina' : 'Reativar oficina'}
                  className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border transition-colors ${
                    o.ativa
                      ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                      : 'border-green-500/30 text-green-500 hover:bg-green-500/10'
                  }`}
                >
                  <Power size={14} />
                  {o.ativa ? 'Desativar' : 'Reativar'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ===== AUDITORIA ===== */}
      <div ref={auditRef} className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-2xl p-4 md:p-5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
            <ScrollText size={18} className="text-laranja-600 dark:text-laranja-400" />
            {auditOficina ? `Log — ${auditOficina.nome}` : 'Auditoria'}
            <span className="text-xs font-normal text-gray-400">({auditTotal} registros)</span>
          </h2>
          {auditOficina && (
            <button
              onClick={clearAuditFilter}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-grafite-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-grafite-800 transition-colors"
            >
              <X size={13} />
              Ver todas
            </button>
          )}
        </div>
        {auditItems.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum registro ainda</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-grafite-800">
                  <th className="py-2 pr-3 font-medium">Quando</th>
                  <th className="py-2 pr-3 font-medium">Oficina</th>
                  <th className="py-2 pr-3 font-medium">Usuário</th>
                  <th className="py-2 pr-3 font-medium">Ação</th>
                  <th className="py-2 font-medium">Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {auditItems.map((a) => (
                  <tr key={a.id} className="border-b border-gray-100 dark:border-grafite-800/60 text-gray-700 dark:text-gray-300">
                    <td className="py-2 pr-3 whitespace-nowrap">{a.created_at ? new Date(a.created_at).toLocaleString('pt-BR') : '-'}</td>
                    <td className="py-2 pr-3">{a.oficina_id ?? '-'}</td>
                    <td className="py-2 pr-3">{a.username || '-'}</td>
                    <td className="py-2 pr-3"><span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-grafite-800 whitespace-nowrap">{a.acao}</span></td>
                    <td className="py-2 text-gray-500 dark:text-gray-400">{a.detalhe || (a.entidade ? `${a.entidade} #${a.entidade_id}` : '-')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {auditItems.length < auditTotal && (
              <button
                onClick={() => fetchAudit(auditItems.length, auditOficina?.id ?? null)}
                className="mt-3 text-xs text-laranja-600 dark:text-laranja-400 hover:underline"
              >
                Carregar mais
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

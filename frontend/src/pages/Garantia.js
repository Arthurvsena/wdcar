import React, { useState, useEffect } from 'react';
import api from '../api';
import { ShieldCheck, Plus, X, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import Pagination from '../components/Pagination';

const getErrorMessage = (err, fallback) => {
  const detail = err.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map(e => e.msg).filter(Boolean).join(', ') || fallback;
  }
  if (typeof detail === 'object' && detail.msg) return detail.msg;
  return fallback;
};

const statusStyles = {
  ativa: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Ativa', Icon: CheckCircle2 },
  expirada: { bg: 'bg-gray-500/10', text: 'text-gray-400', label: 'Expirada', Icon: AlertCircle },
  acionada: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Acionada', Icon: XCircle },
};

export default function Garantia() {
  const [warranties, setWarranties] = useState([]);
  const [stats, setStats] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ service_order_id: '', vehicle_id: '', descricao: '', prazo_dias: 90 });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/garantia', { params: { skip: (page - 1) * 20, limit: 20 } });
      setWarranties(data?.items || []);
      setTotal(data?.total || 0);
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao carregar garantias'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page]);
  useEffect(() => { api.get('/garantia/stats').then(({ data }) => setStats(data)).catch(() => {}); }, [warranties.length]);

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/garantia', {
        service_order_id: parseInt(form.service_order_id),
        vehicle_id: parseInt(form.vehicle_id),
        descricao: form.descricao,
        prazo_dias: parseInt(form.prazo_dias) || 90,
      });
      setShowForm(false);
      setForm({ service_order_id: '', vehicle_id: '', descricao: '', prazo_dias: 90 });
      load();
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao criar garantia'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldCheck size={22} className="text-laranja-600 dark:text-laranja-400" /> Garantia
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">Garantias vinculadas a OS e veículos</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-laranja-600 hover:bg-laranja-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
          {showForm ? <X size={18} /> : <Plus size={18} />} <span className="hidden md:inline">{showForm ? 'Cancelar' : 'Nova Garantia'}</span>
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-grafite-900 border border-green-500/20 rounded-xl p-4 text-center">
            <p className="text-lg font-bold text-green-400">{stats.ativas}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">Ativas</p>
          </div>
          <div className="bg-white dark:bg-grafite-900 border border-gray-300 dark:border-grafite-700 rounded-xl p-4 text-center">
            <p className="text-lg font-bold text-gray-500 dark:text-gray-300">{stats.expiradas}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">Expiradas</p>
          </div>
          <div className="bg-white dark:bg-grafite-900 border border-red-500/20 rounded-xl p-4 text-center">
            <p className="text-lg font-bold text-red-400">{stats.acionadas}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">Acionadas</p>
          </div>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-xl text-sm bg-red-500/10 border border-red-500/30 text-red-400">{error}</div>
      )}

      {showForm && (
        <form onSubmit={save} className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4 md:p-5 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">ID da OS</label>
              <input placeholder="ID da OS" type="number" value={form.service_order_id} onChange={(e) => setForm({ ...form, service_order_id: e.target.value })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500" required />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">ID do Veículo</label>
              <input placeholder="ID do Veículo" type="number" value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500" required />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Descrição</label>
              <input placeholder="Descrição" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Prazo (dias)</label>
              <input placeholder="Prazo (dias)" type="number" min="1" value={form.prazo_dias} onChange={(e) => setForm({ ...form, prazo_dias: e.target.value })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500" required />
            </div>
          </div>
          <button type="submit" disabled={saving} className="w-full bg-laranja-600 hover:bg-laranja-700 disabled:opacity-50 text-white py-3 rounded-lg text-sm font-medium">
            {saving ? 'Salvando...' : 'Criar Garantia'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Carregando...</div>
      ) : warranties.length === 0 ? (
        <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Nenhuma garantia registrada</div>
      ) : (
        <div className="space-y-2">
          {warranties.map((w) => {
            const st = statusStyles[w.status] || statusStyles.ativa;
            const StIcon = st.Icon;
            return (
              <div key={w.id} className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${st.bg}`}>
                  <StIcon size={18} className={st.text} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 dark:text-white text-sm font-medium truncate">OS #{w.service_order_id} · {w.descricao || 'Garantia'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Expira em {new Date(w.data_expiracao).toLocaleDateString('pt-BR')}</p>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full ${st.bg} ${st.text}`}>{st.label}</span>
              </div>
            );
          })}
        </div>
      )}
      <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} />
    </div>
  );
}

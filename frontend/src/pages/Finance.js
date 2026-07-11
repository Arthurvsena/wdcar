import React, { useState, useEffect } from 'react';
import api from '../api';
import { TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight, Plus, X, CheckCircle, XCircle, Download } from 'lucide-react';
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

export default function Finance() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [tab, setTab] = useState('todas');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tipo: 'entrada', descricao: '', valor: '' });
  const [saving, setSaving] = useState(false);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const params = { skip: (page - 1) * 50, limit: 50 };
      if (dataInicio) params.data_inicio = dataInicio;
      if (dataFim) params.data_fim = dataFim;
      const { data } = await api.get('/finance/transactions', { params });
      setTransactions(data?.items || []);
      setTotal(data?.total || 0);
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao carregar'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [page, dataInicio, dataFim]);

  useEffect(() => {
    api.get('/finance/summary').then(({ data }) => setSummary(data)).catch(() => {});
  }, []);

  const filtered = tab === 'todas' ? transactions : transactions.filter(t => t.tipo === tab);

  const exportCSV = async () => {
    try {
      const { data } = await api.get('/finance/transactions/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'transacoes.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Erro ao exportar CSV');
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        tipo: form.tipo,
        descricao: form.descricao,
        valor: parseFloat(form.valor) || 0,
      };
      if (payload.valor <= 0) {
        setError('Valor deve ser positivo');
        return;
      }
      if (!payload.descricao.trim()) {
        setError('Descrição é obrigatória');
        return;
      }
      await api.post('/finance/transactions', payload);
      setShowForm(false);
      setForm({ tipo: 'entrada', descricao: '', valor: '' });
      loadTransactions();
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao salvar transação'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Financeiro</h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">Fluxo de caixa da oficina</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 bg-gray-200 dark:bg-grafite-700 hover:bg-gray-300 dark:hover:bg-grafite-600 text-gray-700 dark:text-white px-4 py-2.5 md:py-2 rounded-xl md:rounded-lg text-sm font-medium">
            <Download size={18} />
            <span className="hidden md:inline">Exportar CSV</span>
          </button>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-laranja-600 hover:bg-laranja-700 text-white px-4 py-2.5 md:py-2 rounded-xl md:rounded-lg text-sm font-medium active:scale-95 transition-all shadow-lg shadow-laranja-600/20">
            {showForm ? <X size={18} /> : <Plus size={18} />}
            <span className="hidden md:inline">{showForm ? 'Cancelar' : 'Lançar'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl text-sm bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2">
          <XCircle size={16} /> {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={save} className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4 md:p-5 space-y-3">
          <div className="flex gap-2">
            <button type="button" onClick={() => setForm({ ...form, tipo: 'entrada' })} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${form.tipo === 'entrada' ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-grafite-800 text-gray-500 dark:text-gray-400'}`}>
              <ArrowUpRight size={16} className="inline mr-1" /> Entrada
            </button>
            <button type="button" onClick={() => setForm({ ...form, tipo: 'saida' })} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${form.tipo === 'saida' ? 'bg-red-600 text-white' : 'bg-gray-100 dark:bg-grafite-800 text-gray-500 dark:text-gray-400'}`}>
              <ArrowDownRight size={16} className="inline mr-1" /> Saída
            </button>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Descrição</label>
            <input placeholder="Descrição" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500" required />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Valor (R$)</label>
            <input placeholder="Valor (R$)" type="number" step="0.01" min="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500" required />
          </div>
          <button type="submit" disabled={saving} className="w-full bg-laranja-600 hover:bg-laranja-700 disabled:opacity-50 text-white py-3 rounded-lg text-sm font-medium">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Carregando...</div>
      ) : (
        <>
          {summary && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white dark:bg-grafite-900 border border-green-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUpRight size={14} className="text-green-400" />
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">Entradas</span>
                </div>
                <p className="text-lg md:text-xl font-bold text-green-400 truncate">R$ {(summary.total_entradas ?? 0).toFixed(2)}</p>
              </div>
              <div className="bg-white dark:bg-grafite-900 border border-red-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowDownRight size={14} className="text-red-400" />
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">Saídas</span>
                </div>
                <p className="text-lg md:text-xl font-bold text-red-400 truncate">R$ {(summary.total_saidas ?? 0).toFixed(2)}</p>
              </div>
              <div className="bg-white dark:bg-grafite-900 border border-laranja-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign size={14} className="text-laranja-600 dark:text-laranja-400" />
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">Saldo</span>
                </div>
                <p className={`text-lg md:text-xl font-bold truncate ${(summary.saldo ?? 0) >= 0 ? 'text-laranja-600 dark:text-laranja-400' : 'text-red-400'}`}>
                  R$ {(summary.saldo ?? 0).toFixed(2)}
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-1 bg-white dark:bg-grafite-900 rounded-xl p-1 border border-gray-200 dark:border-grafite-800">
            {['todas', 'entrada', 'saida'].map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setPage(1); }}
                className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  tab === t ? 'bg-laranja-600 text-white' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {t === 'todas' ? 'Todas' : t === 'entrada' ? 'Entradas' : 'Saídas'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 dark:text-gray-400">De:</label>
              <input
                type="date"
                value={dataInicio}
                onChange={e => { setDataInicio(e.target.value); setPage(1); }}
                className="bg-white dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 dark:text-gray-400">Até:</label>
              <input
                type="date"
                value={dataFim}
                onChange={e => { setDataFim(e.target.value); setPage(1); }}
                className="bg-white dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white"
              />
            </div>
            {(dataInicio || dataFim) && (
              <button
                onClick={() => { setDataInicio(''); setDataFim(''); setPage(1); }}
                className="text-xs text-laranja-600 dark:text-laranja-400 hover:text-laranja-500 dark:hover:text-laranja-300"
              >
                Limpar filtro
              </button>
            )}
          </div>

          <div className="space-y-2">
            {filtered.length === 0 && (
              <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                Nenhuma transação encontrada
              </div>
            )}
            {filtered.map((t) => (
              <div key={t.id} className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  t.tipo === 'entrada' ? 'bg-green-500/10' : 'bg-red-500/10'
                }`}>
                  {t.tipo === 'entrada' ? (
                    <TrendingUp size={18} className="text-green-400" />
                  ) : (
                    <TrendingDown size={18} className="text-red-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 dark:text-white text-sm font-medium truncate">{t.descricao || 'Transação'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(t.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
                <span className={`text-sm font-bold ${
                  t.tipo === 'entrada' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {t.tipo === 'entrada' ? '+' : '-'} R$ {(t.valor ?? 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={Math.ceil(total / 50)} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

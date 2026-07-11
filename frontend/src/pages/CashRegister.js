import React, { useState, useEffect } from 'react';
import api from '../api';
import { useToast } from '../context/ToastContext';
import { Wallet, ArrowUpRight, ArrowDownRight, Lock, Unlock, Plus, X } from 'lucide-react';

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

export default function CashRegister() {
  const toast = useToast();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [valorAbertura, setValorAbertura] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tipo: 'entrada', descricao: '', valor: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/cash/current')
      .then(({ data }) => setSession(data))
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCash = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/cash/open', { valor_abertura: parseFloat(valorAbertura) || 0 });
      setValorAbertura('');
      toast.success('Caixa aberto!');
      load();
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao abrir caixa'));
    }
  };

  const closeCash = async () => {
    if (!window.confirm('Fechar o caixa? Essa ação não pode ser desfeita.')) return;
    setError('');
    try {
      await api.post('/cash/close', {});
      toast.success('Caixa fechado!');
      load();
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao fechar caixa'));
    }
  };

  const addMovement = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/cash/movements', { ...form, valor: parseFloat(form.valor) || 0 });
      setForm({ tipo: 'entrada', descricao: '', valor: '' });
      setShowForm(false);
      toast.success(`${form.tipo === 'entrada' ? 'Entrada' : 'Saída'} lançada!`);
      load();
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao lançar movimentação'));
    } finally {
      setSaving(false);
    }
  };

  const totalIn = session ? (session.movements || []).filter(m => m.tipo === 'entrada').reduce((s, m) => s + m.valor, 0) : 0;
  const totalOut = session ? (session.movements || []).filter(m => m.tipo === 'saida').reduce((s, m) => s + m.valor, 0) : 0;
  const saldo = session ? session.valor_abertura + totalIn - totalOut : 0;

  return (
    <div className="space-y-4 pb-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Wallet size={22} className="text-laranja-600 dark:text-laranja-400" /> Caixa
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">Abertura, movimentações e fechamento do dia</p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl text-sm bg-red-500/10 border border-red-500/30 text-red-400">{error}</div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Carregando...</div>
      ) : !session ? (
        <form onSubmit={openCash} className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-5 space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2"><Lock size={16} /> Nenhum caixa aberto no momento</p>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Valor de abertura (R$)</label>
            <input placeholder="Valor de abertura (R$)" type="number" step="0.01" min="0" value={valorAbertura} onChange={(e) => setValorAbertura(e.target.value)} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500" />
          </div>
          <button type="submit" className="w-full bg-laranja-600 hover:bg-laranja-700 text-white py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
            <Unlock size={16} /> Abrir Caixa
          </button>
        </form>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-grafite-900 border border-green-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2"><ArrowUpRight size={14} className="text-green-400" /><span className="text-[10px] text-gray-500 dark:text-gray-400">Entradas</span></div>
              <p className="text-lg font-bold text-green-400 truncate">R$ {totalIn.toFixed(2)}</p>
            </div>
            <div className="bg-white dark:bg-grafite-900 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2"><ArrowDownRight size={14} className="text-red-400" /><span className="text-[10px] text-gray-500 dark:text-gray-400">Saídas</span></div>
              <p className="text-lg font-bold text-red-400 truncate">R$ {totalOut.toFixed(2)}</p>
            </div>
            <div className="bg-white dark:bg-grafite-900 border border-laranja-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2"><Wallet size={14} className="text-laranja-600 dark:text-laranja-400" /><span className="text-[10px] text-gray-500 dark:text-gray-400">Saldo</span></div>
              <p className="text-lg font-bold text-laranja-600 dark:text-laranja-400 truncate">R$ {saldo.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setShowForm(!showForm)} className="flex-1 flex items-center justify-center gap-2 bg-laranja-600 hover:bg-laranja-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
              {showForm ? <X size={18} /> : <Plus size={18} />} {showForm ? 'Cancelar' : 'Lançar Movimentação'}
            </button>
            <button onClick={closeCash} className="flex items-center justify-center gap-2 bg-gray-200 dark:bg-grafite-700 hover:bg-gray-300 dark:hover:bg-grafite-600 text-gray-700 dark:text-white px-4 py-2.5 rounded-xl text-sm font-medium">
              <Lock size={18} /> Fechar Caixa
            </button>
          </div>

          {showForm && (
            <form onSubmit={addMovement} className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4 space-y-3">
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
                {saving ? 'Salvando...' : 'Lançar'}
              </button>
            </form>
          )}

          <div className="space-y-2">
            {(session.movements || []).slice().reverse().map((m) => (
              <div key={m.id} className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${m.tipo === 'entrada' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                  {m.tipo === 'entrada' ? <ArrowUpRight size={18} className="text-green-400" /> : <ArrowDownRight size={18} className="text-red-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 dark:text-white text-sm font-medium truncate">{m.descricao || 'Movimentação'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(m.created_at).toLocaleString('pt-BR')}</p>
                </div>
                <span className={`text-sm font-bold ${m.tipo === 'entrada' ? 'text-green-400' : 'text-red-400'}`}>
                  {m.tipo === 'entrada' ? '+' : '-'} R$ {m.valor.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

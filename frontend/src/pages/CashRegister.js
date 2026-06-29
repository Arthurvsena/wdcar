import React, { useState, useEffect } from 'react';
import api from '../api';
import {
  DollarSign, Plus, X, CheckCircle, XCircle, TrendingUp, TrendingDown,
  LogIn, LogOut, Banknote, CalendarDays, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';

function formataData(dataStr) {
  if (!dataStr) return '--';
  return new Date(dataStr).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function formataHora(dataStr) {
  if (!dataStr) return '--';
  return new Date(dataStr).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit',
  });
}

export default function CashRegister() {
  const [status, setStatus] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ tipo: 'entrada', descricao: '', valor: '' });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const loadStatus = async () => {
    try {
      const { data } = await api.get('/cash/status');
      setStatus(data);
    } catch (err) {
      if (err.response?.status === 404) {
        setStatus({ is_open: false });
      } else {
        setError(err.response?.data?.detail || 'Erro ao carregar status do caixa');
      }
    }
  };

  const loadTransactions = async () => {
    try {
      const { data } = await api.get('/cash/transactions', { params: { date: today } });
      setTransactions(data || []);
    } catch {
      // caixa fechado — sem transações
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadStatus(), loadTransactions()]).finally(() => setLoading(false));
  }, []);

  const handleOpen = async () => {
    setError('');
    setSaving(true);
    try {
      await api.post('/cash/open', { opening_balance: parseFloat(openingBalance) || 0 });
      setShowOpenModal(false);
      setOpeningBalance('');
      await Promise.all([loadStatus(), loadTransactions()]);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao abrir caixa');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async () => {
    setError('');
    setSaving(true);
    try {
      await api.post('/cash/close');
      setShowCloseConfirm(false);
      setStatus(prev => prev ? { ...prev, is_open: false } : { is_open: false });
      setTransactions([]);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao fechar caixa');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      tipo: form.tipo,
      descricao: form.descricao,
      valor: parseFloat(form.valor) || 0,
    };
    if (payload.valor <= 0) { setError('Valor deve ser positivo'); return; }
    if (!payload.descricao.trim()) { setError('Descrição é obrigatória'); return; }
    setSaving(true);
    try {
      await api.post('/cash/transactions', payload);
      setShowForm(false);
      setForm({ tipo: 'entrada', descricao: '', valor: '' });
      await Promise.all([loadStatus(), loadTransactions()]);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao salvar transação');
    } finally {
      setSaving(false);
    }
  };

  const isOpen = status?.is_open === true;

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Caixa</h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">Controle do caixa diário</p>
        </div>
        <div className="flex items-center gap-2">
          {isOpen ? (
            <button
              onClick={() => setShowCloseConfirm(true)}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 md:py-2 rounded-xl md:rounded-lg text-sm font-medium active:scale-95 transition-all shadow-lg shadow-red-600/20"
            >
              <LogOut size={18} />
              <span className="hidden md:inline">Fechar Caixa</span>
            </button>
          ) : (
            <button
              onClick={() => setShowOpenModal(true)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 md:py-2 rounded-xl md:rounded-lg text-sm font-medium active:scale-95 transition-all shadow-lg shadow-green-600/20"
            >
              <LogIn size={18} />
              <span className="hidden md:inline">Abrir Caixa</span>
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-xl text-sm bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2">
          <XCircle size={16} /> {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
          Carregando...
        </div>
      ) : (
        <>
          {/* Status Card */}
          <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Banknote size={24} className="text-laranja-600 dark:text-laranja-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Status do Caixa</p>
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-2 h-2 rounded-full ${isOpen ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {isOpen ? 'Caixa Aberto' : 'Caixa Fechado'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <CalendarDays size={14} />
                <span>{formataData(today)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gray-50 dark:bg-grafite-800/50 rounded-lg p-3">
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">Abertura</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  R$ {(status?.opening_balance ?? 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-green-500/5 rounded-lg p-3 border border-green-500/10">
                <div className="flex items-center gap-1 mb-1">
                  <ArrowUpRight size={12} className="text-green-400" />
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Entradas</p>
                </div>
                <p className="text-sm font-bold text-green-400">
                  R$ {(status?.total_incomes ?? 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-red-500/5 rounded-lg p-3 border border-red-500/10">
                <div className="flex items-center gap-1 mb-1">
                  <ArrowDownRight size={12} className="text-red-400" />
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Saídas</p>
                </div>
                <p className="text-sm font-bold text-red-400">
                  R$ {(status?.total_expenses ?? 0).toFixed(2)}
                </p>
              </div>
              <div className={`rounded-lg p-3 border ${(status?.closing_balance ?? 0) >= 0 ? 'bg-laranja-500/5 border-laranja-500/10' : 'bg-red-500/5 border-red-500/10'}`}>
                <div className="flex items-center gap-1 mb-1">
                  <DollarSign size={12} className={(status?.closing_balance ?? 0) >= 0 ? 'text-laranja-400' : 'text-red-400'} />
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Saldo</p>
                </div>
                <p className={`text-sm font-bold ${(status?.closing_balance ?? 0) >= 0 ? 'text-laranja-600 dark:text-laranja-400' : 'text-red-400'}`}>
                  R$ {(status?.closing_balance ?? 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Transaction Form (only when open) */}
          {isOpen && (
            <>
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 bg-laranja-600 hover:bg-laranja-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium active:scale-95 transition-all shadow-lg shadow-laranja-600/20"
              >
                {showForm ? <X size={18} /> : <Plus size={18} />}
                {showForm ? 'Cancelar' : 'Nova Transação'}
              </button>

              {showForm && (
                <form onSubmit={handleAddTransaction} className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4 md:p-5 space-y-3">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setForm({ ...form, tipo: 'entrada' })} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${form.tipo === 'entrada' ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-grafite-800 text-gray-500 dark:text-gray-400'}`}>
                      Entrada
                    </button>
                    <button type="button" onClick={() => setForm({ ...form, tipo: 'saida' })} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${form.tipo === 'saida' ? 'bg-red-600 text-white' : 'bg-gray-100 dark:bg-grafite-800 text-gray-500 dark:text-gray-400'}`}>
                      Saída
                    </button>
                  </div>
                  <input placeholder="Descrição" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500" required />
                  <input placeholder="Valor (R$)" type="number" step="0.01" min="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500" required />
                  <button type="submit" disabled={saving} className="w-full bg-laranja-600 hover:bg-laranja-700 disabled:opacity-50 text-white py-3 rounded-lg text-sm font-medium">
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                </form>
              )}
            </>
          )}

          {/* Transaction List */}
          <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-grafite-800">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Transações do Dia</h2>
            </div>
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                {isOpen ? 'Nenhuma transação registrada hoje' : 'Caixa fechado — abra o caixa para registrar transações'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-grafite-800 text-xs text-gray-500 dark:text-gray-400">
                      <th className="text-left px-4 py-3 font-medium">Tipo</th>
                      <th className="text-left px-4 py-3 font-medium">Descrição</th>
                      <th className="text-right px-4 py-3 font-medium">Valor</th>
                      <th className="text-right px-4 py-3 font-medium">Data/Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t) => (
                      <tr key={t.id} className="border-b border-gray-100 dark:border-grafite-800/50 last:border-0 hover:bg-gray-50 dark:hover:bg-grafite-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${
                            t.tipo === 'entrada'
                              ? 'bg-green-500/10 text-green-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}>
                            {t.tipo === 'entrada' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {t.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white max-w-[200px] truncate">{t.descricao || '—'}</td>
                        <td className={`px-4 py-3 text-right font-medium ${t.tipo === 'entrada' ? 'text-green-400' : 'text-red-400'}`}>
                          {t.tipo === 'entrada' ? '+' : '-'} R$ {(t.valor ?? 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                          {formataData(t.created_at)} {formataHora(t.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Open Modal */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowOpenModal(false)}>
          <div className="bg-white dark:bg-grafite-900 rounded-xl p-6 w-full max-w-sm border border-gray-200 dark:border-grafite-800 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Abrir Caixa</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Informe o valor de abertura do caixa</p>
            <input
              placeholder="Valor de abertura (R$)"
              type="number"
              step="0.01"
              min="0"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500 mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => setShowOpenModal(false)} disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-grafite-800 hover:bg-gray-200 dark:hover:bg-grafite-700 transition-colors">
                Cancelar
              </button>
              <button onClick={handleOpen} disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white transition-colors">
                {saving ? 'Abrindo...' : 'Abrir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Confirm */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowCloseConfirm(false)}>
          <div className="bg-white dark:bg-grafite-900 rounded-xl p-6 w-full max-w-sm border border-gray-200 dark:border-grafite-800 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Fechar Caixa</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Tem certeza que deseja fechar o caixa? O saldo final será de{' '}
              <span className={`font-semibold ${(status?.closing_balance ?? 0) >= 0 ? 'text-laranja-600 dark:text-laranja-400' : 'text-red-400'}`}>
                R$ {(status?.closing_balance ?? 0).toFixed(2)}
              </span>.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowCloseConfirm(false)} disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-grafite-800 hover:bg-gray-200 dark:hover:bg-grafite-700 transition-colors">
                Cancelar
              </button>
              <button onClick={handleClose} disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white transition-colors">
                {saving ? 'Fechando...' : 'Fechar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

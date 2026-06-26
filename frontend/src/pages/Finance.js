import React, { useState, useEffect } from 'react';
import api from '../api';
import { TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function Finance() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [tab, setTab] = useState('todas');

  useEffect(() => {
    api.get('/finance/transactions').then(({ data }) => setTransactions(data));
    api.get('/finance/summary').then(({ data }) => setSummary(data));
  }, []);

  const filtered = tab === 'todas' ? transactions : transactions.filter(t => t.tipo === tab);

  return (
    <div className="space-y-4 pb-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white">Financeiro</h1>
        <p className="text-gray-400 text-xs md:text-sm">Fluxo de caixa da oficina</p>
      </div>

      {summary && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-grafite-900 border border-green-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpRight size={14} className="text-green-400" />
                <span className="text-[10px] text-gray-400">Entradas</span>
              </div>
              <p className="text-lg md:text-xl font-bold text-green-400 truncate">R$ {summary.total_entradas.toFixed(2)}</p>
            </div>
            <div className="bg-grafite-900 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownRight size={14} className="text-red-400" />
                <span className="text-[10px] text-gray-400">Saídas</span>
              </div>
              <p className="text-lg md:text-xl font-bold text-red-400 truncate">R$ {summary.total_saidas.toFixed(2)}</p>
            </div>
            <div className="bg-grafite-900 border border-laranja-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={14} className="text-laranja-400" />
                <span className="text-[10px] text-gray-400">Saldo</span>
              </div>
              <p className={`text-lg md:text-xl font-bold truncate ${summary.saldo >= 0 ? 'text-laranja-400' : 'text-red-400'}`}>
                R$ {summary.saldo.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-1 bg-grafite-900 rounded-xl p-1 border border-grafite-800">
        {['todas', 'entrada', 'saida'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all ${
              tab === t ? 'bg-laranja-600 text-white' : 'text-gray-400'
            }`}
          >
            {t === 'todas' ? 'Todas' : t === 'entrada' ? 'Entradas' : 'Saídas'}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="bg-grafite-900 border border-grafite-800 rounded-xl p-8 text-center text-gray-500 text-sm">
            Nenhuma transação encontrada
          </div>
        )}
        {filtered.map((t) => (
          <div key={t.id} className="bg-grafite-900 border border-grafite-800 rounded-xl p-4 flex items-center gap-3">
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
              <p className="text-white text-sm font-medium truncate">{t.descricao || 'Transação'}</p>
              <p className="text-xs text-gray-400">{new Date(t.created_at).toLocaleDateString('pt-BR')}</p>
            </div>
            <span className={`text-sm font-bold ${
              t.tipo === 'entrada' ? 'text-green-400' : 'text-red-400'
            }`}>
              {t.tipo === 'entrada' ? '+' : '-'} R$ {t.valor.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

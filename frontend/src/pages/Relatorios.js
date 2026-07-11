import React, { useState, useEffect } from 'react';
import api from '../api';
import { FileBarChart, Download } from 'lucide-react';

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

const TABS = [
  { key: 'os', label: 'Ordens de Serviço' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'clientes', label: 'Clientes' },
  { key: 'pecas', label: 'Peças' },
];

export default function Relatorios() {
  const [tab, setTab] = useState('os');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get(`/reports/${tab}`)
      .then(({ data }) => setData(data))
      .catch((err) => setError(getErrorMessage(err, 'Erro ao carregar relatório')))
      .finally(() => setLoading(false));
  }, [tab]);

  const exportCSV = async () => {
    try {
      const { data: blob } = await api.get(`/reports/export/${tab}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tab}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Erro ao exportar CSV');
    }
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileBarChart size={22} className="text-laranja-600 dark:text-laranja-400" /> Relatórios
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">Indicadores da oficina por área</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 bg-gray-200 dark:bg-grafite-700 hover:bg-gray-300 dark:hover:bg-grafite-600 text-gray-700 dark:text-white px-4 py-2.5 rounded-xl text-sm font-medium">
          <Download size={18} /> <span className="hidden md:inline">Exportar CSV</span>
        </button>
      </div>

      <div className="flex gap-1 bg-white dark:bg-grafite-900 rounded-xl p-1 border border-gray-200 dark:border-grafite-800 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key); setData(null); }} className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${tab === t.key ? 'bg-laranja-600 text-white' : 'text-gray-500 dark:text-gray-400'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="px-4 py-3 rounded-xl text-sm bg-red-500/10 border border-red-500/30 text-red-400">{error}</div>}

      {loading ? (
        <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Carregando...</div>
      ) : !data ? null : (
        <div className="space-y-3">
          {tab === 'os' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Total de OS</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{data.total}</p>
                </div>
                <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Valor Total</p>
                  <p className="text-xl font-bold text-laranja-600 dark:text-laranja-400">R$ {data.valor_total.toFixed(2)}</p>
                </div>
              </div>
              <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Por status</p>
                {Object.entries(data.por_status || {}).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between py-1 text-sm">
                    <span className="text-gray-700 dark:text-gray-300 capitalize">{status.replace(/_/g, ' ')}</span>
                    <span className="font-bold text-gray-900 dark:text-white">{count}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'financeiro' && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white dark:bg-grafite-900 border border-green-500/20 rounded-xl p-4">
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Entradas</p>
                <p className="text-lg font-bold text-green-400">R$ {data.total_entradas.toFixed(2)}</p>
              </div>
              <div className="bg-white dark:bg-grafite-900 border border-red-500/20 rounded-xl p-4">
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Saídas</p>
                <p className="text-lg font-bold text-red-400">R$ {data.total_saidas.toFixed(2)}</p>
              </div>
              <div className="bg-white dark:bg-grafite-900 border border-laranja-500/20 rounded-xl p-4">
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Saldo</p>
                <p className="text-lg font-bold text-laranja-600 dark:text-laranja-400">R$ {data.saldo.toFixed(2)}</p>
              </div>
            </div>
          )}

          {tab === 'clientes' && (
            <div className="space-y-2">
              {(data.items || []).map((c) => (
                <div key={c.cliente_id} className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{c.nome}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{c.total_os} OS</p>
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">R$ {c.total_gasto.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'pecas' && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Total de Peças</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{data.total_pecas}</p>
                </div>
                <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Valor em Estoque</p>
                  <p className="text-lg font-bold text-laranja-600 dark:text-laranja-400">R$ {data.valor_estoque.toFixed(2)}</p>
                </div>
                <div className="bg-white dark:bg-grafite-900 border border-red-500/20 rounded-xl p-4">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Baixo Estoque</p>
                  <p className="text-lg font-bold text-red-400">{data.baixo_estoque}</p>
                </div>
              </div>
              <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Mais usadas</p>
                {(data.mais_usadas || []).map((p, i) => (
                  <div key={i} className="flex items-center justify-between py-1 text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{p.nome}</span>
                    <span className="font-bold text-gray-900 dark:text-white">{p.total}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Users, FileText, Package2, TrendingUp, Repeat, Car, DollarSign, Package, Plus, Calendar, BarChart3, Activity } from 'lucide-react';

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function getFirstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
}

function formatDateBR(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y.slice(2)}`;
}

function formatCurrency(value) {
  return `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

const STATUS_LABELS = {
  aberta: 'Aberta',
  em_andamento: 'Em Andamento',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
  em_espera: 'Em Espera',
};

const STATUS_COLORS = {
  aberta: 'bg-blue-500',
  em_andamento: 'bg-yellow-500',
  finalizada: 'bg-green-500',
  cancelada: 'bg-red-500',
  em_espera: 'bg-orange-500',
};

export default function DashboardHome() {
  const [metrics, setMetrics] = useState(null);
  const [charts, setCharts] = useState(null);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState(getFirstOfMonth);
  const [dataFim, setDataFim] = useState(getToday);
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    api.get('/dashboard/metrics').then(({ data }) => setMetrics(data)).catch(() => {});
    api.get('/parts/low-stock').then(({ data }) => setLowStockCount(data?.count || 0)).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setChartsLoading(true);
      api.get('/dashboard/charts', { params: { data_inicio: dataInicio, data_fim: dataFim } })
        .then(({ data }) => setCharts(data))
        .catch(() => setCharts(null))
        .finally(() => setChartsLoading(false));
    }, 500);
    return () => clearTimeout(timer);
  }, [dataInicio, dataFim]);

  if (!metrics) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-gray-500 dark:text-gray-400 text-sm">
        Carregando...
      </div>
    );
  }

  const cards = [
    { label: 'Total Clientes', value: metrics.total_clientes, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', to: '/clientes' },
    { label: 'OS Abertas', value: metrics.os_abertas, icon: FileText, color: 'text-laranja-400', bg: 'bg-laranja-500/10', to: '/os?tab=abertas' },
    { label: 'OS Finalizadas', value: metrics.os_finalizadas, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10', to: '/os?tab=finalizadas' },
    { label: 'Faturamento do Mês', value: `R$ ${Number(metrics.faturamento_mes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10', to: '/os' },
    { label: 'OS em Espera', value: metrics.os_espera, icon: Package, color: 'text-orange-400', bg: 'bg-orange-500/10', to: '/os' },
    { label: 'Total Peças', value: metrics.total_pecas, icon: Package2, color: 'text-purple-400', bg: 'bg-purple-500/10', to: '/pecas' },
    { label: '🔴 Estoque Mínimo', value: `${lowStockCount} peça${lowStockCount !== 1 ? 's' : ''}`, icon: Activity, color: 'text-red-400', bg: 'bg-red-500/10', to: '/pecas' },
  ];

  const maxFaturamento = charts?.faturamento_diario?.length
    ? Math.max(...charts.faturamento_diario.map((d) => d.total), 1)
    : 1;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">Visão geral da oficina</p>
        </div>
        <Link
          to="/os"
          className="inline-flex items-center justify-center gap-2 bg-laranja-600 hover:bg-laranja-500 text-white text-sm font-medium px-5 py-3 rounded-xl transition-all active:scale-[0.98]"
        >
          <Plus size={18} />
          Abrir OS
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            to={card.to}
            className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-5 md:p-6 hover:border-laranja-600/30 transition-all active:scale-[0.98]"
          >
            <div className={`w-12 h-12 ${card.bg} rounded-xl flex items-center justify-center mb-3`}>
              <card.icon size={24} className={card.color} />
            </div>
            <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{card.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{card.label}</p>
          </Link>
        ))}
      </div>

      <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4 md:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-gray-900 dark:text-white font-semibold text-sm md:text-base flex items-center gap-2">
            <BarChart3 size={18} className="text-laranja-600 dark:text-laranja-400" />
            Gráficos
          </h3>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-gray-500 dark:text-gray-400 shrink-0" />
              <label className="text-xs text-gray-500 dark:text-gray-400">Início</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-laranja-600"
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-gray-500 dark:text-gray-400 shrink-0" />
              <label className="text-xs text-gray-500 dark:text-gray-400">Fim</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-laranja-600"
              />
            </div>
          </div>
        </div>

        {chartsLoading ? (
          <div className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">Carregando gráficos...</div>
        ) : !charts ? (
          <div className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">Erro ao carregar gráficos</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Activity size={16} className="text-green-400" />
                <h4 className="text-gray-900 dark:text-white text-sm font-medium">Faturamento Diário</h4>
              </div>
              {charts.faturamento_diario.length === 0 ? (
                <p className="text-gray-400 dark:text-gray-500 text-xs text-center py-6">Nenhum faturamento no período</p>
              ) : (
                <div className="flex items-end gap-1 h-32 md:h-40">
                  {charts.faturamento_diario.map((item, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 mb-1 truncate w-full text-center">{formatCurrency(item.total)}</span>
                      <div
                        className="w-full bg-gradient-to-t from-laranja-600 to-laranja-400 rounded-t-sm transition-all"
                        style={{ height: `${(item.total / maxFaturamento) * 100}%` }}
                      />
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{formatDateBR(item.dia)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={16} className="text-blue-400" />
                <h4 className="text-gray-900 dark:text-white text-sm font-medium">OS por Status</h4>
              </div>
              {charts.os_por_status.length === 0 ? (
                <p className="text-gray-400 dark:text-gray-500 text-xs text-center py-6">Nenhuma OS no período</p>
              ) : (
                <div className="space-y-3">
                  {charts.os_por_status.map((item, i) => {
                    const maxTotal = Math.max(...charts.os_por_status.map((s) => s.total), 1);
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600 dark:text-gray-300">{STATUS_LABELS[item.status] || item.status}</span>
                          <span className="text-gray-900 dark:text-white font-medium">{item.total}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-grafite-800 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all ${STATUS_COLORS[item.status] || 'bg-gray-500'}`}
                            style={{ width: `${(item.total / maxTotal) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
        <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4 md:p-5">
          <div className="flex items-center gap-2 mb-4">
            <Car size={18} className="text-blue-400" />
            <h3 className="text-gray-900 dark:text-white font-semibold text-sm md:text-base">Marcas Mais Atendidas</h3>
          </div>
          {metrics.marcas_mais_atendidas.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-xs md:text-sm text-center py-6">Nenhum dado ainda</p>
          ) : (
            <div className="space-y-3">
              {metrics.marcas_mais_atendidas.slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item.marca}</span>
                  <span className="text-xs font-medium text-laranja-600 dark:text-laranja-400 bg-laranja-500/10 dark:bg-laranja-500/20 px-2 py-0.5 rounded-full">{item.total} OS</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4 md:p-5">
          <div className="flex items-center gap-2 mb-4">
            <Repeat size={18} className="text-laranja-600 dark:text-laranja-400" />
            <h3 className="text-gray-900 dark:text-white font-semibold text-sm md:text-base">Peças Mais Usadas</h3>
          </div>
          {metrics.pecas_mais_usadas.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-xs md:text-sm text-center py-6">Nenhum dado ainda</p>
          ) : (
            <div className="space-y-3">
              {metrics.pecas_mais_usadas.slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item.nome}</span>
                  <span className="text-xs font-medium text-laranja-600 dark:text-laranja-400 bg-laranja-500/10 dark:bg-laranja-500/20 px-2 py-0.5 rounded-full">{item.total} usos</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

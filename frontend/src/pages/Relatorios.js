import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import {
  TrendingUp, TrendingDown, DollarSign, FileText, Package, Users,
  Download, AlertTriangle, BarChart3
} from 'lucide-react';

const getToday = () => new Date().toISOString().split('T')[0];
const getFirstDayOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const formatDate = (iso) => {
  if (!iso) return '-';
  try { return new Date(iso).toLocaleDateString('pt-BR'); } catch { return iso; }
};

const STOCK_ALERT_COLORS = {
  ok: 'text-green-400 bg-green-500/10',
  baixo: 'text-yellow-400 bg-yellow-500/10',
  critico: 'text-red-400 bg-red-500/10',
};

const statusStyles = {
  aberta: { bg: 'bg-yellow-500/10', dot: 'bg-yellow-400', label: 'Aberta' },
  em_andamento: { bg: 'bg-blue-500/10', dot: 'bg-blue-400', label: 'Em andamento' },
  aguardando_peca: { bg: 'bg-gray-500/10', dot: 'bg-gray-400', label: 'Aguardando Peça' },
  aguardando_pagamento: { bg: 'bg-orange-500/10', dot: 'bg-orange-400', label: 'Aguardando Pagamento' },
  aguardando_aprovacao_orcamento: { bg: 'bg-purple-500/10', dot: 'bg-purple-400', label: 'Aguardando Aprovação' },
  orcamento_recusado: { bg: 'bg-red-500/10', dot: 'bg-red-400', label: 'Orçamento Recusado' },
  finalizada: { bg: 'bg-green-500/10', dot: 'bg-green-400', label: 'Finalizada' },
  cancelada: { bg: 'bg-red-500/10', dot: 'bg-red-400', label: 'Cancelada' },
};

const TABS = [
  { key: 'financeiro', label: 'Financeiro', icon: DollarSign, hasDates: true },
  { key: 'ordens', label: 'Ordens de Serviço', icon: FileText, hasDates: true },
  { key: 'estoque', label: 'Estoque', icon: Package, hasDates: false },
  { key: 'clientes', label: 'Clientes', icon: Users, hasDates: true },
  { key: 'lucratividade', label: 'Lucratividade', icon: TrendingUp, hasDates: true },
  { key: 'evolucao', label: 'Evolução Estoque', icon: Package, hasDates: true },
];

const dataKey = { financeiro: 'financial', ordens: 'orders', estoque: 'stock', clientes: 'clients', lucratividade: 'profitability', evolucao: 'stock_evolution' };

export default function Relatorios() {
  const [tab, setTab] = useState('financeiro');
  const [startDate, setStartDate] = useState(getFirstDayOfMonth);
  const [endDate, setEndDate] = useState(getToday);
  const [data, setData] = useState({ financial: null, orders: null, stock: null, clients: null, profitability: null, stock_evolution: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const currentDK = dataKey[tab];

  const loadFinancial = useCallback(async () => {
    const { data: d } = await api.get('/reports/financial', { params: { start_date: startDate, end_date: endDate } });
    return d;
  }, [startDate, endDate]);

  const loadOrders = useCallback(async () => {
    const params = { start_date: startDate, end_date: endDate };
    if (statusFilter) params.status = statusFilter;
    const { data: d } = await api.get('/reports/orders', { params });
    return d;
  }, [startDate, endDate, statusFilter]);

  const loadStock = useCallback(async () => {
    const { data: d } = await api.get('/reports/stock');
    return d;
  }, []);

  const loadClients = useCallback(async () => {
    const { data: d } = await api.get('/reports/clients', { params: { start_date: startDate, end_date: endDate } });
    return d;
  }, [startDate, endDate]);

  const loadProfitability = useCallback(async () => {
    const { data: d } = await api.get('/reports/profitability', { params: { start_date: startDate, end_date: endDate } });
    return d;
  }, [startDate, endDate]);

  const loadStockEvolution = useCallback(async () => {
    const { data: d } = await api.get('/reports/stock-evolution', { params: { start_date: startDate, end_date: endDate } });
    return d;
  }, [startDate, endDate]);

  const loaders = { financial: loadFinancial, orders: loadOrders, stock: loadStock, clients: loadClients, profitability: loadProfitability, stock_evolution: loadStockEvolution };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await loaders[currentDK]();
      setData(prev => ({ ...prev, [currentDK]: result }));
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  }, [currentDK, loaders]);

  useEffect(() => {
    loadData();
  }, [tab]);

  const handleGenerate = () => loadData();

  const exportCSV = async (type) => {
    try {
      const params = {};
      if (type !== 'stock') {
        params.start_date = startDate;
        params.end_date = endDate;
      }
      const res = await api.get(`/reports/export/${type}`, { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_${type}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Erro ao exportar CSV');
    }
  };

  const exportPDF = async (type) => {
    try {
      const params = {};
      if (type !== 'stock') {
        params.start_date = startDate;
        params.end_date = endDate;
      }
      const res = await api.get(`/reports/export/pdf/${type}`, { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_${type}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Erro ao exportar PDF');
    }
  };

  const fd = data.financial;
  const od = data.orders;
  const sd = data.stock;
  const cd = data.clients;
  const pfd = data.profitability;
  const sed = data.stock_evolution;

  const renderSummaryCards = (items) => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {items.map((item, i) => (
        <div key={i} className={`bg-white dark:bg-grafite-900 border ${item.borderColor || 'border-gray-200 dark:border-grafite-800'} rounded-xl p-4`}>
          <div className="flex items-center gap-2 mb-2">
            {item.icon}
            <span className="text-[10px] text-gray-500 dark:text-gray-400">{item.label}</span>
          </div>
          <p className={`text-lg md:text-xl font-bold truncate ${item.valueColor || 'text-gray-900 dark:text-white'}`}>
            {item.prefix}{item.value}
          </p>
        </div>
      ))}
    </div>
  );

  const renderTable = (headers, rows, emptyMsg) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-grafite-800">
            {headers.map((h, i) => (
              <th key={i} className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 pb-2 pr-3 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="py-8 text-center text-gray-400 dark:text-gray-500 text-xs">{emptyMsg || 'Nenhum registro'}</td>
            </tr>
          ) : rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-100 dark:border-grafite-800/50 last:border-0">
              {row.cells.map((cell, j) => (
                <td key={j} className={`py-2.5 pr-3 whitespace-nowrap ${cell.className || 'text-gray-700 dark:text-gray-300'}`}>{cell.content}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Relatórios</h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">Relatórios gerenciais da oficina</p>
        </div>
      </div>

      <div className="overflow-x-auto -mx-3 px-3">
        <div className="flex gap-1 bg-white dark:bg-grafite-900 rounded-xl p-1 border border-gray-200 dark:border-grafite-800 min-w-max">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                tab === t.key ? 'bg-laranja-600 text-white' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {TABS.find(t => t.key === tab)?.hasDates && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 dark:text-gray-400">Início</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-white dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 dark:text-gray-400">Fim</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-white dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white"
            />
          </div>
          <button
            onClick={handleGenerate}
            className="flex items-center gap-1.5 bg-laranja-600 hover:bg-laranja-700 text-white px-4 py-1.5 rounded-lg text-xs font-medium"
          >
            <BarChart3 size={14} /> Gerar Relatório
          </button>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-xl text-sm bg-red-500/10 border border-red-500/30 text-red-400">{error}</div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Carregando...</div>
      ) : (
        <>
          {/* === FINANCEIRO === */}
          {tab === 'financeiro' && fd && (
            <div className="space-y-4">
              {renderSummaryCards([
                { label: 'Total Receitas', value: `R$ ${(fd.total_receitas ?? 0).toFixed(2)}`, icon: <TrendingUp size={14} className="text-green-400" />, borderColor: 'border-green-500/20', valueColor: 'text-green-400' },
                { label: 'Total Despesas', value: `R$ ${(fd.total_despesas ?? 0).toFixed(2)}`, icon: <TrendingDown size={14} className="text-red-400" />, borderColor: 'border-red-500/20', valueColor: 'text-red-400' },
                { label: 'Saldo', value: `R$ ${(fd.saldo ?? 0).toFixed(2)}`, icon: <DollarSign size={14} className={`${(fd.saldo ?? 0) >= 0 ? 'text-laranja-600 dark:text-laranja-400' : 'text-red-400'}`} />, borderColor: 'border-laranja-500/20', valueColor: (fd.saldo ?? 0) >= 0 ? 'text-laranja-600 dark:text-laranja-400' : 'text-red-400' },
              ])}

              <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Por Categoria</h3>
                {renderTable(
                  ['Descrição', 'Valor', 'Quantidade'],
                  (fd.categorias || []).map(c => ({
                    cells: [
                      { content: c.descricao || '-' },
                      { content: `R$ ${(c.valor ?? 0).toFixed(2)}`, className: 'text-gray-700 dark:text-gray-300 font-medium' },
                      { content: c.quantidade ?? 0, className: 'text-gray-700 dark:text-gray-300' },
                    ]
                  })),
                  'Nenhuma categoria encontrada'
                )}
              </div>

              <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Diário</h3>
                {renderTable(
                  ['Data', 'Receitas', 'Despesas', 'Saldo'],
                  (fd.diario || []).map(d => ({
                    cells: [
                      { content: formatDate(d.data) },
                      { content: `R$ ${(d.receita ?? 0).toFixed(2)}`, className: 'text-green-400' },
                      { content: `R$ ${(d.despesa ?? 0).toFixed(2)}`, className: 'text-red-400' },
                      { content: `R$ ${(d.saldo ?? 0).toFixed(2)}`, className: (d.saldo ?? 0) >= 0 ? 'text-gray-700 dark:text-gray-300 font-medium' : 'text-red-400 font-medium' },
                    ]
                  })),
                  'Nenhum lançamento diário'
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={() => exportCSV('financial')} className="flex items-center gap-2 bg-gray-200 dark:bg-grafite-700 hover:bg-gray-300 dark:hover:bg-grafite-600 text-gray-700 dark:text-white px-4 py-2.5 rounded-xl text-sm font-medium">
                  <Download size={18} /> Exportar CSV
                </button>
                <button onClick={() => exportPDF('financial')} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
                  <FileText size={18} /> Exportar PDF
                </button>
              </div>
            </div>
          )}

          {/* === ORDENS === */}
          {tab === 'ordens' && od && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 dark:text-gray-400">Status</label>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="bg-white dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white"
                  >
                    <option value="">Todos</option>
                    {Object.entries(statusStyles).map(([key, st]) => (
                      <option key={key} value={key}>{st.label}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleGenerate}
                  className="flex items-center gap-1.5 bg-laranja-600 hover:bg-laranja-700 text-white px-4 py-1.5 rounded-lg text-xs font-medium"
                >
                  <BarChart3 size={14} /> Filtrar
                </button>
              </div>
              {renderSummaryCards([
                { label: 'Total de OS', value: od.total_os ?? 0, icon: <FileText size={14} className="text-blue-400" />, borderColor: 'border-blue-500/20', valueColor: 'text-blue-400' },
                { label: 'Receita Total', value: `R$ ${(od.receita_total ?? 0).toFixed(2)}`, icon: <TrendingUp size={14} className="text-green-400" />, borderColor: 'border-green-500/20', valueColor: 'text-green-400' },
                { label: 'Ticket Médio', value: `R$ ${(od.ticket_medio ?? 0).toFixed(2)}`, icon: <DollarSign size={14} className="text-laranja-600 dark:text-laranja-400" />, borderColor: 'border-laranja-500/20', valueColor: 'text-laranja-600 dark:text-laranja-400' },
              ])}

              <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Por Status</h3>
                {(od.por_status || []).length === 0 ? (
                  <p className="text-gray-400 dark:text-gray-500 text-xs text-center py-4">Nenhum status encontrado</p>
                ) : (
                  <div className="space-y-3">
                    {od.por_status.map((s, i) => {
                      const st = statusStyles[s.status] || { bg: 'bg-gray-500/10', label: s.status };
                      const max = Math.max(...(od.por_status || []).map(x => x.total));
                      const pct = max > 0 ? (s.total / max) * 100 : 0;
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] ${st.bg}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                              {st.label}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{s.total}</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-grafite-800 rounded-full h-2">
                            <div className="bg-laranja-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Ordens</h3>
                {renderTable(
                  ['OS#', 'Cliente', 'Veículo', 'Status', 'Data', 'Valor'],
                  (od.ordens || []).map(o => {
                    const st = statusStyles[o.status] || { bg: 'bg-gray-500/10', dot: 'bg-gray-400', label: o.status };
                    return {
                      cells: [
                        { content: `#${o.id}`, className: 'text-xs font-mono text-gray-500 dark:text-gray-400' },
                        { content: o.cliente || '-', className: 'text-gray-700 dark:text-gray-300 font-medium' },
                        { content: o.veiculo || '-' },
                        { content: <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] ${st.bg}`}><span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}</span> },
                        { content: formatDate(o.data) },
                        { content: `R$ ${(o.valor ?? 0).toFixed(2)}`, className: 'text-gray-700 dark:text-gray-300 font-medium' },
                      ]
                    };
                  }),
                  'Nenhuma OS encontrada'
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={() => exportCSV('orders')} className="flex items-center gap-2 bg-gray-200 dark:bg-grafite-700 hover:bg-gray-300 dark:hover:bg-grafite-600 text-gray-700 dark:text-white px-4 py-2.5 rounded-xl text-sm font-medium">
                  <Download size={18} /> Exportar CSV
                </button>
                <button onClick={() => exportPDF('orders')} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
                  <FileText size={18} /> Exportar PDF
                </button>
              </div>
            </div>
          )}

          {/* === ESTOQUE === */}
          {tab === 'estoque' && sd && (
            <div className="space-y-4">
              {renderSummaryCards([
                { label: 'Total de Peças', value: sd.total_pecas ?? 0, icon: <Package size={14} className="text-blue-400" />, borderColor: 'border-blue-500/20', valueColor: 'text-blue-400' },
                { label: 'Valor Total em Estoque', value: `R$ ${(sd.valor_total ?? 0).toFixed(2)}`, icon: <DollarSign size={14} className="text-green-400" />, borderColor: 'border-green-500/20', valueColor: 'text-green-400' },
                { label: 'Peças com Estoque Zero', value: sd.estoque_zero ?? 0, icon: <AlertTriangle size={14} className="text-red-400" />, borderColor: 'border-red-500/20', valueColor: 'text-red-400' },
              ])}

              <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Alertas de Estoque Baixo</h3>
                {renderTable(
                  ['Peça', 'Qtd Atual', 'Mínimo', 'Diferença', 'Status'],
                  (sd.alertas || []).map(a => {
                    const colorClass = STOCK_ALERT_COLORS[a.status] || 'text-gray-400 bg-gray-500/10';
                    return {
                      cells: [
                        { content: a.peca || '-', className: 'text-gray-700 dark:text-gray-300 font-medium' },
                        { content: a.qtd_atual ?? 0 },
                        { content: a.minimo ?? 0 },
                        { content: a.diferenca ?? 0 },
                        { content: <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${colorClass}`}>{a.status === 'ok' ? 'OK' : a.status === 'baixo' ? 'Baixo' : 'Crítico'}</span> },
                      ]
                    };
                  }),
                  'Nenhum alerta de estoque'
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={() => exportCSV('stock')} className="flex items-center gap-2 bg-gray-200 dark:bg-grafite-700 hover:bg-gray-300 dark:hover:bg-grafite-600 text-gray-700 dark:text-white px-4 py-2.5 rounded-xl text-sm font-medium">
                  <Download size={18} /> Exportar CSV
                </button>
                <button onClick={() => exportPDF('stock')} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
                  <FileText size={18} /> Exportar PDF
                </button>
              </div>
            </div>
          )}

          {/* === CLIENTES === */}
          {tab === 'clientes' && cd && (
            <div className="space-y-4">
              {renderSummaryCards([
                { label: 'Total de Clientes', value: cd.total_clientes ?? 0, icon: <Users size={14} className="text-blue-400" />, borderColor: 'border-blue-500/20', valueColor: 'text-blue-400' },
                { label: 'Novos no Período', value: cd.novos_periodo ?? 0, icon: <Users size={14} className="text-green-400" />, borderColor: 'border-green-500/20', valueColor: 'text-green-400' },
              ])}

              <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Top 10 Clientes</h3>
                {renderTable(
                  ['#', 'Nome', 'Telefone', 'Total OS', 'Total Gasto', 'Última Visita'],
                  (cd.top10 || []).map((c, i) => ({
                    cells: [
                      { content: <span className="w-6 h-6 bg-laranja-500/10 rounded-full flex items-center justify-center text-xs font-bold text-laranja-600 dark:text-laranja-400">{i + 1}</span> },
                      { content: c.nome || '-', className: 'text-gray-700 dark:text-gray-300 font-medium' },
                      { content: c.telefone || '-' },
                      { content: c.total_os ?? 0, className: 'text-gray-700 dark:text-gray-300' },
                      { content: `R$ ${(c.total_gasto ?? 0).toFixed(2)}`, className: 'text-gray-700 dark:text-gray-300 font-medium' },
                      { content: formatDate(c.ultima_visita) },
                    ]
                  })),
                  'Nenhum cliente encontrado'
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={() => exportCSV('clients')} className="flex items-center gap-2 bg-gray-200 dark:bg-grafite-700 hover:bg-gray-300 dark:hover:bg-grafite-600 text-gray-700 dark:text-white px-4 py-2.5 rounded-xl text-sm font-medium">
                  <Download size={18} /> Exportar CSV
                </button>
                <button onClick={() => exportPDF('clients')} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
                  <FileText size={18} /> Exportar PDF
                </button>
              </div>
            </div>
          )}

          {/* === LUCRATIVIDADE === */}
          {tab === 'lucratividade' && pfd && (
            <div className="space-y-4">
              {renderSummaryCards([
                { label: 'Receita Total', value: `R$ ${(pfd.summary?.total_revenue ?? 0).toFixed(2)}`, icon: <TrendingUp size={14} className="text-green-400" />, borderColor: 'border-green-500/20', valueColor: 'text-green-400' },
                { label: 'Custo Total', value: `R$ ${(pfd.summary?.total_cost ?? 0).toFixed(2)}`, icon: <TrendingDown size={14} className="text-red-400" />, borderColor: 'border-red-500/20', valueColor: 'text-red-400' },
                { label: 'Lucro Total', value: `R$ ${(pfd.summary?.total_profit ?? 0).toFixed(2)}`, icon: <DollarSign size={14} className="text-laranja-600 dark:text-laranja-400" />, borderColor: 'border-laranja-500/20', valueColor: 'text-laranja-600 dark:text-laranja-400' },
                { label: 'Margem Média', value: `${(pfd.summary?.average_margin ?? 0).toFixed(1)}%`, icon: <BarChart3 size={14} className="text-blue-400" />, borderColor: 'border-blue-500/20', valueColor: 'text-blue-400' },
              ])}

              <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Por Peça</h3>
                {renderTable(
                  ['Peça', 'Qtd Vendida', 'Receita', 'Custo', 'Lucro', 'Margem'],
                  (pfd.parts || []).map(p => ({
                    cells: [
                      { content: p.nome || '-', className: 'text-gray-700 dark:text-gray-300 font-medium' },
                      { content: p.qty_sold ?? 0 },
                      { content: `R$ ${(p.total_revenue ?? 0).toFixed(2)}`, className: 'text-green-400' },
                      { content: `R$ ${(p.total_cost ?? 0).toFixed(2)}`, className: 'text-red-400' },
                      { content: `R$ ${(p.profit ?? 0).toFixed(2)}`, className: (p.profit ?? 0) >= 0 ? 'text-gray-700 dark:text-gray-300 font-medium' : 'text-red-400 font-medium' },
                      { content: `${(p.margin ?? 0).toFixed(1)}%` },
                    ]
                  })),
                  'Nenhuma peça encontrada'
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={() => exportCSV('profitability')} className="flex items-center gap-2 bg-gray-200 dark:bg-grafite-700 hover:bg-gray-300 dark:hover:bg-grafite-600 text-gray-700 dark:text-white px-4 py-2.5 rounded-xl text-sm font-medium">
                  <Download size={18} /> Exportar CSV
                </button>
                <button onClick={() => exportPDF('profitability')} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
                  <FileText size={18} /> Exportar PDF
                </button>
              </div>
            </div>
          )}

          {/* === EVOLUÇÃO ESTOQUE === */}
          {tab === 'evolucao' && sed && (
            <div className="space-y-4">
              {renderSummaryCards([
                { label: 'Total de Movimentações', value: sed.summary?.total_movements ?? 0, icon: <Package size={14} className="text-blue-400" />, borderColor: 'border-blue-500/20', valueColor: 'text-blue-400' },
                { label: 'Peças Afetadas', value: sed.summary?.parts_affected ?? 0, icon: <BarChart3 size={14} className="text-green-400" />, borderColor: 'border-green-500/20', valueColor: 'text-green-400' },
              ])}

              <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Movimentações</h3>
                {renderTable(
                  ['Data', 'Peça', 'Qtd', 'Tipo', 'Referência'],
                  (sed.movements || []).map(m => ({
                    cells: [
                      { content: formatDate(m.date) },
                      { content: m.part_nome || '-', className: 'text-gray-700 dark:text-gray-300 font-medium' },
                      { content: m.quantidade ?? 0 },
                      { content: <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${m.tipo === 'entrada' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{m.tipo === 'entrada' ? 'Entrada' : 'Saída'}</span> },
                      { content: m.referencia || '-' },
                    ]
                  })),
                  'Nenhuma movimentação encontrada'
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={() => exportCSV('stock_evolution')} className="flex items-center gap-2 bg-gray-200 dark:bg-grafite-700 hover:bg-gray-300 dark:hover:bg-grafite-600 text-gray-700 dark:text-white px-4 py-2.5 rounded-xl text-sm font-medium">
                  <Download size={18} /> Exportar CSV
                </button>
                <button onClick={() => exportPDF('stock_evolution')} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
                  <FileText size={18} /> Exportar PDF
                </button>
              </div>
            </div>
          )}

          {/* Tab loaded with no data yet */}
          {tab === 'financeiro' && !fd && !loading && (
            <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Nenhum dado financeiro para o período</div>
          )}
          {tab === 'ordens' && !od && !loading && (
            <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Nenhuma OS encontrada no período</div>
          )}
          {tab === 'estoque' && !sd && !loading && (
            <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Nenhum item em estoque</div>
          )}
          {tab === 'clientes' && !cd && !loading && (
            <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Nenhum cliente encontrado</div>
          )}
          {tab === 'lucratividade' && !pfd && !loading && (
            <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Nenhum dado de lucratividade para o período</div>
          )}
          {tab === 'evolucao' && !sed && !loading && (
            <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Nenhuma movimentação de estoque encontrada</div>
          )}
        </>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Check, Package, Wrench, MessageSquare, ChevronRight, ChevronDown, AlertTriangle, RefreshCw } from 'lucide-react';

const STATUS_LABELS = {
  aberta: 'Aberta',
  em_andamento: 'Em andamento',
  aguardando_peca: 'Aguardando Peça',
  aguardando_pagamento: 'Aguardando Pagamento',
  aguardando_aprovacao_orcamento: 'Aguardando Aprovação',
  orcamento_recusado: 'Orç. Recusado',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
};

const STATUS_COLORS = {
  aberta: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  em_andamento: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  aguardando_peca: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  aguardando_pagamento: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  aguardando_aprovacao_orcamento: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  orcamento_recusado: 'bg-red-500/20 text-red-400 border-red-500/30',
  finalizada: 'bg-green-500/20 text-green-400 border-green-500/30',
  cancelada: 'bg-red-700/20 text-red-500 border-red-700/30',
};

const STATUS_DOT_COLORS = {
  aberta: 'bg-yellow-400',
  em_andamento: 'bg-blue-400',
  aguardando_peca: 'bg-gray-400',
  aguardando_pagamento: 'bg-orange-400',
  aguardando_aprovacao_orcamento: 'bg-purple-400',
  orcamento_recusado: 'bg-red-400',
  finalizada: 'bg-green-400',
  cancelada: 'bg-red-500',
};

function getCheckedFromStorage() {
  try {
    const raw = localStorage.getItem('mecanico_checked');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    Object.keys(parsed).forEach(k => {
      parsed[k].parts = new Set(parsed[k].parts || []);
      parsed[k].services = new Set(parsed[k].services || []);
    });
    return parsed;
  } catch {
    return {};
  }
}

function saveCheckedToStorage(checked) {
  const serializable = {};
  Object.keys(checked).forEach(k => {
    serializable[k] = {
      parts: Array.from(checked[k].parts),
      services: Array.from(checked[k].services),
    };
  });
  localStorage.setItem('mecanico_checked', JSON.stringify(serializable));
}

function relativeTime(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'há poucos segundos';
  const min = Math.floor(diff / 60);
  if (min < 60) return `há ${min} minuto${min > 1 ? 's' : ''}`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} hora${h > 1 ? 's' : ''}`;
  const d = Math.floor(h / 24);
  return `há ${d} dia${d > 1 ? 's' : ''}`;
}

export default function MecanicoPaineis() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [spinning, setSpinning] = useState(false);

  // FE-001: checkbox state
  const [checked, setChecked] = useState(() => getCheckedFromStorage());

  // FE-002: timeline state
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    saveCheckedToStorage(checked);
  }, [checked]);

  const load = async () => {
    setSpinning(true);
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/mecanico/orders');
      setOrders(data.orders || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao carregar OS');
    } finally {
      setLoading(false);
      setSpinning(false);
    }
  };

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [nota, setNota] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const toggleExpand = (orderId) => {
    setExpandedId(prev => (prev === orderId ? null : orderId));
    if (selectedOrder?.id !== orderId) {
      const order = orders.find(o => o.id === orderId);
      setSelectedOrder(order);
      setNota(order?.nota || '');
      // FE-002: fetch history
      setHistory([]);
      setHistoryOpen(false);
      fetchHistory(orderId);
    }
  };

  const fetchHistory = async (orderId) => {
    setHistoryLoading(true);
    try {
      const { data } = await api.get(`/mecanico/orders/${orderId}/status-history`);
      setHistory(data.history || []);
    } catch {
      // silently fail for timeline
    } finally {
      setHistoryLoading(false);
    }
  };

  const saveNote = async (orderId) => {
    setSavingNote(true);
    try {
      await api.post(`/mecanico/orders/${orderId}/notes`, { texto: nota });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, nota } : o));
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao salvar nota');
    } finally {
      setSavingNote(false);
    }
  };

  // FE-001: toggle checkbox
  const toggleChecked = (orderId, type, itemId) => {
    setChecked(prev => {
      const orderState = prev[orderId] || { parts: new Set(), services: new Set() };
      const newSet = new Set(orderState[type]);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return { ...prev, [orderId]: { ...orderState, [type]: newSet } };
    });
  };

  const isChecked = (orderId, type, itemId) => {
    return checked[orderId]?.[type]?.has(itemId) || false;
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Painel do Mecânico</h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">OS em andamento e aguardando aprovação</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 bg-laranja-600 hover:bg-laranja-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium active:scale-95 transition-all">
          <RefreshCw size={18} className={spinning ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl text-sm bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Carregando OS...</div>
      ) : orders.length === 0 ? (
        <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-8 text-center">
          <Check size={48} className="mx-auto text-green-400 mb-3" />
          <h3 className="text-gray-900 dark:text-white font-semibold text-lg">Tudo certo!</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Nenhuma OS pendente no momento.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl overflow-hidden transition-all duration-200">
              <button onClick={() => toggleExpand(o.id)} className="w-full p-4 sm:p-5 text-left active:bg-gray-100 dark:active:bg-grafite-800/50 transition-colors touch-manipulation">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-mono text-gray-500 dark:text-gray-400">#{o.id}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[o.status] || ''}`}>
                        {STATUS_LABELS[o.status] || o.status}
                      </span>
                      {o.prioridade > 0 && (
                        <span className="text-xs font-bold text-laranja-600 dark:text-laranja-400 bg-laranja-500/10 px-2 py-0.5 rounded-full">Prioridade {o.prioridade}</span>
                      )}
                    </div>
                    <p className="text-gray-900 dark:text-white font-medium mt-1 truncate">{o.cliente?.nome || 'Cliente não encontrado'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {o.vehicle ? `${o.vehicle.marca} ${o.vehicle.modelo}` : '-'} {o.vehicle?.placa && <span className="uppercase font-mono">{o.vehicle.placa}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold text-laranja-600 dark:text-laranja-400">R$ {(o.valor_total ?? 0).toFixed(2)}</span>
                    <ChevronRight size={20} className={`text-gray-400 dark:text-gray-600 transition-transform duration-200 ${expandedId === o.id ? 'rotate-90' : ''}`} />
                  </div>
                </div>
              </button>

              {expandedId === o.id && (
                <div className="px-4 sm:px-5 pb-4 border-t border-gray-200 dark:border-grafite-800">
                  {/* Lista de Peças */}
                  {o.parts_used.length > 0 && (
                    <div className="mt-3">
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1 mb-2">
                        <Package size={14} className="text-purple-400" /> Peças
                      </h3>
                      <div className="space-y-2">
                        {o.parts_used.map((p) => {
                          const checked_ = isChecked(o.id, 'parts', p.id);
                          return (
                            <div key={p.id} className={`flex items-center justify-between rounded-lg p-3 transition-all duration-200 ${checked_ ? 'bg-green-500/5 border border-green-500/20' : 'bg-gray-50 dark:bg-grafite-800/50 border border-transparent'}`}>
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <button
                                  onClick={() => toggleChecked(o.id, 'parts', p.id)}
                                  className={`w-6 h-6 min-w-[24px] min-h-[24px] rounded-md border-2 flex items-center justify-center transition-all touch-manipulation active:scale-95 ${checked_ ? 'bg-laranja-600 border-laranja-600' : 'border-gray-300 dark:border-grafite-600'}`}
                                >
                                  {checked_ && <Check size={14} className="text-white" />}
                                </button>
                                <div className="min-w-0">
                                  <p className={`text-sm transition-all duration-200 ${checked_ ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>{p.part_nome || `Peça #${p.part_id}`}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{p.quantidade}x R$ {(p.preco_unitario ?? 0).toFixed(2)}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                {checked_ && <span className="text-[10px] font-medium text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded-full">Concluído</span>}
                                <span className="text-sm font-medium text-laranja-600 dark:text-laranja-400">R$ {((p.quantidade ?? 0) * (p.preco_unitario ?? 0)).toFixed(2)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Lista de Serviços */}
                  {o.services_used.length > 0 && (
                    <div className="mt-3">
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1 mb-2">
                        <Wrench size={14} className="text-blue-400" /> Serviços
                      </h3>
                      <div className="space-y-2">
                        {o.services_used.map((s) => {
                          const checked_ = isChecked(o.id, 'services', s.id);
                          return (
                            <div key={s.id} className={`flex items-center justify-between rounded-lg p-3 transition-all duration-200 ${checked_ ? 'bg-green-500/5 border border-green-500/20' : 'bg-gray-50 dark:bg-grafite-800/50 border border-transparent'}`}>
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <button
                                  onClick={() => toggleChecked(o.id, 'services', s.id)}
                                  className={`w-6 h-6 min-w-[24px] min-h-[24px] rounded-md border-2 flex items-center justify-center transition-all touch-manipulation active:scale-95 ${checked_ ? 'bg-laranja-600 border-laranja-600' : 'border-gray-300 dark:border-grafite-600'}`}
                                >
                                  {checked_ && <Check size={14} className="text-white" />}
                                </button>
                                <p className={`text-sm min-w-0 transition-all duration-200 ${checked_ ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>{s.service_nome || `Serviço #${s.service_id}`}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                {checked_ && <span className="text-[10px] font-medium text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded-full">Concluído</span>}
                                <span className="text-sm font-medium text-laranja-600 dark:text-laranja-400">R$ {(s.valor_cobrado ?? 0).toFixed(2)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Anotação */}
                  <div className="mt-3">
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block flex items-center gap-1">
                      <MessageSquare size={12} /> Nota
                    </label>
                    <textarea
                      value={nota}
                      onChange={(e) => setNota(e.target.value)}
                      placeholder="Adicionar anotação..."
                      className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500 resize-none min-h-[100px]"
                      rows={4}
                    />
                    <button
                      onClick={() => saveNote(o.id)}
                      disabled={savingNote}
                      className="mt-2 w-full bg-laranja-600 hover:bg-laranja-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium active:scale-95 transition-all"
                    >
                      {savingNote ? 'Salvando...' : 'Salvar Nota'}
                    </button>
                  </div>

                  {/* FE-002: Histórico de Status */}
                  <div className="mt-3">
                    <button
                      onClick={() => setHistoryOpen(prev => !prev)}
                      className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 w-full py-2 touch-manipulation active:scale-95 transition-all"
                    >
                      <ChevronDown size={16} className={`transition-transform duration-200 ${historyOpen ? 'rotate-180' : ''}`} />
                      Histórico de Status
                    </button>
                    {historyOpen && (
                      <div className="mt-1 pl-2">
                        {historyLoading ? (
                          <p className="text-xs text-gray-400 py-2">Carregando histórico...</p>
                        ) : history.length === 0 ? (
                          <p className="text-xs text-gray-400 py-2">Nenhum registro encontrado.</p>
                        ) : (
                          <div className="relative ml-2 border-l-2 border-gray-200 dark:border-grafite-700 space-y-0">
                            {history.map((h, i) => (
                              <div key={h.id} className="relative pl-4 pb-4 last:pb-0">
                                <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white dark:border-grafite-900 ${STATUS_DOT_COLORS[h.status] || 'bg-gray-400'}`} />
                                <div>
                                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full border ${STATUS_COLORS[h.status] || ''}`}>
                                    {STATUS_LABELS[h.status] || h.status}
                                  </span>
                                  {h.user_name && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{h.user_name}</span>
                                  )}
                                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{relativeTime(h.created_at)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Ações rápidas */}
                  <div className="mt-3 flex gap-2">
                    <Link to={`/os/${o.id}`} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg text-sm font-medium text-center transition-all active:scale-95">
                      Ver OS Completa
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

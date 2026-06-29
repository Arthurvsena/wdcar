import React, { useState } from 'react';
import api from '../api';
import { Search, X, Shield, ShieldOff, Clock, Package2, Wrench, History, ChevronDown } from 'lucide-react';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('pt-BR');
};

const statusColors = {
  aberta: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  em_andamento: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  aguardando_peca: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  aguardando_pagamento: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  aguardando_aprovacao_orcamento: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  orcamento_recusado: 'bg-red-500/20 text-red-400 border-red-500/30',
  finalizada: 'bg-green-500/20 text-green-400 border-green-500/30',
  cancelada: 'bg-red-700/20 text-red-500 border-red-700/30',
};

const statusLabels = {
  aberta: 'Aberta',
  em_andamento: 'Em andamento',
  aguardando_peca: 'Aguardando Peça',
  aguardando_pagamento: 'Aguardando Pagamento',
  aguardando_aprovacao_orcamento: 'Aguardando Aprovação',
  orcamento_recusado: 'Orçamento Recusado',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
};

const getDaysColor = (days) => {
  if (days < 7) return 'text-red-400';
  if (days < 15) return 'text-yellow-400';
  return 'text-green-400';
};

export default function Garantia() {
  const [plate, setPlate] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWarrantyModal, setShowWarrantyModal] = useState(null);
  const [warrantyMeses, setWarrantyMeses] = useState(12);
  const [warrantyDate, setWarrantyDate] = useState('');
  const [expiring, setExpiring] = useState([]);
  const [loadingExpiring, setLoadingExpiring] = useState(false);
  const [showExpiring, setShowExpiring] = useState(false);

  const searchByPlate = async () => {
    if (!plate.trim()) return;
    setLoading(true);
    setError('');
    setSelectedVehicle(null);
    setHistory(null);
    try {
      const { data } = await api.get(`/garantia/vehicles/search?placa=${encodeURIComponent(plate)}`);
      setVehicles(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao buscar placa');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (vehicleId) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/garantia/vehicles/${vehicleId}/history`);
      setHistory(data);
      setSelectedVehicle(vehicleId);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  };

  const addWarranty = async (orderId) => {
    try {
      const payload = warrantyMeses ? { garantia_meses: warrantyMeses } : { garantia_fim: warrantyDate };
      await api.post(`/garantia/orders/${orderId}/warranty`, payload);
      setShowWarrantyModal(null);
      setWarrantyMeses(12);
      setWarrantyDate('');
      if (selectedVehicle) loadHistory(selectedVehicle);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao adicionar garantia');
    }
  };

  const removeWarranty = async (orderId) => {
    if (!window.confirm('Remover garantia desta OS?')) return;
    try {
      await api.delete(`/garantia/orders/${orderId}/warranty`);
      if (selectedVehicle) loadHistory(selectedVehicle);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao remover garantia');
    }
  };

  const toggleExpiring = async () => {
    if (showExpiring) {
      setShowExpiring(false);
      return;
    }
    setLoadingExpiring(true);
    try {
      const { data } = await api.get('/garantia/expiring?days=30');
      setExpiring(Array.isArray(data) ? data : []);
      setShowExpiring(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao carregar garantias a expirar');
    } finally {
      setLoadingExpiring(false);
    }
  };

  const renderWarrantySection = (order) => {
    const hasWarranty = order.garantia_fim || order.garantia_meses;
    if (hasWarranty) {
      const fim = new Date(order.garantia_fim);
      const hoje = new Date();
      const total = (order.garantia_meses || 12) * 30;
      const restante = Math.max(0, Math.ceil((fim - hoje) / (1000 * 60 * 60 * 24)));
      const usado = total - restante;
      const progresso = total > 0 ? Math.min(100, (usado / total) * 100) : 0;

      return (
        <div className="bg-gray-50 dark:bg-grafite-800/50 border border-gray-200 dark:border-grafite-700 rounded-lg p-3 mt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-green-400" />
              <span className="text-sm text-gray-900 dark:text-white font-medium">Garantia até {formatDate(order.garantia_fim)}</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">{order.garantia_meses} meses</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-grafite-700 rounded-full h-2 mb-2">
            <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(100, 100 - progresso)}%` }} />
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${getDaysColor(restante)}`}>{restante} dias restantes</span>
            <button onClick={() => removeWarranty(order.id)} className="text-xs text-red-400 hover:text-red-300 font-medium">Remover Garantia</button>
          </div>
        </div>
      );
    }
    return (
      <div className="mt-3">
        <button
          onClick={() => { setShowWarrantyModal(order.id); setWarrantyMeses(12); setWarrantyDate(''); }}
          className="flex items-center gap-2 bg-laranja-600 hover:bg-laranja-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <ShieldOff size={14} /> Adicionar Garantia
        </button>
      </div>
    );
  };

  const orders = history?.orders || [];

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Garantia</h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">Gerenciamento de garantias</p>
        </div>
        <button
          onClick={toggleExpiring}
          className={`flex items-center gap-2 px-4 py-2.5 md:py-2 rounded-xl md:rounded-lg text-sm font-medium active:scale-95 transition-all shadow-lg ${
            showExpiring
              ? 'bg-gray-200 dark:bg-grafite-700 text-gray-700 dark:text-gray-300 shadow-none'
              : 'bg-laranja-600 hover:bg-laranja-700 text-white shadow-laranja-600/20'
          }`}
        >
          <Clock size={18} />
          <span className="hidden md:inline">{showExpiring ? 'Fechar' : 'Garantias a Expirar'}</span>
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl text-sm bg-red-500/10 border border-red-500/30 text-red-400">{error}</div>
      )}

      <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4">
        <h2 className="text-gray-900 dark:text-white font-semibold text-sm mb-3">Buscar por Placa</h2>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Digite a placa..."
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && searchByPlate()}
              className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg pl-9 pr-3 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500 uppercase"
            />
          </div>
          <button onClick={searchByPlate} disabled={loading} className="bg-laranja-600 hover:bg-laranja-700 text-white px-5 py-3 rounded-lg text-sm font-medium disabled:opacity-40">
            {loading ? '...' : 'Buscar'}
          </button>
        </div>

        {vehicles.length > 0 && (
          <div className="mt-3 space-y-2">
            {vehicles.map((v) => (
              <button
                key={v.id}
                onClick={() => loadHistory(v.id)}
                className={`w-full text-left bg-gray-50 dark:bg-grafite-800/50 border border-gray-200 dark:border-grafite-700 rounded-lg p-3 transition-colors hover:bg-gray-100 dark:hover:bg-grafite-800 ${
                  selectedVehicle === v.id ? 'border-laranja-500' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-900 dark:text-white text-sm font-medium">{v.marca} {v.modelo}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      <span className="uppercase font-mono">{v.placa}</span> • {v.ano} • {v.cor}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-900 dark:text-white">{v.cliente?.nome || v.cliente_nome}</p>
                    <ChevronDown size={14} className="text-gray-400 ml-auto mt-1" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedVehicle && loading && (
        <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Carregando...</div>
      )}

      {selectedVehicle && !loading && orders.length === 0 && (
        <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Nenhuma OS encontrada para este veículo</div>
      )}

      {selectedVehicle && !loading && orders.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-gray-900 dark:text-white font-semibold text-sm">Histórico de OS</h2>
          {orders.map((order) => (
            <div key={order.id} className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-gray-500 dark:text-gray-400">OS #{order.id}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColors[order.status] || ''}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-laranja-600 dark:text-laranja-400">R$ {(order.valor_total ?? 0).toFixed(2)}</span>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{formatDate(order.data_pedido || order.data)}</p>

                {order.parts_used?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1 mb-1.5"><Package2 size={12} /> Peças</p>
                    <div className="bg-gray-50 dark:bg-grafite-800/30 rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-grafite-700">
                            <th className="text-left px-3 py-1.5 font-medium">Peça</th>
                            <th className="text-center px-2 py-1.5 font-medium">Qtd</th>
                            <th className="text-right px-2 py-1.5 font-medium">Preço Unit.</th>
                            <th className="text-right px-3 py-1.5 font-medium">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-grafite-700/50">
                          {order.parts_used.map((p) => (
                            <tr key={p.id}>
                              <td className="px-3 py-1.5 text-gray-900 dark:text-white">{p.part_nome || p.part?.nome}</td>
                              <td className="px-2 py-1.5 text-center text-gray-500 dark:text-gray-400">{p.quantidade}</td>
                              <td className="px-2 py-1.5 text-right text-gray-500 dark:text-gray-400">R$ {(p.preco_unitario ?? 0).toFixed(2)}</td>
                              <td className="px-3 py-1.5 text-right text-gray-900 dark:text-white font-medium">R$ {((p.quantidade ?? 0) * (p.preco_unitario ?? 0)).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {order.services_used?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1 mb-1.5"><Wrench size={12} /> Serviços</p>
                    <div className="bg-gray-50 dark:bg-grafite-800/30 rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-grafite-700">
                            <th className="text-left px-3 py-1.5 font-medium">Serviço</th>
                            <th className="text-right px-3 py-1.5 font-medium">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-grafite-700/50">
                          {order.services_used.map((s) => (
                            <tr key={s.id}>
                              <td className="px-3 py-1.5 text-gray-900 dark:text-white">{s.service_nome || s.service?.nome}</td>
                              <td className="px-3 py-1.5 text-right text-gray-900 dark:text-white font-medium">R$ {(s.valor_cobrado ?? 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {renderWarrantySection(order)}

                {order.status_history?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-grafite-800">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1"><History size={12} /> Histórico de Status</p>
                    <div className="space-y-1">
                      {order.status_history.map((h, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 flex-shrink-0" />
                          <span className="text-gray-500 dark:text-gray-400">{formatDate(h.data || h.created_at)}</span>
                          <span className="capitalize text-gray-900 dark:text-white">{statusLabels[h.status] || h.status?.replace(/_/g, ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showExpiring && (
        <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4">
          <h2 className="text-gray-900 dark:text-white font-semibold text-sm mb-3">Garantias a Expirar (30 dias)</h2>
          {loadingExpiring ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">Carregando...</p>
          ) : expiring.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">Nenhuma garantia próxima do vencimento</p>
          ) : (
            <div className="space-y-2">
              {expiring.map((e) => (
                <div key={e.id} className="bg-gray-50 dark:bg-grafite-800/50 border border-gray-200 dark:border-grafite-700 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white font-medium">{e.marca} {e.modelo}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="uppercase font-mono">{e.placa}</span> • {e.cliente_nome}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${getDaysColor(e.dias_restantes)}`}>{e.dias_restantes} dias</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Fim: {formatDate(e.garantia_fim)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showWarrantyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/60" onClick={() => setShowWarrantyModal(null)} />
          <div className="relative bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-5 w-full max-w-sm mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 dark:text-white font-semibold text-sm">Adicionar Garantia</h3>
              <button onClick={() => setShowWarrantyModal(null)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Selecione o período de garantia</p>
              <div className="flex gap-2">
                {[12, 24, 36].map((m) => (
                  <button
                    key={m}
                    onClick={() => { setWarrantyMeses(m); setWarrantyDate(''); }}
                    className={`flex-1 py-3 rounded-lg text-sm font-medium border transition-all ${
                      warrantyMeses === m && !warrantyDate
                        ? 'bg-laranja-600 text-white border-laranja-600'
                        : 'bg-gray-100 dark:bg-grafite-800 text-gray-900 dark:text-white border-gray-200 dark:border-grafite-700 hover:border-laranja-500'
                    }`}
                  >
                    {m} meses
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 border-t border-gray-200 dark:border-grafite-700" />
                <span className="text-xs text-gray-400">ou</span>
                <div className="flex-1 border-t border-gray-200 dark:border-grafite-700" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Data personalizada</p>
                <input
                  type="date"
                  value={warrantyDate}
                  onChange={(e) => { setWarrantyDate(e.target.value); setWarrantyMeses(null); }}
                  className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500"
                />
              </div>
              <button
                onClick={() => addWarranty(showWarrantyModal)}
                disabled={!warrantyMeses && !warrantyDate}
                className="w-full bg-laranja-600 hover:bg-laranja-700 text-white py-3 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

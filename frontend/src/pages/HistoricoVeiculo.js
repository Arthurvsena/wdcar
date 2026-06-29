import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Search, ChevronRight, Package2, Wrench, Shield, FileText, Clock, BarChart3 } from 'lucide-react';

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

export default function HistoricoVeiculo() {
  const navigate = useNavigate();
  const [plate, setPlate] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const orders = history?.orders || [];
  const totalOS = orders.length;
  const totalGasto = orders.reduce((sum, o) => sum + (o.valor_total || 0), 0);
  const lastVisit = orders.length > 0 ? (orders[0].data_pedido || orders[0].data) : null;

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Histórico do Veículo</h1>

      <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por placa..."
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
                  <p className="text-xs text-gray-500 dark:text-gray-400">{v.cliente?.nome || v.cliente_nome}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl text-sm bg-red-500/10 border border-red-500/30 text-red-400">{error}</div>
      )}

      {selectedVehicle && !loading && history && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4 text-center">
            <FileText size={18} className="text-laranja-600 dark:text-laranja-400 mx-auto mb-1" />
            <p className="text-xl font-bold text-gray-900 dark:text-white">{totalOS}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total de OS</p>
          </div>
          <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4 text-center">
            <BarChart3 size={18} className="text-green-400 mx-auto mb-1" />
            <p className="text-xl font-bold text-laranja-600 dark:text-laranja-400">R$ {totalGasto.toFixed(2)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Gasto</p>
          </div>
          <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4 text-center">
            <Clock size={18} className="text-blue-400 mx-auto mb-1" />
            <p className="text-sm font-bold text-gray-900 dark:text-white">{lastVisit ? formatDate(lastVisit) : '-'}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Última Visita</p>
          </div>
        </div>
      )}

      {selectedVehicle && loading && (
        <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Carregando...</div>
      )}

      {selectedVehicle && !loading && history && orders.length === 0 && (
        <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Nenhuma OS encontrada para este veículo</div>
      )}

      {selectedVehicle && !loading && orders.length > 0 && (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              onClick={() => navigate(`/os/${order.id}`)}
              className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl overflow-hidden cursor-pointer active:bg-gray-100 dark:active:bg-grafite-800/50 active:scale-[0.99] transition-all"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-gray-500 dark:text-gray-400">OS #{order.id}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColors[order.status] || ''}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-laranja-600 dark:text-laranja-400">R$ {(order.valor_total ?? 0).toFixed(2)}</span>
                    <ChevronRight size={16} className="text-gray-400" />
                  </div>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{formatDate(order.data_pedido || order.data)}</p>

                {order.parts_used?.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1"><Package2 size={12} /> Peças</p>
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
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1"><Wrench size={12} /> Serviços</p>
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

                {(order.garantia_fim || order.garantia_meses) && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-grafite-800/30 rounded-lg px-3 py-2">
                    <Shield size={12} className="text-green-400" />
                    <span>Garantia: {order.garantia_meses} meses até {formatDate(order.garantia_fim)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { History, Search, Car, FileText, ShieldCheck } from 'lucide-react';

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

export default function HistoricoVeiculo() {
  const [searchParams] = useSearchParams();
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState(searchParams.get('placa') || '');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [orders, setOrders] = useState([]);
  const [warranties, setWarranties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/clients', { params: { skip: 0, limit: 999 } })
      .then(({ data }) => {
        setClients(data?.items || []);
      })
      .catch(() => {});
  }, []);

  const allVehicles = clients.flatMap((c) => (c.vehicles || []).map((v) => ({ ...v, clienteNome: c.nome })));
  const filtered = search
    ? allVehicles.filter((v) =>
        v.placa?.toLowerCase().includes(search.toLowerCase()) ||
        v.modelo?.toLowerCase().includes(search.toLowerCase()) ||
        v.clienteNome?.toLowerCase().includes(search.toLowerCase()))
    : allVehicles;

  const selectVehicle = async (v) => {
    setSelectedVehicle(v);
    setLoading(true);
    setError('');
    try {
      const [ordersRes, warrantiesRes] = await Promise.all([
        api.get('/orders', { params: { skip: 0, limit: 999 } }),
        api.get(`/garantia/vehicle/${v.id}`),
      ]);
      const vehicleOrders = (ordersRes.data?.orders || []).filter((o) => o.vehicle_id === v.id);
      setOrders(vehicleOrders);
      setWarranties(warrantiesRes.data?.items || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao carregar histórico'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 pb-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <History size={22} className="text-laranja-600 dark:text-laranja-400" /> Histórico do Veículo
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">Linha do tempo de OS e garantias por veículo</p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          placeholder="Buscar por placa, modelo ou cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl pl-9 pr-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500"
        />
      </div>

      {error && <div className="px-4 py-3 rounded-xl text-sm bg-red-500/10 border border-red-500/30 text-red-400">{error}</div>}

      {!selectedVehicle ? (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Nenhum veículo encontrado</div>
          ) : (
            filtered.map((v) => (
              <button key={v.id} onClick={() => selectVehicle(v)} className="w-full flex items-center gap-3 bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4 text-left hover:border-laranja-500/40 transition-all">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-grafite-800 flex items-center justify-center flex-shrink-0"><Car size={18} className="text-gray-500 dark:text-gray-400" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 dark:text-white text-sm font-medium truncate">{v.marca} {v.modelo} {v.placa ? `· ${v.placa}` : ''}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{v.clienteNome}</p>
                </div>
              </button>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <button onClick={() => setSelectedVehicle(null)} className="text-sm text-laranja-600 dark:text-laranja-400">&larr; Voltar à busca</button>
          <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4">
            <p className="text-gray-900 dark:text-white font-semibold">{selectedVehicle.marca} {selectedVehicle.modelo} {selectedVehicle.placa ? `· ${selectedVehicle.placa}` : ''}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{selectedVehicle.clienteNome}</p>
          </div>

          {loading ? (
            <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Carregando...</div>
          ) : (
            <>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2"><FileText size={16} /> Ordens de Serviço</h2>
              {orders.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma OS registrada para este veículo</p>
              ) : (
                <div className="space-y-2">
                  {orders.map((o) => (
                    <div key={o.id} className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">OS #{o.id} · {o.status}</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">R$ {o.valor_total.toFixed(2)}</p>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(o.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                  ))}
                </div>
              )}

              <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mt-4"><ShieldCheck size={16} /> Garantias</h2>
              {warranties.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma garantia registrada para este veículo</p>
              ) : (
                <div className="space-y-2">
                  {warranties.map((w) => (
                    <div key={w.id} className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{w.descricao || 'Garantia'} ({w.status})</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Expira em {new Date(w.data_expiracao).toLocaleDateString('pt-BR')}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

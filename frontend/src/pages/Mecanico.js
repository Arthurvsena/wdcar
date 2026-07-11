import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { HardHat, ChevronRight, Clock, AlertTriangle, Package } from 'lucide-react';

const OPEN_STATUSES = ['aberta', 'em_andamento', 'aguardando_peca', 'aguardando_pagamento', 'aguardando_aprovacao_orcamento'];

const statusStyles = {
  aberta: { bg: 'bg-yellow-500/10', dot: 'bg-yellow-400', label: 'Aberta' },
  em_andamento: { bg: 'bg-blue-500/10', dot: 'bg-blue-400', label: 'Em andamento' },
  aguardando_peca: { bg: 'bg-gray-500/10', dot: 'bg-gray-400', label: 'Aguardando Peça' },
  aguardando_pagamento: { bg: 'bg-orange-500/10', dot: 'bg-orange-400', label: 'Aguardando Pagamento' },
  aguardando_aprovacao_orcamento: { bg: 'bg-purple-500/10', dot: 'bg-purple-400', label: 'Aguardando Aprovação' },
};

export default function Mecanico() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/orders?skip=0&limit=100')
      .then(({ data }) => setOrders((data?.orders || []).filter(o => OPEN_STATUSES.includes(o.status))))
      .catch((err) => setError(err.response?.data?.detail || 'Erro ao carregar fila de trabalho'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4 pb-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <HardHat size={22} className="text-laranja-600 dark:text-laranja-400" /> Fila do Mecânico
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">Ordens de serviço em aberto, por prioridade</p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl text-sm bg-red-500/10 border border-red-500/30 text-red-400">{error}</div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Carregando...</div>
      ) : orders.length === 0 ? (
        <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Nenhuma OS em aberto</div>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => {
            const st = statusStyles[o.status] || statusStyles.aberta;
            return (
              <Link key={o.id} to={`/os/${o.id}`} className="flex items-center gap-3 bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4 hover:border-laranja-500/40 transition-all">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${st.bg}`}>
                  {o.aguardando_peca ? <Package size={18} className="text-gray-400" /> : <Clock size={18} className="text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 dark:text-white text-sm font-medium truncate">#{o.id} · {o.cliente?.nome || 'Cliente'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{o.vehicle?.marca} {o.vehicle?.modelo} {o.vehicle?.placa ? `· ${o.vehicle.placa}` : ''}</p>
                </div>
                <span className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full ${st.bg} text-gray-600 dark:text-gray-300`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} /> {st.label}
                </span>
                {o.prioridade >= 100 && <AlertTriangle size={14} className="text-red-400" />}
                <ChevronRight size={16} className="text-gray-400 dark:text-gray-600" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

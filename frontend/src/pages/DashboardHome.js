import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Users, FileText, Package2, TrendingUp, Repeat, Car } from 'lucide-react';

export default function DashboardHome() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    api.get('/dashboard/metrics').then(({ data }) => setMetrics(data)).catch(() => {});
  }, []);

  if (!metrics) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-gray-400 text-sm">
        Carregando...
      </div>
    );
  }

  const cards = [
    { label: 'Total Clientes', value: metrics.total_clientes, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', to: '/clientes' },
    { label: 'OS Abertas', value: metrics.os_abertas, icon: FileText, color: 'text-laranja-400', bg: 'bg-laranja-500/10', to: '/os' },
    { label: 'OS Finalizadas', value: metrics.os_finalizadas, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10', to: '/os' },
    { label: 'Total Peças', value: metrics.pecas_mais_usadas?.reduce((a, b) => a + b.total, 0) || 0, icon: Package2, color: 'text-purple-400', bg: 'bg-purple-500/10', to: '/pecas' },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-xs md:text-sm">Visão geral da oficina</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            to={card.to}
            className="bg-grafite-900 border border-grafite-800 rounded-xl p-4 md:p-5 hover:border-laranja-600/30 transition-all active:scale-[0.98]"
          >
            <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center mb-3`}>
              <card.icon size={20} className={card.color} />
            </div>
            <p className="text-xl md:text-2xl font-bold text-white">{card.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{card.label}</p>
          </Link>
        ))}
      </div>

      <div className="space-y-3 md:space-y-4">
        <div className="bg-grafite-900 border border-grafite-800 rounded-xl p-4 md:p-5">
          <div className="flex items-center gap-2 mb-4">
            <Car size={18} className="text-blue-400" />
            <h3 className="text-white font-semibold text-sm md:text-base">Marcas Mais Atendidas</h3>
          </div>
          {metrics.marcas_mais_atendidas.length === 0 ? (
            <p className="text-gray-500 text-xs md:text-sm text-center py-6">Nenhum dado ainda</p>
          ) : (
            <div className="space-y-3">
              {metrics.marcas_mais_atendidas.slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{item.marca}</span>
                  <span className="text-xs font-medium text-laranja-400 bg-laranja-500/10 px-2 py-0.5 rounded-full">{item.total} OS</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-grafite-900 border border-grafite-800 rounded-xl p-4 md:p-5">
          <div className="flex items-center gap-2 mb-4">
            <Repeat size={18} className="text-laranja-400" />
            <h3 className="text-white font-semibold text-sm md:text-base">Peças Mais Usadas</h3>
          </div>
          {metrics.pecas_mais_usadas.length === 0 ? (
            <p className="text-gray-500 text-xs md:text-sm text-center py-6">Nenhum dado ainda</p>
          ) : (
            <div className="space-y-3">
              {metrics.pecas_mais_usadas.slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{item.nome}</span>
                  <span className="text-xs font-medium text-laranja-400 bg-laranja-500/10 px-2 py-0.5 rounded-full">{item.total} usos</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

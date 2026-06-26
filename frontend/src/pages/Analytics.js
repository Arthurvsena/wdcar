import React, { useState, useEffect } from 'react';
import api from '../api';
import { Repeat, Car, Package2, Wrench, BarChart3 } from 'lucide-react';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('reincidentes');

  useEffect(() => {
    api.get('/dashboard/metrics').then(({ data }) => setData(data)).catch(() => {});
  }, []);

  if (!data) return <div className="flex items-center justify-center min-h-[60vh] text-gray-400 text-sm">Carregando...</div>;

  const tabs = [
    { key: 'reincidentes', label: 'Reincidentes', icon: Repeat },
    { key: 'marcas', label: 'Marcas', icon: Car },
    { key: 'pecas', label: 'Peças', icon: Package2 },
    { key: 'servicos', label: 'Serviços', icon: Wrench },
  ];

  return (
    <div className="space-y-4 pb-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white">Analytics</h1>
        <p className="text-gray-400 text-xs md:text-sm">Métricas e inteligência da oficina</p>
      </div>

      <div className="overflow-x-auto -mx-3 px-3">
        <div className="flex gap-1 bg-grafite-900 rounded-xl p-1 border border-grafite-800 min-w-max">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                tab === t.key ? 'bg-laranja-600 text-white' : 'text-gray-400'
              }`}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-grafite-900 border border-grafite-800 rounded-xl p-4">
        {tab === 'reincidentes' && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <Repeat size={18} className="text-laranja-400" />
              <h3 className="text-white font-semibold text-sm">Clientes Reincidentes</h3>
            </div>
            {data.reincidentes.length === 0 ? (
              <p className="text-gray-500 text-xs text-center py-8">Nenhum cliente reincidente identificado</p>
            ) : (
              <div className="space-y-3">
                {data.reincidentes.map((r, i) => (
                  <div key={i} className="flex items-center justify-between bg-grafite-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-laranja-500/10 rounded-full flex items-center justify-center text-xs font-bold text-laranja-400 flex-shrink-0">{i + 1}</div>
                      <div className="min-w-0">
                        <p className="text-sm text-white font-medium truncate">{r.nome}</p>
                        <p className="text-xs text-gray-400 truncate">{r.marca} {r.modelo}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-sm font-bold text-laranja-400">{r.total_os}x</p>
                      <p className="text-[10px] text-gray-500">voltas</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'marcas' && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <Car size={18} className="text-blue-400" />
              <h3 className="text-white font-semibold text-sm">Marcas Mais Atendidas</h3>
            </div>
            {data.marcas_mais_atendidas.length === 0 ? (
              <p className="text-gray-500 text-xs text-center py-8">Nenhum dado ainda</p>
            ) : (
              <div className="space-y-3">
                {data.marcas_mais_atendidas.map((m, i) => {
                  const max = Math.max(...data.marcas_mais_atendidas.map((x) => x.total));
                  const pct = max > 0 ? (m.total / max) * 100 : 0;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-300">{m.marca}</span>
                        <span className="text-xs text-gray-400">{m.total} OS</span>
                      </div>
                      <div className="w-full bg-grafite-800 rounded-full h-2.5">
                        <div className="bg-blue-500 h-2.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === 'pecas' && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <Package2 size={18} className="text-purple-400" />
              <h3 className="text-white font-semibold text-sm">Peças Mais Utilizadas</h3>
            </div>
            {data.pecas_mais_usadas.length === 0 ? (
              <p className="text-gray-500 text-xs text-center py-8">Nenhum dado ainda</p>
            ) : (
              <div className="space-y-2">
                {data.pecas_mais_usadas.map((p, i) => (
                  <div key={i} className="flex items-center justify-between bg-grafite-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs text-gray-500 w-5 flex-shrink-0">{i + 1}°</span>
                      <span className="text-sm text-gray-300 truncate">{p.nome}</span>
                    </div>
                    <span className="text-xs font-medium text-laranja-400 bg-laranja-500/10 px-2 py-0.5 rounded-full flex-shrink-0">{p.total} usos</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'servicos' && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <Wrench size={18} className="text-green-400" />
              <h3 className="text-white font-semibold text-sm">Serviços Mais Realizados</h3>
            </div>
            {data.servicos_mais_usados.length === 0 ? (
              <p className="text-gray-500 text-xs text-center py-8">Nenhum dado ainda</p>
            ) : (
              <div className="space-y-2">
                {data.servicos_mais_usados.map((s, i) => (
                  <div key={i} className="flex items-center justify-between bg-grafite-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs text-gray-500 w-5 flex-shrink-0">{i + 1}°</span>
                      <span className="text-sm text-gray-300 truncate">{s.nome}</span>
                    </div>
                    <span className="text-xs font-medium text-laranja-400 bg-laranja-500/10 px-2 py-0.5 rounded-full flex-shrink-0">{s.total} realiz.</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

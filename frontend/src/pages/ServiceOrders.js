import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Plus, FileText, Search, ChevronRight, Clock, AlertTriangle, Package } from 'lucide-react';

const TABS = [
  { key: 'abertas', label: 'Abertas', statuses: ['aberta', 'em_andamento'] },
  { key: 'finalizadas', label: 'Finalizadas', statuses: ['finalizada'] },
  { key: 'canceladas', label: 'Canceladas', statuses: ['cancelada'] },
];

export default function ServiceOrders() {
  const [orders, setOrders] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('abertas');
  const [form, setForm] = useState({ cliente_id: '', vehicle_id: '', observacoes: '' });

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const tab = TABS.find((t) => t.key === activeTab);
    let result = tab ? orders.filter((o) => tab.statuses.includes(o.status)) : orders;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((o) =>
        o.cliente?.nome?.toLowerCase().includes(q) ||
        o.vehicle?.modelo?.toLowerCase().includes(q) ||
        o.vehicle?.placa?.toLowerCase().includes(q) ||
        `#${o.id}`.includes(q)
      );
    }
    setFiltered(result);
  }, [search, activeTab, orders]);

  const load = async () => {
    const { data } = await api.get('/orders');
    setOrders(data);
    const { data: cli } = await api.get('/clients');
    setClients(cli);
  };

  const onClientSelect = (clienteId) => {
    const cli = clients.find((c) => c.id === parseInt(clienteId));
    setForm({ ...form, cliente_id: clienteId, vehicle_id: '' });
    setVehicles(cli?.vehicles || []);
  };

  const create = async (e) => {
    e.preventDefault();
    await api.post('/orders', form);
    setShowForm(false);
    setForm({ cliente_id: '', vehicle_id: '', observacoes: '' });
    load();
  };

  const countByStatus = (statuses) => orders.filter((o) => statuses.includes(o.status)).length;

  const getPriorityBadge = (o) => {
    if (o.status === 'finalizada' || o.status === 'cancelada') return null;
    if (o.aguardando_peca) return { bg: 'bg-gray-500/10', dot: 'bg-gray-400', text: 'Aguadando peça', icon: Package };
    if (o.prioridade >= 100) return { bg: 'bg-red-500/10', dot: 'bg-red-400', text: 'Urgente', icon: AlertTriangle };
    if (o.prioridade >= 50) return { bg: 'bg-orange-500/10', dot: 'bg-orange-400', text: 'Prioridade', icon: Clock };
    return { bg: 'bg-blue-500/10', dot: 'bg-blue-400', text: 'Normal', icon: null };
  };

  const statusStyles = {
    aberta: { bg: 'bg-yellow-500/10', dot: 'bg-yellow-400', label: 'Aberta' },
    em_andamento: { bg: 'bg-blue-500/10', dot: 'bg-blue-400', label: 'Em andamento' },
    finalizada: { bg: 'bg-green-500/10', dot: 'bg-green-400', label: 'Finalizada' },
    cancelada: { bg: 'bg-red-500/10', dot: 'bg-red-400', label: 'Cancelada' },
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Ordens de Serviço</h1>
          <p className="text-gray-400 text-xs md:text-sm">Gerencie as OS e orçamentos</p>
        </div>
        <button onClick={() => { setShowForm(true); }} className="flex items-center gap-2 bg-laranja-600 hover:bg-laranja-700 text-white px-4 py-2.5 md:py-2 rounded-xl md:rounded-lg text-sm font-medium active:scale-95 transition-all shadow-lg shadow-laranja-600/20">
          <Plus size={18} /> <span className="hidden md:inline">Nova OS</span>
        </button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input placeholder="Buscar por cliente, placa..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-grafite-900 border border-grafite-800 rounded-xl pl-9 pr-4 py-3 text-white text-sm focus:outline-none focus:border-laranja-500" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-grafite-900 rounded-xl p-1 border border-grafite-800 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.key ? 'bg-laranja-600 text-white shadow-lg shadow-laranja-600/20' : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === tab.key ? 'bg-white/20' : 'bg-grafite-800'
            }`}>
              {countByStatus(tab.statuses)}
            </span>
          </button>
        ))}
      </div>

      {showForm && (
        <form onSubmit={create} className="bg-grafite-900 border border-grafite-800 rounded-xl p-4 md:p-5 space-y-3">
          <div className="space-y-3">
            <select value={form.cliente_id} onChange={(e) => onClientSelect(e.target.value)} className="w-full bg-grafite-800 border border-grafite-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-laranja-500" required>
              <option value="">Selecione o cliente</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <select value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })} className="w-full bg-grafite-800 border border-grafite-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-laranja-500" required disabled={vehicles.length === 0}>
              <option value="">Selecione o veículo</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.marca} {v.modelo} {v.placa ? `(${v.placa})` : ''}</option>)}
            </select>
            <input placeholder="Observações (opcional)" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className="w-full bg-grafite-800 border border-grafite-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-laranja-500" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="flex-1 bg-laranja-600 hover:bg-laranja-700 text-white py-3 rounded-lg text-sm font-medium">Criar OS</button>
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-grafite-700 hover:bg-grafite-600 text-gray-300 py-3 rounded-lg text-sm">Cancelar</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="bg-grafite-900 border border-grafite-800 rounded-xl p-8 text-center text-gray-500 text-sm">
            {search ? 'Nenhuma OS encontrada' : 'Nenhuma OS nesta categoria'}
          </div>
        )}
        {filtered.map((o) => {
          const st = statusStyles[o.status] || statusStyles.aberta;
          const prio = getPriorityBadge(o);
          return (
            <Link
              key={o.id}
              to={`/os/${o.id}`}
              className="block bg-grafite-900 border border-grafite-800 rounded-xl p-4 active:bg-grafite-800/50 active:scale-[0.99] transition-all"
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 ${prio?.bg || 'bg-laranja-500/10'} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  {prio?.icon ? <prio.icon size={18} className={`${prio.dot.replace('bg-', 'text-')}`} /> : <FileText size={18} className="text-laranja-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-gray-500">#{o.id}</span>
                    <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] ${st.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      {st.label}
                    </span>
                    {prio && (
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${prio.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />
                        {prio.text}
                      </span>
                    )}
                    {o.orcamento_status !== 'pendente' && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${o.orcamento_status === 'aprovado' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {o.orcamento_status === 'aprovado' ? 'Aprovado' : 'Reprovado'}
                      </span>
                    )}
                  </div>
                  <p className="text-white text-sm font-medium mt-1 truncate">{o.cliente?.nome}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {o.vehicle ? `${o.vehicle.marca} ${o.vehicle.modelo}` : '-'}
                    {o.vehicle?.placa && <span className="uppercase ml-1">• {o.vehicle.placa}</span>}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-bold text-laranja-400">R$ {o.valor_total.toFixed(2)}</span>
                    <ChevronRight size={16} className="text-gray-600" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { ArrowLeft, Copy, CheckCircle, XCircle, Plus, Trash2, Share2, Wrench, Package2, AlertTriangle } from 'lucide-react';

export default function ServiceOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [parts, setParts] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedPart, setSelectedPart] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [partQty, setPartQty] = useState(1);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('info');
  const [showAddPart, setShowAddPart] = useState(false);
  const [showAddService, setShowAddService] = useState(false);

  useEffect(() => {
    load();
    api.get('/parts').then(({ data }) => setParts(data));
    api.get('/services').then(({ data }) => setServices(data));
  }, [id]);

  const load = async () => {
    const { data } = await api.get(`/orders/${id}`);
    setOrder(data);
  };

  const showMsg = (text, type = 'info') => { setMsg(text); setMsgType(type); setTimeout(() => { setMsg(''); setMsgType('info'); }, 3000); };

  const addPart = async () => {
    if (!selectedPart) return;
    try {
      const { data } = await api.post(`/orders/${id}/parts`, { part_id: parseInt(selectedPart), quantidade: partQty });
      showMsg(`Peça adicionada! Estoque restante: ${data.remaining_stock}`, 'success');
      setShowAddPart(false);
      setSelectedPart('');
      setPartQty(1);
      load();
    } catch (err) {
      showMsg(err.response?.data?.detail || 'Erro ao adicionar peça', 'error');
    }
  };

  const addService = async () => {
    if (!selectedService) return;
    try {
      await api.post(`/orders/${id}/services`, { service_id: parseInt(selectedService) });
      showMsg('Serviço adicionado!', 'success');
      setShowAddService(false);
      setSelectedService('');
      load();
    } catch (err) {
      showMsg(err.response?.data?.detail || 'Erro ao adicionar serviço', 'error');
    }
  };

  const removePart = async (orderPartId) => {
    if (!window.confirm('Remover peça? O estoque será restaurado.')) return;
    await api.delete(`/orders/${id}/parts/${orderPartId}`);
    load();
  };

  const removeService = async (orderServiceId) => {
    await api.delete(`/orders/${id}/services/${orderServiceId}`);
    load();
  };

  const changeStatus = async (status) => {
    await api.post(`/orders/${id}/status?status=${status}`);
    load();
  };

  const copyOrcLink = () => {
    if (!order?.orcamento_token) return;
    const link = `${window.location.origin}/orcamento/${order.orcamento_token}`;
    navigator.clipboard.writeText(link);
    showMsg('Link do orçamento copiado!', 'success');
  };

  if (!order) return <div className="flex items-center justify-center min-h-[60vh] text-gray-400 text-sm">Carregando...</div>;

  const canEdit = order.status !== 'finalizada' && order.status !== 'cancelada';

  const statusColors = {
    aberta: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    em_andamento: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    finalizada: 'bg-green-500/20 text-green-400 border-green-500/30',
    cancelada: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/os')} className="text-gray-400 hover:text-white p-1 -ml-1">
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg md:text-2xl font-bold text-white truncate">OS #{order.id}</h1>
          <p className="text-xs md:text-sm text-gray-400 truncate">
            {order.cliente?.nome} • {order.vehicle?.marca} {order.vehicle?.modelo}
            {order.vehicle?.placa && <span className="uppercase"> ({order.vehicle.placa})</span>}
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[10px] md:text-xs border ${statusColors[order.status] || ''}`}>
          {order.status?.replace('_', ' ')}
        </span>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl text-sm flex items-center gap-2 ${
          msgType === 'error' ? 'bg-red-500/10 border border-red-500/30 text-red-400' :
          msgType === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' :
          'bg-laranja-600/20 border border-laranja-600/30 text-laranja-400'
        }`}>
          {msgType === 'error' ? <XCircle size={16} /> : <CheckCircle size={16} />}
          {msg}
        </div>
      )}

      {/* Peças */}
      <div className="bg-grafite-900 border border-grafite-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-grafite-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package2 size={16} className="text-purple-400" />
            <h3 className="text-white font-semibold text-sm">Peças</h3>
          </div>
          {canEdit && (
            <button onClick={() => setShowAddPart(!showAddPart)} className="text-xs text-laranja-400 hover:text-laranja-300 font-medium">
              {showAddPart ? 'Cancelar' : '+ Adicionar'}
            </button>
          )}
        </div>

        {showAddPart && canEdit && (
          <div className="p-4 bg-grafite-800/30 border-b border-grafite-800 space-y-2">
            <select value={selectedPart} onChange={(e) => setSelectedPart(e.target.value)} className="w-full bg-grafite-800 border border-grafite-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-laranja-500">
              <option value="">Selecione uma peça</option>
              {parts.filter((p) => p.quantidade > 0).map((p) => (
                <option key={p.id} value={p.id}>{p.nome} (est: {p.quantidade}) - R$ {p.preco_venda.toFixed(2)}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input type="number" min="1" value={partQty} onChange={(e) => setPartQty(parseInt(e.target.value) || 1)} className="w-20 bg-grafite-800 border border-grafite-700 rounded-lg px-3 py-2.5 text-white text-sm text-center focus:outline-none focus:border-laranja-500" />
              <button onClick={addPart} className="flex-1 bg-laranja-600 hover:bg-laranja-700 text-white py-2.5 rounded-lg text-sm font-medium">Adicionar</button>
            </div>
          </div>
        )}

        {order.parts_used.length === 0 ? (
          <p className="text-gray-500 text-xs text-center py-6">Nenhuma peça adicionada</p>
        ) : (
          <div className="divide-y divide-grafite-800/50">
            {order.parts_used.map((op) => (
              <div key={op.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{op.part_nome || `Peça #${op.part_id}`}</p>
                  <p className="text-xs text-gray-400">{op.quantidade}x R$ {op.preco_unitario.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-laranja-400">R$ {(op.quantidade * op.preco_unitario).toFixed(2)}</span>
                  {canEdit && <button onClick={() => removePart(op.id)} className="text-gray-500 hover:text-red-400 p-1"><Trash2 size={14} /></button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Serviços */}
      <div className="bg-grafite-900 border border-grafite-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-grafite-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench size={16} className="text-blue-400" />
            <h3 className="text-white font-semibold text-sm">Serviços</h3>
          </div>
          {canEdit && (
            <button onClick={() => setShowAddService(!showAddService)} className="text-xs text-laranja-400 hover:text-laranja-300 font-medium">
              {showAddService ? 'Cancelar' : '+ Adicionar'}
            </button>
          )}
        </div>

        {showAddService && canEdit && (
          <div className="p-4 bg-grafite-800/30 border-b border-grafite-800 space-y-2">
            <select value={selectedService} onChange={(e) => setSelectedService(e.target.value)} className="w-full bg-grafite-800 border border-grafite-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-laranja-500">
              <option value="">Selecione um serviço</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.nome} - R$ {s.valor_mao_obra.toFixed(2)}</option>
              ))}
            </select>
            <button onClick={addService} className="w-full bg-laranja-600 hover:bg-laranja-700 text-white py-2.5 rounded-lg text-sm font-medium">Adicionar</button>
          </div>
        )}

        {order.services_used.length === 0 ? (
          <p className="text-gray-500 text-xs text-center py-6">Nenhum serviço adicionado</p>
        ) : (
          <div className="divide-y divide-grafite-800/50">
            {order.services_used.map((osv) => (
              <div key={osv.id} className="flex items-center justify-between px-4 py-3">
                <p className="text-sm text-white truncate flex-1">{osv.service_nome || `Serviço #${osv.service_id}`}</p>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-laranja-400">R$ {osv.valor_cobrado.toFixed(2)}</span>
                  {canEdit && <button onClick={() => removeService(osv.id)} className="text-gray-500 hover:text-red-400 p-1"><Trash2 size={14} /></button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resumo + Orçamento */}
      <div className="bg-grafite-900 border border-grafite-800 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Valor Total</span>
          <p className="text-xl md:text-2xl font-bold text-laranja-400">R$ {order.valor_total.toFixed(2)}</p>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-grafite-800">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Orçamento:</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              order.orcamento_status === 'aprovado' ? 'bg-green-500/10 text-green-400' :
              order.orcamento_status === 'reprovado' ? 'bg-red-500/10 text-red-400' :
              'bg-gray-500/10 text-gray-400'
            }`}>{order.orcamento_status}</span>
          </div>
          <button onClick={copyOrcLink} className="flex items-center gap-1.5 text-xs text-laranja-400 hover:text-laranja-300 font-medium">
            <Share2 size={14} /> Compartilhar
          </button>
        </div>
      </div>

      {/* Ações */}
      {canEdit && (
        <div className="flex flex-col gap-2">
          {order.status === 'aberta' && (
            <button onClick={() => changeStatus('em_andamento')} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl text-sm font-medium active:scale-[0.98] transition-all">
              <CheckCircle size={18} /> Iniciar Serviço
            </button>
          )}
          {order.status === 'em_andamento' && (
            <button onClick={() => changeStatus('finalizada')} className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-xl text-sm font-medium active:scale-[0.98] transition-all">
              <CheckCircle size={18} /> Finalizar OS
            </button>
          )}
          <button onClick={() => changeStatus('cancelada')} className="w-full flex items-center justify-center gap-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-600/30 py-3.5 rounded-xl text-sm font-medium active:scale-[0.98] transition-all">
            <XCircle size={18} /> Cancelar OS
          </button>
        </div>
      )}
    </div>
  );
}

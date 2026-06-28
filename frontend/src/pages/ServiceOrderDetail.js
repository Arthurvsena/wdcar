import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { ArrowLeft, CheckCircle, XCircle, Plus, Trash2, Wrench, Package2, AlertTriangle, Clock, Package, Play, DollarSign, FileText, ChevronDown, MessageCircle } from 'lucide-react';

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
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    load();
    api.get('/parts').then(({ data }) => setParts(data));
    api.get('/services').then(({ data }) => setServices(data));
  }, [id]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowStatusDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const load = async () => {
    const { data } = await api.get(`/orders/${id}`);
    setOrder(data);
  };

  const showMsg = (text, type = 'info') => { setMsg(text); setMsgType(type); setTimeout(() => { setMsg(''); setMsgType('info'); }, 3000); };

  const addPart = async () => {
    if (!selectedPart) return;
    try {
      const { data } = await api.post(`/orders/${id}/parts`, { part_id: parseInt(selectedPart), quantidade: parseInt(partQty) || 1 });
      showMsg(`Peça adicionada! Estoque restante: ${data.remaining_stock ?? 0}`, 'success');
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
    if (!window.confirm('Remover serviço?')) return;
    await api.delete(`/orders/${id}/services/${orderServiceId}`);
    load();
  };

  const changeStatus = async (status) => {
    await api.post(`/orders/${id}/status?status=${status}`);
    load();
  };

  const handleStatusChange = async (status) => {
    setShowStatusDropdown(false);
    if (status === order.status) return;
    if (status === 'finalizada') {
      if (!window.confirm('Tem certeza que deseja finalizar esta OS?')) return;
    }
    if (status === 'cancelada') {
      if (!window.confirm('Tem certeza que deseja cancelar esta OS?')) return;
    }
    await changeStatus(status);
    showMsg(`Status alterado para ${statusLabels[status]}`, 'success');
  };

  const toggleAguardandoPeca = async () => {
    await api.patch(`/orders/${id}`, { aguardando_peca: !order.aguardando_peca });
    load();
    showMsg(order.aguardando_peca ? 'Peça disponível - prioridade restaurada' : 'Aguardando peça - prioridade reduzida', 'info');
  };

  const shareWhatsApp = () => {
    if (!order?.orcamento_token) return;
    const link = `${window.location.origin}/orcamento/${order.orcamento_token}`;
    const message = `Olá! Segue o orçamento da sua OS #${order.id}: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (!order) return <div className="flex items-center justify-center min-h-[60vh] text-gray-500 dark:text-gray-400 text-sm">Carregando...</div>;

  const canEdit = order.status !== 'finalizada' && order.status !== 'cancelada';

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

  const statusIcons = {
    aberta: Clock,
    em_andamento: Play,
    aguardando_peca: Package,
    aguardando_pagamento: DollarSign,
    aguardando_aprovacao_orcamento: FileText,
    orcamento_recusado: XCircle,
    finalizada: CheckCircle,
    cancelada: XCircle,
  };

  const statusOptions = [
    'em_andamento',
    'aguardando_peca',
    'aguardando_pagamento',
    'aguardando_aprovacao_orcamento',
    'orcamento_recusado',
    'finalizada',
    'cancelada',
  ];

  const getPriorityInfo = () => {
    if (order.status === 'finalizada' || order.status === 'cancelada') return null;
    if (order.aguardando_peca) return { bg: 'bg-gray-500/10', text: 'text-gray-400', icon: Package, label: 'Aguardando Peça' };
    if (order.prioridade >= 100) return { bg: 'bg-red-500/10', text: 'text-red-400', icon: AlertTriangle, label: 'Urgente' };
    if (order.prioridade >= 50) return { bg: 'bg-orange-500/10', text: 'text-orange-400', icon: Clock, label: 'Prioridade' };
    return { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: null, label: 'Normal' };
  };

  const prio = getPriorityInfo();
  const StatusIcon = statusIcons[order.status] || Clock;

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/os')} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1 -ml-1">
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white truncate">OS #{order.id}</h1>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 truncate">
            {order.cliente?.nome} • {order.vehicle?.marca} {order.vehicle?.modelo}
            {order.vehicle?.placa && <span className="uppercase"> ({order.vehicle.placa})</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {prio && (
            <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] ${prio.bg} ${prio.text}`}>
              {prio.icon && <prio.icon size={12} />}
              {prio.label}
            </span>
          )}
          <span className={`px-2.5 py-1 rounded-full text-[10px] md:text-xs border ${statusColors[order.status] || ''}`}>
            {statusLabels[order.status] || order.status?.replace('_', ' ')}
          </span>
        </div>
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
      <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-grafite-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package2 size={16} className="text-purple-400" />
            <h3 className="text-gray-900 dark:text-white font-semibold text-sm">Peças</h3>
          </div>
          {canEdit && (
            <button onClick={() => setShowAddPart(!showAddPart)} className="text-xs text-laranja-600 dark:text-laranja-400 hover:text-laranja-500 dark:hover:text-laranja-300 font-medium">
              {showAddPart ? 'Cancelar' : '+ Adicionar'}
            </button>
          )}
        </div>

        {showAddPart && canEdit && (
          <div className="p-4 bg-gray-50 dark:bg-grafite-800/30 border-b border-gray-200 dark:border-grafite-800 space-y-2">
            <select value={selectedPart} onChange={(e) => setSelectedPart(e.target.value)} className="w-full bg-white dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-3 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500">
              <option value="">Selecione uma peça</option>
              {parts.filter((p) => (p.quantidade ?? 0) > 0).map((p) => (
                <option key={p.id} value={p.id}>{p.nome} (est: {p.quantidade ?? 0}) - R$ {(p.preco_venda ?? 0).toFixed(2)}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input type="number" min="1" value={partQty} onChange={(e) => setPartQty(parseInt(e.target.value) || 1)} className="w-20 bg-white dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-3 py-2.5 text-gray-900 dark:text-white text-sm text-center focus:outline-none focus:border-laranja-500" />
              <button onClick={addPart} className="flex-1 bg-laranja-600 hover:bg-laranja-700 text-white py-2.5 rounded-lg text-sm font-medium">Adicionar</button>
            </div>
          </div>
        )}

        {order.parts_used.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-xs text-center py-6">Nenhuma peça adicionada</p>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-grafite-800/50">
            {order.parts_used.map((op) => (
              <div key={op.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white truncate">{op.part_nome || `Peça #${op.part_id}`}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{op.quantidade}x R$ {(op.preco_unitario ?? 0).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-laranja-600 dark:text-laranja-400">R$ {((op.quantidade ?? 0) * (op.preco_unitario ?? 0)).toFixed(2)}</span>
                  {canEdit && <button onClick={() => removePart(op.id)} className="text-gray-400 dark:text-gray-500 hover:text-red-400 p-1"><Trash2 size={14} /></button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Serviços */}
      <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-grafite-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench size={16} className="text-blue-400" />
            <h3 className="text-gray-900 dark:text-white font-semibold text-sm">Serviços</h3>
          </div>
          {canEdit && (
            <button onClick={() => setShowAddService(!showAddService)} className="text-xs text-laranja-600 dark:text-laranja-400 hover:text-laranja-500 dark:hover:text-laranja-300 font-medium">
              {showAddService ? 'Cancelar' : '+ Adicionar'}
            </button>
          )}
        </div>

{showAddService && canEdit && (
          <div className="p-4 bg-gray-50 dark:bg-grafite-800/30 border-b border-gray-200 dark:border-grafite-800 space-y-2">
            <select value={selectedService} onChange={(e) => setSelectedService(e.target.value)} className="w-full bg-white dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-3 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500">
              <option value="">Selecione um serviço</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.nome} - R$ {s.valor_mao_obra.toFixed(2)}</option>
              ))}
            </select>
            <button onClick={addService} className="w-full bg-laranja-600 hover:bg-laranja-700 text-white py-2.5 rounded-lg text-sm font-medium">Adicionar</button>
          </div>
        )}

        {order.services_used.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-xs text-center py-6">Nenhum serviço adicionado</p>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-grafite-800/50">
            {order.services_used.map((osv) => (
              <div key={osv.id} className="flex items-center justify-between px-4 py-3">
                <p className="text-sm text-gray-900 dark:text-white truncate flex-1">{osv.service_nome || `Serviço #${osv.service_id}`}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-laranja-600 dark:text-laranja-400">R$ {(osv.valor_cobrado ?? 0).toFixed(2)}</span>
                  {canEdit && <button onClick={() => removeService(osv.id)} className="text-gray-400 dark:text-gray-500 hover:text-red-400 p-1"><Trash2 size={14} /></button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resumo + Orçamento */}
      <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">Valor Total</span>
          <p className="text-xl md:text-2xl font-bold text-laranja-600 dark:text-laranja-400">R$ {(order.valor_total ?? 0).toFixed(2)}</p>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-grafite-800">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Orçamento:</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              order.orcamento_status === 'aprovado' ? 'bg-green-500/10 text-green-400' :
              order.orcamento_status === 'reprovado' ? 'bg-red-500/10 text-red-400' :
              'bg-gray-500/10 text-gray-400'
            }`}>{order.orcamento_status}</span>
          </div>
        </div>
        <button onClick={shareWhatsApp} className="w-full mt-3 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-xl text-sm font-semibold active:scale-[0.98] transition-all shadow-lg shadow-green-600/30">
          <MessageCircle size={20} /> Enviar Orçamento via WhatsApp
        </button>
      </div>

      {/* Ações */}
      {canEdit && (
        <div className="flex flex-col gap-2">
          <button
            onClick={toggleAguardandoPeca}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-medium active:scale-[0.98] transition-all ${
              order.aguardando_peca
                ? 'bg-green-600/10 hover:bg-green-600/20 text-green-400 border border-green-600/30'
                : 'bg-gray-200 dark:bg-gray-700/30 hover:bg-gray-300 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600/30'
            }`}
          >
            {order.aguardando_peca ? <CheckCircle size={18} /> : <Package size={18} />}
            {order.aguardando_peca ? 'Peça chegou - Restaurar prioridade' : 'Aguardando peça'}
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className="w-full flex items-center justify-center gap-2 bg-laranja-600 hover:bg-laranja-700 text-white py-3.5 rounded-xl text-sm font-medium active:scale-[0.98] transition-all"
            >
              <StatusIcon size={18} />
              {statusLabels[order.status]}
              <ChevronDown size={18} className={`transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showStatusDropdown && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white dark:bg-grafite-800 border border-gray-200 dark:border-grafite-700 rounded-xl overflow-hidden shadow-xl z-50">
                {statusOptions.map((status) => {
                  const Icon = statusIcons[status];
                  return (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                        status === order.status
                          ? 'bg-laranja-600/20 text-laranja-600 dark:text-laranja-400 cursor-default'
                          : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-grafite-700'
                      }`}
                    >
                      <Icon size={16} />
                      {statusLabels[status]}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import { Wrench, CheckCircle, XCircle, Package2, Wrench as WrenchIcon, AlertTriangle } from 'lucide-react';

export default function ClientView() {
  const { token } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    api.get(`/orders/public/${token}`).then(({ data }) => {
      setOrder(data);
    }).catch(() => {
      setActionMsg('Orçamento não encontrado');
    }).finally(() => setLoading(false));
  }, [token]);

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await api.post(`/orders/public/${token}/approve`);
      setActionMsg('Orçamento aprovado com sucesso! Aguarde o contato da oficina.');
      setOrder({ ...order, orcamento_status: 'aprovado' });
    } catch { setActionMsg('Erro ao processar. Tente novamente.'); }
    finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      await api.post(`/orders/public/${token}/reject`);
      setActionMsg('Orçamento reprovado.');
      setOrder({ ...order, orcamento_status: 'reprovado' });
    } catch { setActionMsg('Erro ao processar. Tente novamente.'); }
    finally { setActionLoading(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-grafite-950 flex items-center justify-center">
        <div className="text-laranja-400 text-sm">Carregando...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-grafite-950 flex items-center justify-center p-5">
        <div className="bg-grafite-900 border border-grafite-800 rounded-2xl p-8 text-center max-w-sm w-full">
          <XCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-lg text-white font-semibold">Orçamento não encontrado</h2>
          <p className="text-gray-400 text-sm mt-2">O link pode estar expirado ou inválido.</p>
        </div>
      </div>
    );
  }

  const alreadyAnswered = order.orcamento_status !== 'pendente';

  return (
    <div className="min-h-screen bg-grafite-950">
      <div className="max-w-lg mx-auto p-4 py-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-laranja-600 rounded-2xl mb-3 shadow-lg shadow-laranja-600/30">
            <Wrench size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">Orçamento #{order.id}</h1>
          <p className="text-sm text-gray-400 mt-1">
            {order.cliente?.nome}
          </p>
          {order.vehicle && (
            <p className="text-xs text-gray-500">{order.vehicle.marca} {order.vehicle.modelo}{order.vehicle.placa ? ` • ${order.vehicle.placa}` : ''}</p>
          )}
        </div>

        {actionMsg && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm text-center ${
            order.orcamento_status === 'aprovado' ? 'bg-green-500/10 text-green-400 border border-green-500/30' :
            order.orcamento_status === 'reprovado' ? 'bg-red-500/10 text-red-400 border border-red-500/30' :
            'bg-laranja-600/10 text-laranja-400 border border-laranja-600/30'
          }`}>
            {actionMsg}
          </div>
        )}

        <div className="bg-grafite-900 border border-grafite-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-white font-semibold">Itens do Orçamento</h2>

          {order.parts_used.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1.5">
                <Package2 size={12} /> Peças
              </h3>
              <div className="space-y-2">
                {order.parts_used.map((p) => (
                  <div key={p.id} className="flex justify-between bg-grafite-800/50 rounded-xl p-3">
                    <span className="text-sm text-white">{p.part_nome} x{p.quantidade}</span>
                    <span className="text-sm font-medium text-laranja-400">R$ {(p.quantidade * p.preco_unitario).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {order.services_used.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1.5">
                <WrenchIcon size={12} /> Serviços
              </h3>
              <div className="space-y-2">
                {order.services_used.map((s) => (
                  <div key={s.id} className="flex justify-between bg-grafite-800/50 rounded-xl p-3">
                    <span className="text-sm text-white">{s.service_nome}</span>
                    <span className="text-sm font-medium text-laranja-400">R$ {s.valor_cobrado.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {order.parts_used.length === 0 && order.services_used.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-4">Nenhum item adicionado ao orçamento ainda.</p>
          )}

          <div className="border-t border-grafite-800 pt-4 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-base text-white font-semibold">Valor Total</span>
              <span className="text-xl font-bold text-laranja-400">R$ {order.valor_total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {!alreadyAnswered ? (
          <div className="flex flex-col gap-3 mt-5">
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-4 rounded-2xl font-medium text-sm active:scale-[0.98] transition-all shadow-lg shadow-green-600/20"
            >
              <CheckCircle size={20} /> {actionLoading ? 'Processando...' : 'Aprovar Orçamento'}
            </button>
            <button
              onClick={handleReject}
              disabled={actionLoading}
              className="w-full flex items-center justify-center gap-2 bg-red-600/10 hover:bg-red-600/20 disabled:opacity-50 text-red-400 border border-red-600/30 py-4 rounded-2xl font-medium text-sm active:scale-[0.98] transition-all"
            >
              <XCircle size={20} /> {actionLoading ? 'Processando...' : 'Reprovar Orçamento'}
            </button>
          </div>
        ) : (
          <div className="mt-5 text-center">
            <span className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-medium ${
              order.orcamento_status === 'aprovado' ? 'bg-green-500/10 text-green-400 border border-green-500/30' :
              'bg-red-500/10 text-red-400 border border-red-500/30'
            }`}>
              {order.orcamento_status === 'aprovado' ? <CheckCircle size={18} /> : <XCircle size={18} />}
              {order.orcamento_status === 'aprovado' ? 'Orçamento Aprovado' : 'Orçamento Reprovado'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

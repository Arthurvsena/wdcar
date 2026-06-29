import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { Plus, Search, X, AlertCircle, Check, XCircle, ChevronDown, ChevronUp, Package2, Building2, Trash2 } from 'lucide-react';
import Pagination from '../components/Pagination';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('pt-BR');
};

const statusColors = {
  pendente: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  recebido: 'bg-green-500/10 text-green-400 border-green-500/30',
  cancelado: 'bg-red-500/10 text-red-400 border-red-500/30',
};

export default function Compras() {
  const [purchases, setPurchases] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [detail, setDetail] = useState({});

  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState(1);
  const [suppliers, setSuppliers] = useState([]);
  const [parts, setParts] = useState([]);
  const [newCompra, setNewCompra] = useState({ supplier_id: '', items: [], observacoes: '' });
  const [currentItem, setCurrentItem] = useState({ part_id: '', quantidade: '', preco_unitario: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { load(); }, [page, statusFilter]);

  const displayList = useMemo(() => {
    return Array.isArray(purchases) ? purchases : [];
  }, [purchases]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ skip: String((page - 1) * 20), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      const { data } = await api.get(`/purchases?${params}`);
      setPurchases(data ? (Array.isArray(data) ? data : (data.items || [])) : []);
      setTotal(data ? (Array.isArray(data) ? data.length : (data.total || 0)) : 0);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao carregar compras');
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (id) => {
    if (detail[id]) return;
    try {
      const { data } = await api.get(`/purchases/${id}`);
      setDetail(prev => ({ ...prev, [id]: data }));
    } catch (err) {
      setDetail(prev => ({ ...prev, [id]: null }));
    }
  };

  const toggleExpand = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    await loadDetail(id);
  };

  const openNewForm = async () => {
    setStep(1);
    setNewCompra({ supplier_id: '', items: [], observacoes: '' });
    setCurrentItem({ part_id: '', quantidade: '', preco_unitario: '' });
    setShowForm(true);
    setError('');
    try {
      const [suppRes, partsRes] = await Promise.all([
        api.get('/suppliers?skip=0&limit=200'),
        api.get('/parts?skip=0&limit=200'),
      ]);
      setSuppliers(suppRes.data ? (Array.isArray(suppRes.data) ? suppRes.data : (suppRes.data.items || [])) : []);
      setParts(partsRes.data ? (Array.isArray(partsRes.data) ? partsRes.data : (partsRes.data.items || [])) : []);
    } catch (err) {
      setError('Erro ao carregar dados para o formulário');
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setStep(1);
    setNewCompra({ supplier_id: '', items: [], observacoes: '' });
    setCurrentItem({ part_id: '', quantidade: '', preco_unitario: '' });
  };

  const addItem = () => {
    if (!currentItem.part_id || !currentItem.quantidade || !currentItem.preco_unitario) return;
    const part = parts.find(p => p.id === parseInt(currentItem.part_id));
    setNewCompra(prev => ({
      ...prev,
      items: [...prev.items, {
        part_id: parseInt(currentItem.part_id),
        part_nome: part?.nome || 'Peça',
        quantidade: parseInt(currentItem.quantidade),
        preco_unitario: parseFloat(currentItem.preco_unitario),
      }]
    }));
    setCurrentItem({ part_id: '', quantidade: '', preco_unitario: '' });
  };

  const removeItem = (index) => {
    setNewCompra(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const submitCompra = async () => {
    if (!newCompra.supplier_id || newCompra.items.length === 0) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post('/purchases', {
        supplier_id: parseInt(newCompra.supplier_id),
        items: newCompra.items.map(item => ({
          part_id: item.part_id,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
        })),
        observacoes: newCompra.observacoes,
      });
      closeForm();
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao criar compra');
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id, status) => {
    const msg = status === 'recebido' ? 'Confirmar recebimento desta compra?' : 'Cancelar esta compra?';
    if (!window.confirm(msg)) return;
    setError('');
    try {
      await api.put(`/purchases/${id}/status`, { status });
      setDetail(prev => ({ ...prev, [id]: null }));
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao atualizar status');
    }
  };

  const statusOptions = [
    { value: '', label: 'Todos' },
    { value: 'pendente', label: 'Pendente' },
    { value: 'recebido', label: 'Recebido' },
    { value: 'cancelado', label: 'Cancelado' },
  ];

  const supplierName = (p) => {
    if (p.supplier?.nome) return p.supplier.nome;
    if (typeof p.supplier === 'object' && p.supplier) return p.supplier.nome || '-';
    return p.supplier_nome || '-';
  };

  const totalFormItems = newCompra.items.reduce((sum, item) => sum + (item.quantidade * item.preco_unitario), 0);

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Compras</h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">Gerenciamento de pedidos de compra</p>
        </div>
        <button onClick={openNewForm} className="flex items-center gap-2 bg-laranja-600 hover:bg-laranja-700 text-white px-4 py-2.5 md:py-2 rounded-xl md:rounded-lg text-sm font-medium active:scale-95 transition-all shadow-lg shadow-laranja-600/20">
          <Plus size={18} /> <span className="hidden md:inline">Nova Compra</span>
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setStatusFilter(opt.value); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              statusFilter === opt.value
                ? 'bg-laranja-600/20 text-laranja-600 dark:text-laranja-400 border border-laranja-600/30'
                : 'bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-grafite-800'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl text-sm bg-red-500/10 border border-red-500/30 text-red-400">{error}</div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/60" onClick={closeForm} />
          <div className="relative bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4 md:p-5 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-gray-900 dark:text-white font-semibold text-sm">Nova Compra</h2>
              <button type="button" onClick={closeForm} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-4">
              {[1, 2, 3].map((s) => (
                <React.Fragment key={s}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    step >= s ? 'bg-laranja-600 text-white' : 'bg-gray-200 dark:bg-grafite-700 text-gray-500 dark:text-gray-400'
                  }`}>{s}</div>
                  {s < 3 && <div className={`flex-1 h-0.5 ${step > s ? 'bg-laranja-600' : 'bg-gray-200 dark:bg-grafite-700'}`} />}
                </React.Fragment>
              ))}
            </div>

            {step === 1 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">Selecione o fornecedor</p>
                <select
                  value={newCompra.supplier_id}
                  onChange={(e) => setNewCompra(prev => ({ ...prev, supplier_id: e.target.value }))}
                  className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500"
                >
                  <option value="">Selecione um fornecedor</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.nome} {s.cnpj_cpf ? `- ${s.cnpj_cpf}` : ''}</option>
                  ))}
                </select>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setStep(2)} disabled={!newCompra.supplier_id} className="flex-1 bg-laranja-600 hover:bg-laranja-700 text-white py-3 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed">
                    Próximo
                  </button>
                  <button type="button" onClick={closeForm} className="flex-1 bg-gray-200 dark:bg-grafite-700 hover:bg-gray-300 dark:hover:bg-grafite-600 text-gray-700 dark:text-gray-300 py-3 rounded-lg text-sm">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">Adicione os itens da compra</p>

                <div className="space-y-2 bg-gray-50 dark:bg-grafite-800/50 rounded-lg p-3">
                  <select
                    value={currentItem.part_id}
                    onChange={(e) => {
                      const part = parts.find(p => p.id === parseInt(e.target.value));
                      setCurrentItem({
                        part_id: e.target.value,
                        quantidade: '',
                        preco_unitario: part ? String(part.preco_compra || '') : '',
                      });
                    }}
                    className="w-full bg-white dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500"
                  >
                    <option value="">Selecione uma peça</option>
                    {parts.map((p) => (
                      <option key={p.id} value={p.id}>{p.nome} {p.codigo ? `(${p.codigo})` : ''}</option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="Quantidade"
                      type="number"
                      min="1"
                      value={currentItem.quantidade}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, quantidade: e.target.value }))}
                      className="w-full bg-white dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500"
                    />
                    <input
                      placeholder="Preço unitário (R$)"
                      type="number"
                      step="0.01"
                      min="0"
                      value={currentItem.preco_unitario}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, preco_unitario: e.target.value }))}
                      className="w-full bg-white dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addItem}
                    disabled={!currentItem.part_id || !currentItem.quantidade || !currentItem.preco_unitario}
                    className="w-full bg-laranja-600/80 hover:bg-laranja-600 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Adicionar Item
                  </button>
                </div>

                {newCompra.items.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Itens adicionados ({newCompra.items.length})</p>
                    {newCompra.items.map((item, idx) => (
                      <div key={idx} className="bg-gray-50 dark:bg-grafite-800/50 border border-gray-200 dark:border-grafite-700 rounded-lg px-3 py-2 flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 dark:text-white font-medium truncate">{item.part_nome}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{item.quantidade}x R$ {item.preco_unitario.toFixed(2)}</p>
                        </div>
                        <button onClick={() => removeItem(idx)} className="text-gray-400 dark:text-gray-500 hover:text-red-400 p-1 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button onClick={() => setStep(3)} disabled={newCompra.items.length === 0} className="flex-1 bg-laranja-600 hover:bg-laranja-700 text-white py-3 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed">
                    Revisar
                  </button>
                  <button type="button" onClick={() => setStep(1)} className="flex-1 bg-gray-200 dark:bg-grafite-700 hover:bg-gray-300 dark:hover:bg-grafite-600 text-gray-700 dark:text-gray-300 py-3 rounded-lg text-sm">
                    Voltar
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">Revise os dados da compra</p>

                <div className="bg-gray-50 dark:bg-grafite-800/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 size={16} className="text-gray-500 dark:text-gray-400" />
                    <span className="text-gray-900 dark:text-white font-medium">
                      {suppliers.find(s => s.id === parseInt(newCompra.supplier_id))?.nome || 'Fornecedor'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Itens</p>
                  {newCompra.items.map((item, idx) => (
                    <div key={idx} className="bg-gray-50 dark:bg-grafite-800/50 border border-gray-200 dark:border-grafite-700 rounded-lg px-3 py-2">
                      <p className="text-sm text-gray-900 dark:text-white font-medium">{item.part_nome}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.quantidade}x R$ {item.preco_unitario.toFixed(2)} = R$ {(item.quantidade * item.preco_unitario).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="bg-gray-50 dark:bg-grafite-800/50 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Valor Total:</span>
                  <span className="text-lg font-bold text-laranja-600 dark:text-laranja-400">R$ {totalFormItems.toFixed(2)}</span>
                </div>

                <textarea
                  placeholder="Observações (opcional)"
                  value={newCompra.observacoes}
                  onChange={(e) => setNewCompra(prev => ({ ...prev, observacoes: e.target.value }))}
                  rows={2}
                  className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500 resize-none"
                />

                <div className="flex gap-2 pt-2">
                  <button onClick={submitCompra} disabled={submitting} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {submitting ? 'Salvando...' : <><Check size={16} /> Confirmar Compra</>}
                  </button>
                  <button type="button" onClick={() => setStep(2)} className="flex-1 bg-gray-200 dark:bg-grafite-700 hover:bg-gray-300 dark:hover:bg-grafite-600 text-gray-700 dark:text-gray-300 py-3 rounded-lg text-sm">
                    Voltar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Carregando...</div>
      ) : displayList.length === 0 ? (
        <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
          {statusFilter ? 'Nenhuma compra encontrada para este status' : 'Nenhuma compra cadastrada'}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {displayList.map((p) => {
              const expanded = expandedId === p.id;
              const purchaseDetail = detail[p.id];
              return (
                <div key={p.id} className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleExpand(p.id)}
                    className="w-full flex items-center justify-between p-4 text-left active:bg-gray-100 dark:active:bg-grafite-800/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-gray-900 dark:text-white font-semibold text-sm md:text-base truncate">{supplierName(p)}</h3>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusColors[p.status] || ''}`}>
                          {p.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        <span>{formatDate(p.data_pedido)}</span>
                        <span className="font-medium text-laranja-600 dark:text-laranja-400">R$ {(p.valor_total ?? 0).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {p.status === 'pendente' && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); updateStatus(p.id, 'recebido'); }}
                            className="text-green-400 hover:text-green-300 p-2 transition-colors"
                            title="Receber"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); updateStatus(p.id, 'cancelado'); }}
                            className="text-red-400 hover:text-red-300 p-2 transition-colors"
                            title="Cancelar"
                          >
                            <XCircle size={16} />
                          </button>
                        </>
                      )}
                      {expanded ? <ChevronUp size={18} className="text-gray-500 dark:text-gray-400" /> : <ChevronDown size={18} className="text-gray-500 dark:text-gray-400" />}
                    </div>
                  </button>

                  {expanded && (
                    <div className="px-4 pb-4 border-t border-gray-200 dark:border-grafite-800 pt-3">
                      <h4 className="text-xs font-medium text-gray-600 dark:text-gray-300 flex items-center gap-1.5 mb-3"><Package2 size={14} /> Itens da Compra</h4>
                      {!purchaseDetail ? (
                        <p className="text-gray-500 dark:text-gray-400 text-xs text-center py-3">Carregando...</p>
                      ) : purchaseDetail.items && purchaseDetail.items.length > 0 ? (
                        <div className="space-y-2">
                          {purchaseDetail.items.map((item, idx) => (
                            <div key={idx} className="bg-gray-50 dark:bg-grafite-800/50 border border-gray-200 dark:border-grafite-700 rounded-lg p-3">
                              <p className="text-sm text-gray-900 dark:text-white font-medium">{item.part?.nome || 'Peça'}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Qtd: {item.quantidade} | Preço: R$ {(item.preco_unitario ?? 0).toFixed(2)} | Subtotal: R$ {((item.quantidade ?? 0) * (item.preco_unitario ?? 0)).toFixed(2)}
                              </p>
                            </div>
                          ))}
                          <div className="bg-gray-50 dark:bg-grafite-800/50 border border-gray-200 dark:border-grafite-700 rounded-lg p-3 flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total:</span>
                            <span className="text-base font-bold text-laranja-600 dark:text-laranja-400">R$ {(purchaseDetail.valor_total ?? 0).toFixed(2)}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-xs text-center py-3">Nenhum item encontrado</p>
                      )}
                      {purchaseDetail?.observacoes && (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-grafite-800/50 rounded-lg p-2">
                          <span className="font-medium text-gray-600 dark:text-gray-300">Obs:</span> {purchaseDetail.observacoes}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

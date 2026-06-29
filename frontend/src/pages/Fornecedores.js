import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { Plus, Edit3, Trash2, Search, X, AlertCircle, Phone, Fingerprint, MapPin, ChevronDown, ChevronUp, Package2 } from 'lucide-react';
import { formatCPFCNPJ, isValidCPFCNPJ, unmask, formatPhone } from '../utils/validators';
import Pagination from '../components/Pagination';

const ESTADOS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

const formatCEP = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('pt-BR');
};

const statusColors = {
  pendente: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  recebido: 'bg-green-500/10 text-green-400 border-green-500/30',
  cancelado: 'bg-red-500/10 text-red-400 border-red-500/30',
};

export default function Fornecedores() {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [purchases, setPurchases] = useState({});
  const [loadingPurchases, setLoadingPurchases] = useState({});
  const [form, setForm] = useState({
    nome: '', cnpj_cpf: '', ie_rg: '', telefone: '', email: '',
    endereco: '', bairro: '', cidade: '', estado: '', cep: '',
    contato_nome: '', observacoes: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => { load(); }, [page]);

  const displayList = useMemo(() => {
    const arr = Array.isArray(suppliers) ? suppliers : [];
    if (!search) return arr;
    const q = search.toLowerCase();
    return arr.filter(s =>
      s.nome?.toLowerCase().includes(q) ||
      s.cnpj_cpf?.toLowerCase().includes(q)
    );
  }, [search, suppliers]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/suppliers?skip=${(page - 1) * 20}&limit=20`);
      setSuppliers(data ? (Array.isArray(data) ? data : (data.items || [])) : []);
      setTotal(data ? (Array.isArray(data) ? data.length : (data.total || 0)) : 0);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao carregar fornecedores');
    } finally {
      setLoading(false);
    }
  };

  const loadPurchases = async (supplierId) => {
    if (purchases[supplierId]) return;
    setLoadingPurchases(prev => ({ ...prev, [supplierId]: true }));
    try {
      const { data } = await api.get(`/suppliers/${supplierId}/purchases`);
      setPurchases(prev => ({ ...prev, [supplierId]: Array.isArray(data) ? data : (data.items || []) }));
    } catch (err) {
      setPurchases(prev => ({ ...prev, [supplierId]: [] }));
    } finally {
      setLoadingPurchases(prev => ({ ...prev, [supplierId]: false }));
    }
  };

  const toggleExpand = async (supplierId) => {
    if (expandedId === supplierId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(supplierId);
    await loadPurchases(supplierId);
  };

  const validateForm = () => {
    const errs = {};
    if (!form.nome.trim()) errs.nome = 'Nome é obrigatório';
    if (!form.cnpj_cpf || unmask(form.cnpj_cpf).length === 0) {
      errs.cnpj_cpf = 'CNPJ/CPF é obrigatório';
    } else if (!isValidCPFCNPJ(form.cnpj_cpf)) {
      errs.cnpj_cpf = 'CNPJ ou CPF inválido';
    }
    if (!form.telefone.trim()) errs.telefone = 'Telefone é obrigatório';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const save = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    const payload = {
      ...form,
      cnpj_cpf: unmask(form.cnpj_cpf),
      telefone: unmask(form.telefone),
      cep: form.cep.replace(/\D/g, ''),
    };
    try {
      if (editingId) {
        await api.put(`/suppliers/${editingId}`, payload);
      } else {
        await api.post('/suppliers', payload);
      }
      closeForm();
      load();
    } catch (err) {
      setErrors({ geral: err.response?.data?.detail || 'Erro ao salvar fornecedor' });
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ nome: '', cnpj_cpf: '', ie_rg: '', telefone: '', email: '', endereco: '', bairro: '', cidade: '', estado: '', cep: '', contato_nome: '', observacoes: '' });
    setErrors({});
  };

  const startEdit = (s) => {
    setForm({
      nome: s.nome,
      cnpj_cpf: formatCPFCNPJ(s.cnpj_cpf || ''),
      ie_rg: s.ie_rg || '',
      telefone: formatPhone(s.telefone || ''),
      email: s.email || '',
      endereco: s.endereco || '',
      bairro: s.bairro || '',
      cidade: s.cidade || '',
      estado: s.estado || '',
      cep: s.cep ? formatCEP(s.cep) : '',
      contato_nome: s.contato_nome || '',
      observacoes: s.observacoes || '',
    });
    setEditingId(s.id);
    setShowForm(true);
    setErrors({});
  };

  const remove = async (id) => {
    if (!window.confirm('Remover fornecedor?')) return;
    setError('');
    try {
      await api.delete(`/suppliers/${id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao remover fornecedor');
    }
  };

  const openNewForm = () => {
    setShowForm(true);
    setEditingId(null);
    setForm({ nome: '', cnpj_cpf: '', ie_rg: '', telefone: '', email: '', endereco: '', bairro: '', cidade: '', estado: '', cep: '', contato_nome: '', observacoes: '' });
    setErrors({});
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Fornecedores</h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">Gerencie seus fornecedores</p>
        </div>
        <button onClick={openNewForm} className="flex items-center gap-2 bg-laranja-600 hover:bg-laranja-700 text-white px-4 py-2.5 md:py-2 rounded-xl md:rounded-lg text-sm font-medium active:scale-95 transition-all shadow-lg shadow-laranja-600/20">
          <Plus size={18} /> <span className="hidden md:inline">Novo</span>
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar por nome ou CNPJ/CPF..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl pl-9 pr-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500"
        />
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl text-sm bg-red-500/10 border border-red-500/30 text-red-400">{error}</div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/60" onClick={closeForm} />
          <div className="relative bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4 md:p-5 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-gray-900 dark:text-white font-semibold text-sm">{editingId ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
              <button type="button" onClick={closeForm} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={save} className="space-y-3">
              <div>
                <input placeholder="Nome do fornecedor" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className={`w-full bg-gray-100 dark:bg-grafite-800 border ${errors.nome ? 'border-red-500' : 'border-gray-300 dark:border-grafite-700'} rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500`} />
                {errors.nome && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.nome}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input placeholder="CNPJ/CPF" value={form.cnpj_cpf} onChange={(e) => setForm({ ...form, cnpj_cpf: formatCPFCNPJ(e.target.value) })} className={`w-full bg-gray-100 dark:bg-grafite-800 border ${errors.cnpj_cpf ? 'border-red-500' : 'border-gray-300 dark:border-grafite-700'} rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500`} />
                  {errors.cnpj_cpf && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.cnpj_cpf}</p>}
                </div>
                <div>
                  <input placeholder="IE/RG" value={form.ie_rg} onChange={(e) => setForm({ ...form, ie_rg: e.target.value })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input placeholder="Telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: formatPhone(e.target.value) })} className={`w-full bg-gray-100 dark:bg-grafite-800 border ${errors.telefone ? 'border-red-500' : 'border-gray-300 dark:border-grafite-700'} rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500`} />
                  {errors.telefone && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.telefone}</p>}
                </div>
                <div>
                  <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500" />
                </div>
              </div>
              <div className="border-t border-gray-200 dark:border-grafite-700 pt-3 mt-3">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Endereço</p>
                <div className="space-y-3">
                  <input placeholder="Endereço" value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500" />
                  <div className="grid grid-cols-2 gap-3">
                    <input placeholder="Bairro" value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500" />
                    <input placeholder="Cidade" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500 appearance-none">
                      <option value="">Estado</option>
                      {ESTADOS.map((uf) => (<option key={uf} value={uf}>{uf}</option>))}
                    </select>
                    <input placeholder="CEP (XXXXX-XXX)" value={form.cep} onChange={(e) => setForm({ ...form, cep: formatCEP(e.target.value) })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500" />
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-200 dark:border-grafite-700 pt-3 mt-3">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Informações Adicionais</p>
                <div className="space-y-3">
                  <input placeholder="Nome do contato" value={form.contato_nome} onChange={(e) => setForm({ ...form, contato_nome: e.target.value })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500" />
                  <textarea placeholder="Observações" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={3} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500 resize-none" />
                </div>
              </div>
              {errors.geral && <p className="text-red-400 text-xs flex items-center gap-1"><AlertCircle size={12} />{errors.geral}</p>}
              <div className="flex gap-2 pt-1">
                <button type="submit" className="flex-1 bg-laranja-600 hover:bg-laranja-700 text-white py-3 rounded-lg text-sm font-medium">Salvar</button>
                <button type="button" onClick={closeForm} className="flex-1 bg-gray-200 dark:bg-grafite-700 hover:bg-gray-300 dark:hover:bg-grafite-600 text-gray-700 dark:text-gray-300 py-3 rounded-lg text-sm">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Carregando...</div>
      ) : displayList.length === 0 ? (
        <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
          {suppliers.length === 0 ? 'Nenhum fornecedor cadastrado' : 'Nenhum fornecedor encontrado para esta busca'}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {displayList.map((s) => {
              const expanded = expandedId === s.id;
              const supplierPurchases = purchases[s.id];
              const loadingPurch = loadingPurchases[s.id];
              return (
                <div key={s.id} className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleExpand(s.id)}
                    className="w-full flex items-center justify-between p-4 text-left active:bg-gray-100 dark:active:bg-grafite-800/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="text-gray-900 dark:text-white font-semibold text-sm md:text-base truncate">{s.nome}</h3>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {s.telefone && <span className="flex items-center gap-1"><Phone size={11} />{formatPhone(s.telefone)}</span>}
                        {s.cnpj_cpf && <span className="flex items-center gap-1"><Fingerprint size={11} />{formatCPFCNPJ(s.cnpj_cpf)}</span>}
                        {s.cidade && <span className="flex items-center gap-1"><MapPin size={11} />{s.cidade}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); startEdit(s); }} className="text-gray-400 dark:text-gray-500 hover:text-laranja-400 p-2 transition-colors">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); remove(s.id); }} className="text-gray-400 dark:text-gray-500 hover:text-red-400 p-2 transition-colors">
                        <Trash2 size={16} />
                      </button>
                      {expanded ? <ChevronUp size={18} className="text-gray-500 dark:text-gray-400" /> : <ChevronDown size={18} className="text-gray-500 dark:text-gray-400" />}
                    </div>
                  </button>

                  {expanded && (
                    <div className="px-4 pb-4 border-t border-gray-200 dark:border-grafite-800 pt-3">
                      <h4 className="text-xs font-medium text-gray-600 dark:text-gray-300 flex items-center gap-1.5 mb-3"><Package2 size={14} /> Compras / Pedidos</h4>
                      {loadingPurch ? (
                        <p className="text-gray-500 dark:text-gray-400 text-xs text-center py-3">Carregando...</p>
                      ) : !supplierPurchases || supplierPurchases.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-xs text-center py-3">Nenhuma compra encontrada</p>
                      ) : (
                        <div className="space-y-2">
                          {supplierPurchases.map((p) => (
                            <div key={p.id} className="bg-gray-50 dark:bg-grafite-800/50 border border-gray-200 dark:border-grafite-700 rounded-lg p-3 flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-gray-900 dark:text-white text-sm font-medium">{formatDate(p.data_pedido)}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">R$ {(p.valor_total ?? 0).toFixed(2)}</p>
                              </div>
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusColors[p.status] || 'bg-gray-500/10 text-gray-400 border-gray-500/30'}`}>
                                {p.status}
                              </span>
                            </div>
                          ))}
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

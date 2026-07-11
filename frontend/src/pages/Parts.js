import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { Plus, Edit3, Trash2, Search } from 'lucide-react';
import Pagination from '../components/Pagination';

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

export default function Parts() {
  const [searchParams] = useSearchParams();
  const [parts, setParts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState(null);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ nome: '', codigo: '', preco_compra: '', preco_venda: '', quantidade: '', estoque_minimo: '0' });

  useEffect(() => { load(); }, [page]);

  const displayList = useMemo(() => {
    const arr = Array.isArray(parts) ? parts : [];
    if (!search) return arr;
    const q = search.toLowerCase();
    return arr.filter(p => p.nome?.toLowerCase().includes(q) || (p.codigo && p.codigo.toLowerCase().includes(q)));
  }, [search, parts]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/parts?skip=${(page - 1) * 20}&limit=20`);
      setParts(data ? (Array.isArray(data) ? data : (data.items || [])) : []);
      setTotal(data ? (Array.isArray(data) ? data.length : (data.total || 0)) : 0);
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao carregar peças'));
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setEdit(null);
    setForm({ nome: '', codigo: '', preco_compra: '', preco_venda: '', quantidade: '', estoque_minimo: '0' });
    setShowForm(true);
  };

  const openEdit = (p) => {
    setEdit(p);
    setForm({ nome: p.nome, codigo: p.codigo || '', preco_compra: String(p.preco_compra), preco_venda: String(p.preco_venda), quantidade: String(p.quantidade), estoque_minimo: String(p.estoque_minimo || 0) });
    setShowForm(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form, preco_compra: parseFloat(form.preco_compra) || 0, preco_venda: parseFloat(form.preco_venda) || 0, quantidade: parseInt(form.quantidade) || 0, estoque_minimo: parseInt(form.estoque_minimo) || 0 };
      if (edit) {
        await api.put(`/parts/${edit.id}`, payload);
      } else {
        await api.post('/parts', payload);
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao salvar peça'));
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Remover peça?')) return;
    setError('');
    try {
      await api.delete(`/parts/${id}`);
      load();
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao remover peça'));
    }
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Peças</h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">Controle de estoque</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-laranja-600 hover:bg-laranja-700 text-white px-4 py-2.5 md:py-2 rounded-xl md:rounded-lg text-sm font-medium active:scale-95 transition-all shadow-lg shadow-laranja-600/20">
          <Plus size={18} /> <span className="hidden md:inline">Nova</span>
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          placeholder="Buscar peças..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl pl-9 pr-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500"
        />
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl text-sm bg-red-500/10 border border-red-500/30 text-red-400">{error}</div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Carregando...</div>
      ) : (
        <>
          {showForm && (
            <form onSubmit={save} className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4 md:p-5 space-y-3">
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Nome da peça</label>
                  <input placeholder="Nome da peça" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500" required />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Código</label>
                  <input placeholder="Código" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Preço Compra (R$)</label>
                    <input placeholder="Preço Compra (R$)" type="number" step="0.01" value={form.preco_compra} onChange={(e) => setForm({ ...form, preco_compra: e.target.value })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Preço Venda (R$)</label>
                    <input placeholder="Preço Venda (R$)" type="number" step="0.01" value={form.preco_venda} onChange={(e) => setForm({ ...form, preco_venda: e.target.value })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Quantidade em estoque</label>
                  <input placeholder="Quantidade em estoque" type="number" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Estoque mínimo</label>
                  <input placeholder="Estoque mínimo" type="number" value={form.estoque_minimo} onChange={(e) => setForm({ ...form, estoque_minimo: e.target.value })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" className="flex-1 bg-laranja-600 hover:bg-laranja-700 text-white py-3 rounded-lg text-sm font-medium">{edit ? 'Atualizar' : 'Salvar'}</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-gray-200 dark:bg-grafite-700 hover:bg-gray-300 dark:hover:bg-grafite-600 text-gray-700 dark:text-gray-300 py-3 rounded-lg text-sm">Cancelar</button>
              </div>
            </form>
          )}
          <div className="space-y-2">
            {displayList.length === 0 ? (
              <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                {search ? 'Nenhuma peça encontrada' : 'Nenhuma peça cadastrada'}
              </div>
            ) : (
              displayList.map((p) => (
                <div key={p.id} className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4 flex items-center gap-3 active:bg-gray-100 dark:active:bg-grafite-800/30 transition-colors">
                  <div className={`w-2 h-10 rounded-full flex-shrink-0 ${(p.quantidade ?? 0) <= 0 ? 'bg-red-500' : (p.quantidade ?? 0) <= 5 ? 'bg-laranja-500' : 'bg-green-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 dark:text-white text-sm font-medium truncate">{p.nome}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{p.codigo || 'Sem código'}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Compra: R$ {(p.preco_compra ?? 0).toFixed(2)}</span>
                      <span className="text-xs font-medium text-laranja-600 dark:text-laranja-400">Venda: R$ {(p.preco_venda ?? 0).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs font-bold ${(p.quantidade ?? 0) <= 0 ? 'text-red-400' : (p.quantidade ?? 0) <= 5 ? 'text-laranja-500 dark:text-laranja-400' : 'text-green-400'}`}>
                      {p.quantidade ?? 0} un
                    </span>
                    {(p.estoque_minimo > 0 && (p.quantidade ?? 0) <= p.estoque_minimo) && (
                      <span className="text-[10px] text-red-400 font-medium">⚠️ Abaixo do mínimo</span>
                    )}
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(p)} className="text-gray-400 dark:text-gray-500 hover:text-laranja-400 p-1.5"><Edit3 size={14} /></button>
                      <button onClick={() => remove(p.id)} className="text-gray-400 dark:text-gray-500 hover:text-red-400 p-1.5"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

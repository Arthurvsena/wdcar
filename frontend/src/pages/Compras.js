import React, { useState, useEffect } from 'react';
import api from '../api';
import { ShoppingCart, Plus, X } from 'lucide-react';
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

export default function Compras() {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [parts, setParts] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ supplier_id: '', part_id: '', descricao: '', quantidade: 1, valor_unitario: '' });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/purchases', { params: { skip: (page - 1) * 20, limit: 20 } });
      setPurchases(data?.items || []);
      setTotal(data?.total || 0);
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao carregar compras'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page]);

  useEffect(() => {
    api.get('/suppliers', { params: { skip: 0, limit: 999 } }).then(({ data }) => setSuppliers(data?.items || [])).catch(() => {});
    api.get('/parts', { params: { skip: 0, limit: 999 } }).then(({ data }) => setParts(data?.items || [])).catch(() => {});
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.supplier_id) { setError('Selecione um fornecedor'); return; }
    setSaving(true);
    try {
      await api.post('/purchases', {
        supplier_id: parseInt(form.supplier_id),
        part_id: form.part_id ? parseInt(form.part_id) : null,
        descricao: form.descricao,
        quantidade: parseInt(form.quantidade) || 1,
        valor_unitario: parseFloat(form.valor_unitario) || 0,
      });
      setShowForm(false);
      setForm({ supplier_id: '', part_id: '', descricao: '', quantidade: 1, valor_unitario: '' });
      load();
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao registrar compra'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShoppingCart size={22} className="text-laranja-600 dark:text-laranja-400" /> Compras
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">Registro de compras de peças junto a fornecedores</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-laranja-600 hover:bg-laranja-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
          {showForm ? <X size={18} /> : <Plus size={18} />} <span className="hidden md:inline">{showForm ? 'Cancelar' : 'Nova Compra'}</span>
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl text-sm bg-red-500/10 border border-red-500/30 text-red-400">{error}</div>
      )}

      {showForm && (
        <form onSubmit={save} className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4 md:p-5 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Fornecedor</label>
              <select value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500" required>
                <option value="">Fornecedor...</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Peça (opcional)</label>
              <select value={form.part_id} onChange={(e) => setForm({ ...form, part_id: e.target.value })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500">
                <option value="">Peça (opcional)...</option>
                {parts.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Descrição</label>
              <input placeholder="Descrição" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Quantidade</label>
              <input placeholder="Quantidade" type="number" min="1" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500" required />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Valor unitário (R$)</label>
              <input placeholder="Valor unitário (R$)" type="number" step="0.01" min="0" value={form.valor_unitario} onChange={(e) => setForm({ ...form, valor_unitario: e.target.value })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500" required />
            </div>
          </div>
          <button type="submit" disabled={saving} className="w-full bg-laranja-600 hover:bg-laranja-700 disabled:opacity-50 text-white py-3 rounded-lg text-sm font-medium">
            {saving ? 'Salvando...' : 'Registrar Compra'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Carregando...</div>
      ) : purchases.length === 0 ? (
        <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Nenhuma compra registrada</div>
      ) : (
        <div className="space-y-2">
          {purchases.map((p) => (
            <div key={p.id} className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 dark:text-white text-sm font-medium truncate">{p.descricao || `Compra #${p.id}`}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{p.quantidade}x · {new Date(p.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-white">R$ {p.valor_total.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
      <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} />
    </div>
  );
}

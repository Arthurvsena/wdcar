import React, { useState, useEffect } from 'react';
import api from '../api';
import { Truck, Plus, X, Pencil, Trash2, Phone, Mail } from 'lucide-react';
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

export default function Fornecedores() {
  const [suppliers, setSuppliers] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ nome: '', cnpj_cpf: '', telefone: '', email: '', endereco: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/suppliers', { params: { skip: (page - 1) * 20, limit: 20 } });
      setSuppliers(data?.items || []);
      setTotal(data?.total || 0);
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao carregar fornecedores'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page]);

  const resetForm = () => setForm({ nome: '', cnpj_cpf: '', telefone: '', email: '', endereco: '' });

  const startEdit = (s) => {
    setForm({ nome: s.nome, cnpj_cpf: s.cnpj_cpf || '', telefone: s.telefone || '', email: s.email || '', endereco: s.endereco || '' });
    setEditingId(s.id);
    setShowForm(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) return;
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await api.put(`/suppliers/${editingId}`, form);
      } else {
        await api.post('/suppliers', form);
      }
      setShowForm(false);
      setEditingId(null);
      resetForm();
      load();
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao salvar fornecedor'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Remover este fornecedor?')) return;
    try {
      await api.delete(`/suppliers/${id}`);
      load();
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao remover fornecedor'));
    }
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Truck size={22} className="text-laranja-600 dark:text-laranja-400" /> Fornecedores
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">Cadastro de fornecedores de peças</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); resetForm(); }} className="flex items-center gap-2 bg-laranja-600 hover:bg-laranja-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
          {showForm ? <X size={18} /> : <Plus size={18} />} <span className="hidden md:inline">{showForm ? 'Cancelar' : 'Novo Fornecedor'}</span>
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl text-sm bg-red-500/10 border border-red-500/30 text-red-400">{error}</div>
      )}

      {showForm && (
        <form onSubmit={save} className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4 md:p-5 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Nome</label>
              <input placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500" required />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">CNPJ/CPF</label>
              <input placeholder="CNPJ/CPF" value={form.cnpj_cpf} onChange={(e) => setForm({ ...form, cnpj_cpf: e.target.value })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Telefone</label>
              <input placeholder="Telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Email</label>
              <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Endereço</label>
              <input placeholder="Endereço" value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500" />
            </div>
          </div>
          <button type="submit" disabled={saving} className="w-full bg-laranja-600 hover:bg-laranja-700 disabled:opacity-50 text-white py-3 rounded-lg text-sm font-medium">
            {saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Carregando...</div>
      ) : suppliers.length === 0 ? (
        <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Nenhum fornecedor cadastrado</div>
      ) : (
        <div className="space-y-2">
          {suppliers.map((s) => (
            <div key={s.id} className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 dark:text-white text-sm font-medium truncate">{s.nome}</p>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {s.telefone && <span className="flex items-center gap-1"><Phone size={12} /> {s.telefone}</span>}
                  {s.email && <span className="flex items-center gap-1"><Mail size={12} /> {s.email}</span>}
                </div>
              </div>
              <button onClick={() => startEdit(s)} className="text-gray-400 dark:text-gray-500 hover:text-laranja-400 p-1.5"><Pencil size={14} /></button>
              <button onClick={() => remove(s.id)} className="text-gray-400 dark:text-gray-500 hover:text-red-400 p-1.5"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
      <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} />
    </div>
  );
}

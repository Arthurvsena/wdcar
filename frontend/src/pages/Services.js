import React, { useState, useEffect } from 'react';
import api from '../api';
import { Plus, Edit3, Trash2, Search } from 'lucide-react';

export default function Services() {
  const [services, setServices] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ nome: '', descricao: '', valor_mao_obra: '' });

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!search) { setFiltered(services); return; }
    setFiltered(services.filter(s => s.nome.toLowerCase().includes(search.toLowerCase())));
  }, [search, services]);

  const load = async () => {
    const { data } = await api.get('/services');
    setServices(data);
    setFiltered(data);
  };

  const openNew = () => {
    setEdit(null);
    setForm({ nome: '', descricao: '', valor_mao_obra: '' });
    setShowForm(true);
  };

  const openEdit = (s) => {
    setEdit(s);
    setForm({ nome: s.nome, descricao: s.descricao || '', valor_mao_obra: String(s.valor_mao_obra) });
    setShowForm(true);
  };

  const save = async (e) => {
    e.preventDefault();
    const payload = { ...form, valor_mao_obra: parseFloat(form.valor_mao_obra) || 0 };
    if (edit) {
      await api.put(`/services/${edit.id}`, payload);
    } else {
      await api.post('/services', payload);
    }
    setShowForm(false);
    load();
  };

  const remove = async (id) => {
    if (!window.confirm('Remover serviço?')) return;
    await api.delete(`/services/${id}`);
    load();
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Serviços</h1>
          <p className="text-gray-400 text-xs md:text-sm">Catálogo de serviços e mão de obra</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-laranja-600 hover:bg-laranja-700 text-white px-4 py-2.5 md:py-2 rounded-xl md:rounded-lg text-sm font-medium active:scale-95 transition-all shadow-lg shadow-laranja-600/20">
          <Plus size={18} /> <span className="hidden md:inline">Novo</span>
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          placeholder="Buscar serviços..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-grafite-900 border border-grafite-800 rounded-xl pl-9 pr-4 py-3 text-white text-sm focus:outline-none focus:border-laranja-500"
        />
      </div>

      {showForm && (
        <form onSubmit={save} className="bg-grafite-900 border border-grafite-800 rounded-xl p-4 md:p-5 space-y-3">
          <div className="space-y-3">
            <input placeholder="Nome do serviço" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="w-full bg-grafite-800 border border-grafite-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-laranja-500" required />
            <input placeholder="Descrição" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="w-full bg-grafite-800 border border-grafite-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-laranja-500" />
            <input placeholder="Valor mão de obra (R$)" type="number" step="0.01" value={form.valor_mao_obra} onChange={(e) => setForm({ ...form, valor_mao_obra: e.target.value })} className="w-full bg-grafite-800 border border-grafite-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-laranja-500" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="flex-1 bg-laranja-600 hover:bg-laranja-700 text-white py-3 rounded-lg text-sm font-medium">{edit ? 'Atualizar' : 'Salvar'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-grafite-700 hover:bg-grafite-600 text-gray-300 py-3 rounded-lg text-sm">Cancelar</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="bg-grafite-900 border border-grafite-800 rounded-xl p-8 text-center text-gray-500 text-sm">
            {search ? 'Nenhum serviço encontrado' : 'Nenhum serviço cadastrado'}
          </div>
        )}
        {filtered.map((s) => (
          <div key={s.id} className="bg-grafite-900 border border-grafite-800 rounded-xl p-4 flex items-center gap-3 active:bg-grafite-800/30 transition-colors">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-blue-400 text-lg font-bold">{s.nome.charAt(0)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{s.nome}</p>
              <p className="text-xs text-gray-400 truncate">{s.descricao || 'Sem descrição'}</p>
              <p className="text-xs font-medium text-laranja-400 mt-0.5">R$ {s.valor_mao_obra.toFixed(2)}</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => openEdit(s)} className="text-gray-500 hover:text-laranja-400 p-1.5"><Edit3 size={14} /></button>
              <button onClick={() => remove(s.id)} className="text-gray-500 hover:text-red-400 p-1.5"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

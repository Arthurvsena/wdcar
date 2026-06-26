import React, { useState, useEffect } from 'react';
import api from '../api';
import { Plus, Trash2, Car, ChevronDown, ChevronUp, Phone, Mail, Fingerprint } from 'lucide-react';

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [form, setForm] = useState({ nome: '', cpf_cnpj: '', telefone: '', email: '' });
  const [addVehFor, setAddVehFor] = useState(null);
  const [vehForm, setVehForm] = useState({ placa: '', modelo: '', marca: '', ano: '', cor: '' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await api.get('/clients');
    setClients(data);
  };

  const save = async (e) => {
    e.preventDefault();
    await api.post('/clients', form);
    setShowForm(false);
    setForm({ nome: '', cpf_cnpj: '', telefone: '', email: '' });
    load();
  };

  const remove = async (id) => {
    if (!window.confirm('Remover cliente e todos os veículos?')) return;
    await api.delete(`/clients/${id}`);
    load();
  };

  const addVehicle = async (clienteId) => {
    if (!vehForm.modelo || !vehForm.marca) return;
    await api.post(`/clients/${clienteId}/vehicles`, {
      ...vehForm,
      ano: vehForm.ano ? parseInt(vehForm.ano) : null,
    });
    setAddVehFor(null);
    setVehForm({ placa: '', modelo: '', marca: '', ano: '', cor: '' });
    load();
  };

  const removeVehicle = async (clienteId, vehicleId) => {
    if (!window.confirm('Remover veículo?')) return;
    await api.delete(`/clients/${clienteId}/vehicles/${vehicleId}`);
    load();
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Clientes</h1>
          <p className="text-gray-400 text-xs md:text-sm">Gerencie sua base de clientes</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-laranja-600 hover:bg-laranja-700 text-white px-4 py-2.5 md:py-2 rounded-xl md:rounded-lg text-sm font-medium active:scale-95 transition-all shadow-lg shadow-laranja-600/20">
          <Plus size={18} /> <span className="hidden md:inline">Novo</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={save} className="bg-grafite-900 border border-grafite-800 rounded-xl p-4 md:p-5 space-y-3">
          <div className="space-y-3">
            <input placeholder="Nome do cliente" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="w-full bg-grafite-800 border border-grafite-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-laranja-500" required />
            <input placeholder="CPF/CNPJ" value={form.cpf_cnpj} onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })} className="w-full bg-grafite-800 border border-grafite-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-laranja-500" />
            <input placeholder="Telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="w-full bg-grafite-800 border border-grafite-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-laranja-500" />
            <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-grafite-800 border border-grafite-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-laranja-500" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="flex-1 bg-laranja-600 hover:bg-laranja-700 text-white py-3 rounded-lg text-sm font-medium">Salvar</button>
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-grafite-700 hover:bg-grafite-600 text-gray-300 py-3 rounded-lg text-sm">Cancelar</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {clients.map((cli) => {
          const expanded = expandedId === cli.id;
          return (
            <div key={cli.id} className="bg-grafite-900 border border-grafite-800 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedId(expanded ? null : cli.id)}
                className="w-full flex items-center justify-between p-4 text-left active:bg-grafite-800/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-sm md:text-base truncate">{cli.nome}</h3>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400 mt-0.5">
                    {cli.telefone && <span className="flex items-center gap-1"><Phone size={11} />{cli.telefone}</span>}
                    {cli.cpf_cnpj && <span className="flex items-center gap-1"><Fingerprint size={11} />{cli.cpf_cnpj}</span>}
                    {cli.email && <span className="flex items-center gap-1"><Mail size={11} />{cli.email}</span>}
                  </div>
                  {cli.vehicles?.length > 0 && (
                    <span className="text-xs text-laranja-400/70 mt-1 inline-block">{cli.vehicles.length} veículo(s)</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); remove(cli.id); }}
                    className="text-gray-500 hover:text-red-400 p-2 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                  {expanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </div>
              </button>

              {expanded && (
                <div className="px-4 pb-4 border-t border-grafite-800 pt-3">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-medium text-gray-300 flex items-center gap-1.5"><Car size={14} /> Veículos</h4>
                    <button
                      onClick={() => setAddVehFor(addVehFor === cli.id ? null : cli.id)}
                      className="text-xs text-laranja-400 hover:text-laranja-300 font-medium"
                    >
                      {addVehFor === cli.id ? 'Cancelar' : '+ Adicionar'}
                    </button>
                  </div>

                  {addVehFor === cli.id && (
                    <div className="space-y-2 mb-3 bg-grafite-800/50 rounded-lg p-3">
                      <div className="grid grid-cols-2 gap-2">
                        <input placeholder="Marca" value={vehForm.marca} onChange={(e) => setVehForm({ ...vehForm, marca: e.target.value })} className="col-span-2 bg-grafite-800 border border-grafite-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-laranja-500" />
                        <input placeholder="Modelo" value={vehForm.modelo} onChange={(e) => setVehForm({ ...vehForm, modelo: e.target.value })} className="col-span-2 bg-grafite-800 border border-grafite-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-laranja-500" />
                        <input placeholder="Placa" value={vehForm.placa} onChange={(e) => setVehForm({ ...vehForm, placa: e.target.value })} className="bg-grafite-800 border border-grafite-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-laranja-500" />
                        <input placeholder="Ano" value={vehForm.ano} onChange={(e) => setVehForm({ ...vehForm, ano: e.target.value })} className="bg-grafite-800 border border-grafite-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-laranja-500" />
                        <input placeholder="Cor" value={vehForm.cor} onChange={(e) => setVehForm({ ...vehForm, cor: e.target.value })} className="bg-grafite-800 border border-grafite-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-laranja-500" />
                      </div>
                      <button onClick={() => addVehicle(cli.id)} className="w-full bg-laranja-600 text-white py-2.5 rounded-lg text-sm font-medium">Adicionar Veículo</button>
                    </div>
                  )}

                  {(!cli.vehicles || cli.vehicles.length === 0) && addVehFor !== cli.id && (
                    <p className="text-gray-500 text-xs text-center py-3">Nenhum veículo cadastrado</p>
                  )}
                  <div className="space-y-2">
                    {cli.vehicles?.map((v) => (
                      <div key={v.id} className="bg-grafite-800/50 border border-grafite-700 rounded-lg p-3 flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{v.marca} {v.modelo}</p>
                          <p className="text-xs text-gray-400 truncate">
                            {v.placa && <span className="uppercase font-mono">{v.placa}</span>}
                            {v.ano && <span> - {v.ano}</span>}
                            {v.cor && <span> - {v.cor}</span>}
                          </p>
                        </div>
                        <button onClick={() => removeVehicle(cli.id, v.id)} className="text-gray-500 hover:text-red-400 p-2 ml-2">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

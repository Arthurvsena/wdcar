import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { Plus, Trash2, Car, ChevronDown, ChevronUp, Phone, Mail, Fingerprint, Search, AlertCircle, Pencil } from 'lucide-react';
import { formatCPFCNPJ, isValidCPFCNPJ, isValidEmail, unmask, formatPlate, formatPhone } from '../utils/validators';
import { searchBrands, getModels } from '../utils/carData';

const CURRENT_YEAR = new Date().getFullYear();

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [form, setForm] = useState({ nome: '', cpf_cnpj: '', telefone: '', email: '' });
  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editingVehId, setEditingVehId] = useState(null);
  const [addVehFor, setAddVehFor] = useState(null);
  const [vehError, setVehError] = useState('');
  const [vehForm, setVehForm] = useState({ placa: '', modelo: '', marca: '', ano: '', cor: '' });
  const [brandQuery, setBrandQuery] = useState('');
  const [modelQuery, setModelQuery] = useState('');
  const [showBrandList, setShowBrandList] = useState(false);
  const [modelFocused, setModelFocused] = useState(false);
  const brandRef = useRef(null);
  const modelRef = useRef(null);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    function handleClick(e) {
      if (brandRef.current && !brandRef.current.contains(e.target)) setShowBrandList(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const load = async () => {
    const { data } = await api.get('/clients');
    setClients(data);
  };

  const validateField = (field) => {
    const errs = { ...errors };
    if (field === 'cpf_cnpj') {
      if (!form.cpf_cnpj || unmask(form.cpf_cnpj).length === 0) {
        errs.cpf_cnpj = 'CPF/CNPJ é obrigatório';
      } else if (!isValidCPFCNPJ(form.cpf_cnpj)) {
        errs.cpf_cnpj = 'CPF ou CNPJ inválido';
      } else if (checkClientDuplicate('cpf_cnpj', form.cpf_cnpj)) {
        errs.cpf_cnpj = 'CPF/CNPJ já cadastrado';
      } else {
        delete errs.cpf_cnpj;
      }
    }
    if (field === 'telefone') {
      if (!form.telefone.trim()) {
        errs.telefone = 'Telefone é obrigatório';
      } else if (checkClientDuplicate('telefone', form.telefone)) {
        errs.telefone = 'Telefone já cadastrado';
      } else {
        delete errs.telefone;
      }
    }
    if (field === 'email') {
      if (!form.email.trim()) {
        errs.email = 'Email é obrigatório';
      } else if (!isValidEmail(form.email)) {
        errs.email = 'Email inválido';
      } else if (checkClientDuplicate('email', form.email)) {
        errs.email = 'Email já cadastrado';
      } else {
        delete errs.email;
      }
    }
    setErrors(errs);
  };

  const checkClientDuplicate = (field, value) => {
    return clients.some((c) => {
      if (editingId && c.id === editingId) return false;
      if (!c[field]) return false;
      if (field === 'email') return c[field].toLowerCase() === value.toLowerCase();
      return unmask(c[field]) === unmask(value);
    });
  };

  const validateForm = () => {
    const errs = {};
    if (!form.nome.trim()) errs.nome = 'Nome é obrigatório';
    if (!form.cpf_cnpj || unmask(form.cpf_cnpj).length === 0) {
      errs.cpf_cnpj = 'CPF/CNPJ é obrigatório';
    } else if (!isValidCPFCNPJ(form.cpf_cnpj)) {
      errs.cpf_cnpj = 'CPF ou CNPJ inválido';
    } else if (checkClientDuplicate('cpf_cnpj', form.cpf_cnpj)) {
      errs.cpf_cnpj = 'CPF/CNPJ já cadastrado';
    }
    if (!form.telefone.trim()) errs.telefone = 'Telefone é obrigatório';
    else if (checkClientDuplicate('telefone', form.telefone)) {
      errs.telefone = 'Telefone já cadastrado';
    }
    if (!form.email.trim()) {
      errs.email = 'Email é obrigatório';
    } else if (!isValidEmail(form.email)) {
      errs.email = 'Email inválido';
    } else if (checkClientDuplicate('email', form.email)) {
      errs.email = 'Email já cadastrado';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const save = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    const payload = { ...form, cpf_cnpj: unmask(form.cpf_cnpj), telefone: unmask(form.telefone) };
    try {
      if (editingId) {
        await api.put(`/clients/${editingId}`, payload);
      } else {
        await api.post('/clients', payload);
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ nome: '', cpf_cnpj: '', telefone: '', email: '' });
      setErrors({});
      load();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Erro ao salvar cliente';
      setErrors({ geral: msg });
    }
  };

  const startEdit = (cli) => {
    setForm({
      nome: cli.nome,
      cpf_cnpj: formatCPFCNPJ(cli.cpf_cnpj || ''),
      telefone: formatPhone(cli.telefone || ''),
      email: cli.email || '',
    });
    setEditingId(cli.id);
    setShowForm(true);
    setErrors({});
  };

  const remove = async (id) => {
    if (!window.confirm('Remover cliente e todos os veículos?')) return;
    await api.delete(`/clients/${id}`);
    load();
  };

  const checkPlateDuplicate = (plate) => {
    const raw = plate.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    return clients.some((c) =>
      c.vehicles?.some((v) => {
        if (editingVehId && v.id === editingVehId) return false;
        if (!v.placa) return false;
        return v.placa.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === raw;
      })
    );
  };

  const addVehicle = async (clienteId) => {
    if (!vehForm.marca || !vehForm.modelo || !vehForm.placa || !vehForm.ano || !vehForm.cor) return;
    const anoNum = parseInt(vehForm.ano);
    if (anoNum < 1900 || anoNum > CURRENT_YEAR) { setVehError(`Ano inválido (1900-${CURRENT_YEAR})`); return; }
    const payload = { ...vehForm, ano: anoNum };
    if (checkPlateDuplicate(vehForm.placa)) {
      setVehError('Placa já cadastrada');
      return;
    }
    try {
      if (editingVehId) {
        await api.put(`/clients/${clienteId}/vehicles/${editingVehId}`, payload);
      } else {
        await api.post(`/clients/${clienteId}/vehicles`, payload);
      }
      setAddVehFor(null);
      setEditingVehId(null);
      setVehForm({ placa: '', modelo: '', marca: '', ano: '', cor: '' });
      setBrandQuery('');
      setModelQuery('');
      setVehError('');
      load();
    } catch (err) {
      setVehError(err.response?.data?.detail || 'Erro ao salvar veículo');
    }
  };

  const startEditVehicle = (veh, clienteId) => {
    setVehForm({
      placa: formatPlate(veh.placa || ''),
      modelo: veh.modelo,
      marca: veh.marca,
      ano: veh.ano ? String(veh.ano) : '',
      cor: veh.cor ? veh.cor.charAt(0).toUpperCase() + veh.cor.slice(1) : '',
    });
    setBrandQuery(veh.marca);
    setModelQuery(veh.modelo);
    setEditingVehId(veh.id);
    setAddVehFor(clienteId);
  };

  const removeVehicle = async (clienteId, vehicleId) => {
    if (!window.confirm('Remover veículo?')) return;
    await api.delete(`/clients/${clienteId}/vehicles/${vehicleId}`);
    load();
  };

  const selectBrand = (brand) => {
    setVehForm({ ...vehForm, marca: brand, modelo: '' });
    setBrandQuery(brand);
    setModelQuery('');
    setShowBrandList(false);
  };

  const selectModel = (model) => {
    setVehForm({ ...vehForm, modelo: model });
    setModelQuery(model);
    setModelFocused(false);
  };

  const brandResults = showBrandList && brandQuery.length >= 1 ? searchBrands(brandQuery) : [];
  const models = getModels(vehForm.marca);
  const filteredModels = modelFocused && modelQuery.length >= 1
    ? models.filter((m) => m.toLowerCase().includes(modelQuery.toLowerCase()))
    : [];

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Clientes</h1>
          <p className="text-gray-400 text-xs md:text-sm">Gerencie sua base de clientes</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ nome: '', cpf_cnpj: '', telefone: '', email: '' }); setErrors({}); }} className="flex items-center gap-2 bg-laranja-600 hover:bg-laranja-700 text-white px-4 py-2.5 md:py-2 rounded-xl md:rounded-lg text-sm font-medium active:scale-95 transition-all shadow-lg shadow-laranja-600/20">
          <Plus size={18} /> <span className="hidden md:inline">Novo</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={save} className="bg-grafite-900 border border-grafite-800 rounded-xl p-4 md:p-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-white font-semibold text-sm">{editingId ? 'Editar Cliente' : 'Novo Cliente'}</h2>
          </div>
          <div className="space-y-3">
            <div>
              <input placeholder="Nome do cliente" value={form.nome} onChange={(e) => { setForm({ ...form, nome: e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '') }); if (errors.nome) setErrors({ ...errors, nome: undefined }); }} onBlur={() => { if (!form.nome.trim()) setErrors({ ...errors, nome: 'Nome é obrigatório' }); else setErrors({ ...errors, nome: undefined }); }} className={`w-full bg-grafite-800 border ${errors.nome ? 'border-red-500' : 'border-grafite-700'} rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-laranja-500`} />
              {errors.nome && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.nome}</p>}
            </div>
            <div>
              <input placeholder="CPF/CNPJ" value={form.cpf_cnpj} onChange={(e) => setForm({ ...form, cpf_cnpj: formatCPFCNPJ(e.target.value) })} onBlur={() => validateField('cpf_cnpj')} className={`w-full bg-grafite-800 border ${errors.cpf_cnpj ? 'border-red-500' : 'border-grafite-700'} rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-laranja-500`} />
              {errors.cpf_cnpj && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.cpf_cnpj}</p>}
            </div>
            <div>
              <input placeholder="Telefone ((00) 9 0000-0000)" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: formatPhone(e.target.value) })} onBlur={() => validateField('telefone')} className={`w-full bg-grafite-800 border ${errors.telefone ? 'border-red-500' : 'border-grafite-700'} rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-laranja-500`} />
              {errors.telefone && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.telefone}</p>}
            </div>
            <div>
              <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} onBlur={() => validateField('email')} className={`w-full bg-grafite-800 border ${errors.email ? 'border-red-500' : 'border-grafite-700'} rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-laranja-500`} />
              {errors.email && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.email}</p>}
            </div>
          </div>
          {errors.geral && <p className="text-red-400 text-xs flex items-center gap-1"><AlertCircle size={12} />{errors.geral}</p>}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={!form.nome.trim() || !form.cpf_cnpj || !form.telefone.trim() || !form.email.trim()} className="flex-1 bg-laranja-600 hover:bg-laranja-700 text-white py-3 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed">Salvar</button>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setErrors({}); }} className="flex-1 bg-grafite-700 hover:bg-grafite-600 text-gray-300 py-3 rounded-lg text-sm">Cancelar</button>
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
                    {cli.telefone && <span className="flex items-center gap-1"><Phone size={11} />{formatPhone(cli.telefone)}</span>}
                    {cli.cpf_cnpj && <span className="flex items-center gap-1"><Fingerprint size={11} />{formatCPFCNPJ(cli.cpf_cnpj)}</span>}
                    {cli.email && <span className="flex items-center gap-1"><Mail size={11} />{cli.email}</span>}
                  </div>
                  {cli.vehicles?.length > 0 && (
                    <span className="text-xs text-laranja-400/70 mt-1 inline-block">{cli.vehicles.length} veículo(s)</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); startEdit(cli); }}
                    className="text-gray-500 hover:text-laranja-400 p-2 transition-colors"
                  >
                    <Pencil size={16} />
                  </button>
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
                      onClick={() => {
                        if (addVehFor === cli.id) {
                          setAddVehFor(null); setEditingVehId(null); setVehForm({ placa: '', modelo: '', marca: '', ano: '', cor: '' }); setBrandQuery(''); setModelQuery(''); setVehError('');
                        } else {
                          setAddVehFor(cli.id);
                        }
                      }}
                      className="text-xs text-laranja-400 hover:text-laranja-300 font-medium"
                    >
                      {addVehFor === cli.id ? 'Cancelar' : '+ Adicionar'}
                    </button>
                  </div>

                  {addVehFor === cli.id && (
                    <div className="space-y-2 mb-3 bg-grafite-800/50 rounded-lg p-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="col-span-2 relative" ref={brandRef}>
                          <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <input
                              placeholder="Marca"
                              value={brandQuery}
                              onFocus={() => setShowBrandList(true)}
                              onChange={(e) => { setBrandQuery(e.target.value); setVehForm({ ...vehForm, marca: e.target.value, modelo: '' }); setModelQuery(''); setShowBrandList(true); }}
                              className="w-full bg-grafite-800 border border-grafite-700 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:border-laranja-500"
                            />
                          </div>
                          {brandResults.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-grafite-800 border border-grafite-700 rounded-lg max-h-40 overflow-y-auto shadow-xl">
                              {brandResults.map((b) => (
                                <button key={b} type="button" onMouseDown={() => selectBrand(b)} className="w-full text-left px-3 py-2 text-white text-sm hover:bg-laranja-600/30 transition-colors">{b}</button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="col-span-2 relative" ref={modelRef}>
                          <input
                            placeholder="Modelo"
                            value={modelQuery}
                            onFocus={() => setModelFocused(true)}
                            onBlur={() => setTimeout(() => setModelFocused(false), 200)}
                            onChange={(e) => { setModelQuery(e.target.value); setVehForm({ ...vehForm, modelo: e.target.value }); }}
                            disabled={!vehForm.marca}
                            className="w-full bg-grafite-800 border border-grafite-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-laranja-500 disabled:opacity-40"
                          />
                          {filteredModels.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-grafite-800 border border-grafite-700 rounded-lg max-h-40 overflow-y-auto shadow-xl">
                              {filteredModels.map((m) => (
                                <button key={m} type="button" onMouseDown={() => selectModel(m)} className="w-full text-left px-3 py-2 text-white text-sm hover:bg-laranja-600/30 transition-colors">{m}</button>
                              ))}
                            </div>
                          )}
                        </div>
                        <input placeholder="Placa (XXX-0000)" value={vehForm.placa} onChange={(e) => setVehForm({ ...vehForm, placa: formatPlate(e.target.value) })} onBlur={() => { if (vehForm.placa && checkPlateDuplicate(vehForm.placa)) setVehError('Placa já cadastrada'); else setVehError(''); }} className="bg-grafite-800 border border-grafite-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-laranja-500 uppercase" />
                        <input placeholder={`Ano (1900-${CURRENT_YEAR})`} value={vehForm.ano} onChange={(e) => setVehForm({ ...vehForm, ano: e.target.value.replace(/\D/g, '').slice(0, 4) })} onBlur={() => { const a = parseInt(vehForm.ano); if (vehForm.ano.length === 4 && (a < 1900 || a > CURRENT_YEAR)) setVehError(`Ano inválido (1900-${CURRENT_YEAR})`); else setVehError(''); }} className="bg-grafite-800 border border-grafite-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-laranja-500" />
                        <input placeholder="Cor" value={vehForm.cor} onChange={(e) => setVehForm({ ...vehForm, cor: e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '') })} onBlur={() => { if (vehForm.cor) setVehForm({ ...vehForm, cor: vehForm.cor.charAt(0).toUpperCase() + vehForm.cor.slice(1) }); }} className="bg-grafite-800 border border-grafite-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-laranja-500" />
                      </div>
                      {vehError && <p className="text-red-400 text-xs flex items-center gap-1"><AlertCircle size={12} />{vehError}</p>}
                      <button onClick={() => addVehicle(cli.id)} disabled={!vehForm.marca || !vehForm.modelo || !vehForm.placa || !vehForm.ano || !vehForm.cor} className="w-full bg-laranja-600 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed">{editingVehId ? 'Salvar Veículo' : 'Adicionar Veículo'}</button>
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
                            {v.placa && <span className="uppercase font-mono">Placa: {v.placa}</span>}
                            {v.ano && <span> - Ano: {v.ano}</span>}
                            {v.cor && <span> - Cor: {v.cor.charAt(0).toUpperCase() + v.cor.slice(1)}</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => startEditVehicle(v, cli.id)} className="text-gray-500 hover:text-laranja-400 p-1.5 transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => removeVehicle(cli.id, v.id)} className="text-gray-500 hover:text-red-400 p-1.5 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
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

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Car, FileText, Package2 } from 'lucide-react';
import api from '../api';

const GRUPOS = [
  { key: 'clientes', label: 'Clientes', icon: Users },
  { key: 'veiculos', label: 'Veículos', icon: Car },
  { key: 'ordens', label: 'Ordens de Serviço', icon: FileText },
  { key: 'pecas', label: 'Peças', icon: Package2 },
];

function itemLabel(grupo, item) {
  switch (grupo) {
    case 'clientes':
      return { title: item.nome, subtitle: item.telefone || '' };
    case 'veiculos':
      return { title: `${item.modelo}${item.placa ? ` • ${item.placa.toUpperCase()}` : ''}`, subtitle: item.cliente || '' };
    case 'ordens':
      return { title: `OS #${item.id} - ${item.cliente || ''}`, subtitle: `${item.veiculo || ''}${item.placa ? ` • ${item.placa.toUpperCase()}` : ''}` };
    case 'pecas':
      return { title: item.nome, subtitle: `${item.codigo ? `${item.codigo} • ` : ''}${item.quantidade} un.` };
    default:
      return { title: '', subtitle: '' };
  }
}

function itemPath(grupo, item) {
  switch (grupo) {
    case 'clientes':
      return `/clientes?q=${encodeURIComponent(item.nome)}`;
    case 'veiculos':
      return item.placa ? `/historico?placa=${encodeURIComponent(item.placa)}` : '/historico';
    case 'ordens':
      return `/os/${item.id}`;
    case 'pecas':
      return `/pecas?q=${encodeURIComponent(item.nome)}`;
    default:
      return '/';
  }
}

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // lista plana para navegação por teclado
  const flat = useMemo(() => {
    if (!results) return [];
    const list = [];
    GRUPOS.forEach((g) => {
      (results[g.key] || []).forEach((item) => list.push({ grupo: g.key, item }));
    });
    return list;
  }, [results]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults(null);
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/search?q=${encodeURIComponent(query.trim())}`);
        setResults(data);
        setSelected(0);
      } catch (e) {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, open]);

  const go = useCallback((entry) => {
    onClose();
    navigate(itemPath(entry.grupo, entry.item));
  }, [navigate, onClose]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter' && flat[selected]) {
      e.preventDefault();
      go(flat[selected]);
    }
  };

  if (!open) return null;

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-[90] bg-black/60 flex items-start justify-center pt-[15vh] px-4" onMouseDown={onClose}>
      <div
        className="w-full max-w-lg bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-700 rounded-2xl shadow-2xl overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 border-b border-gray-200 dark:border-grafite-800">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar cliente, placa, OS (#12), peça..."
            className="flex-1 bg-transparent py-4 text-sm text-gray-900 dark:text-white focus:outline-none placeholder:text-gray-400"
          />
          <kbd className="hidden md:block text-[10px] px-1.5 py-0.5 rounded border border-gray-300 dark:border-grafite-600 text-gray-400">Esc</kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {query.trim().length < 2 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
              Digite pelo menos 2 caracteres para buscar
            </p>
          ) : loading && !results ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">Buscando...</p>
          ) : flat.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">Nada encontrado para "{query}"</p>
          ) : (
            GRUPOS.map((g) => {
              const items = (results && results[g.key]) || [];
              if (items.length === 0) return null;
              return (
                <div key={g.key}>
                  <p className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                    <g.icon size={11} />
                    {g.label}
                  </p>
                  {items.map((item) => {
                    flatIndex += 1;
                    const idx = flatIndex;
                    const { title, subtitle } = itemLabel(g.key, item);
                    return (
                      <button
                        key={`${g.key}-${item.id}`}
                        onClick={() => go({ grupo: g.key, item })}
                        onMouseEnter={() => setSelected(idx)}
                        className={`w-full text-left px-4 py-2.5 flex flex-col ${
                          selected === idx ? 'bg-laranja-600/10' : ''
                        }`}
                      >
                        <span className={`text-sm ${selected === idx ? 'text-laranja-600 dark:text-laranja-400' : 'text-gray-900 dark:text-white'}`}>
                          {title}
                        </span>
                        {subtitle && <span className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</span>}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Package, AlertTriangle, Clock } from 'lucide-react';

// Colunas do kanban mapeando os status existentes.
// "target" é o status aplicado ao soltar um card na coluna.
export const KANBAN_COLUMNS = [
  { key: 'aberta', label: 'Aberta', statuses: ['aberta'], target: 'aberta', dot: 'bg-yellow-400' },
  { key: 'aprovacao', label: 'Aguard. aprovação', statuses: ['aguardando_aprovacao_orcamento', 'orcamento_recusado'], target: 'aguardando_aprovacao_orcamento', dot: 'bg-purple-400' },
  { key: 'andamento', label: 'Em andamento', statuses: ['em_andamento', 'aguardando_peca'], target: 'em_andamento', dot: 'bg-blue-400' },
  { key: 'pagamento', label: 'Aguard. pagamento', statuses: ['aguardando_pagamento'], target: 'aguardando_pagamento', dot: 'bg-orange-400' },
  { key: 'finalizada', label: 'Finalizada', statuses: ['finalizada'], target: 'finalizada', dot: 'bg-green-400' },
];

function prioridadeBadge(o) {
  if (o.status === 'finalizada' || o.status === 'cancelada') return null;
  if (o.aguardando_peca) return { cls: 'bg-gray-500/10 text-gray-400', text: 'Aguardando peça', icon: Package };
  if (o.prioridade >= 100) return { cls: 'bg-red-500/10 text-red-400', text: 'Urgente', icon: AlertTriangle };
  if (o.prioridade >= 50) return { cls: 'bg-orange-500/10 text-orange-400', text: 'Prioridade', icon: Clock };
  return null;
}

function KanbanCard({ order, columnKey, onStatusChange, dragging, setDragging }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const prio = prioridadeBadge(order);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', String(order.id));
        e.dataTransfer.effectAllowed = 'move';
        setDragging(order.id);
      }}
      onDragEnd={() => setDragging(null)}
      className={`bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-700 rounded-xl p-3 cursor-grab active:cursor-grabbing shadow-sm transition-opacity ${
        dragging === order.id ? 'opacity-40' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <button
          onClick={() => navigate(`/os/${order.id}`)}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">#{order.id}</span>
            {prio && (
              <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] ${prio.cls}`}>
                <prio.icon size={10} />
                {prio.text}
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate mt-0.5">{order.cliente?.nome}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {order.vehicle ? `${order.vehicle.marca} ${order.vehicle.modelo}` : '-'}
            {order.vehicle?.placa && <span className="uppercase ml-1">• {order.vehicle.placa}</span>}
          </p>
          <p className="text-sm font-bold text-laranja-600 dark:text-laranja-400 mt-1">
            R$ {(order.valor_total ?? 0).toFixed(2)}
          </p>
        </button>

        {/* menu de status: caminho principal no touch (DnD é só desktop) */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded"
            aria-label="Mudar status"
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-7 z-30 w-48 bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-700 rounded-xl shadow-xl overflow-hidden">
              <p className="px-3 py-2 text-[10px] uppercase tracking-wide text-gray-400 border-b border-gray-100 dark:border-grafite-800">Mover para</p>
              {KANBAN_COLUMNS.filter((c) => c.key !== columnKey).map((c) => (
                <button
                  key={c.key}
                  onClick={() => { setMenuOpen(false); onStatusChange(order.id, c.target); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-grafite-800"
                >
                  <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OSKanban({ orders, onStatusChange }) {
  const [dragging, setDragging] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const handleDrop = (e, column) => {
    e.preventDefault();
    setDragOverCol(null);
    const id = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (id) onStatusChange(id, column.target);
    setDragging(null);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-3 -mx-3 px-3 md:mx-0 md:px-0">
      {KANBAN_COLUMNS.map((column) => {
        const items = orders.filter((o) => column.statuses.includes(o.status));
        return (
          <div
            key={column.key}
            onDragOver={(e) => { e.preventDefault(); setDragOverCol(column.key); }}
            onDragLeave={() => setDragOverCol((prev) => (prev === column.key ? null : prev))}
            onDrop={(e) => handleDrop(e, column)}
            className={`w-64 min-w-[240px] shrink-0 rounded-xl border transition-colors ${
              dragOverCol === column.key && dragging
                ? 'border-laranja-500 bg-laranja-600/5'
                : 'border-gray-200 dark:border-grafite-800 bg-gray-50 dark:bg-grafite-950/60'
            }`}
          >
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-200 dark:border-grafite-800">
              <span className={`w-2 h-2 rounded-full ${column.dot}`} />
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{column.label}</span>
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-grafite-800 text-gray-600 dark:text-gray-400">
                {items.length}
              </span>
            </div>
            <div className="p-2 space-y-2 min-h-[120px] max-h-[65vh] overflow-y-auto">
              {items.length === 0 ? (
                <p className="text-center text-[11px] text-gray-400 dark:text-gray-600 py-6">Vazio</p>
              ) : (
                items.map((o) => (
                  <KanbanCard
                    key={o.id}
                    order={o}
                    columnKey={column.key}
                    onStatusChange={onStatusChange}
                    dragging={dragging}
                    setDragging={setDragging}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

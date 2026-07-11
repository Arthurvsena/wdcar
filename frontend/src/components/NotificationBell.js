import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellRing, CheckCheck, Smartphone } from 'lucide-react';
import api from '../api';
import { pushSupported, pushPermission, subscribeToPush, resubscribeIfGranted } from '../utils/push';

const POLL_INTERVAL_MS = 30000;

const TIPO_ICON = {
  orcamento_aprovado: '✅',
  orcamento_reprovado: '❌',
  estoque_baixo: '⚠️',
  os_finalizada: '🏁',
  os_atrasada: '⏰',
  garantia_vencendo: '🛡️',
  geral: '🔔',
};

function timeAgo(iso) {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'ontem';
  if (d < 30) return `há ${d} dias`;
  return new Date(iso).toLocaleDateString('pt-BR');
}

export default function NotificationBell({ align = 'right' }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [permission, setPermission] = useState(pushPermission());
  const containerRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications');
      setItems(data.items || []);
      setUnread(data.unread || 0);
    } catch (e) {
      // silencioso: não quebrar o layout por falha de rede
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    resubscribeIfGranted();
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) fetchNotifications();
  };

  const handleItemClick = async (notif) => {
    setOpen(false);
    if (!notif.lida) {
      setItems((prev) => prev.map((n) => (n.id === notif.id ? { ...n, lida: true } : n)));
      setUnread((prev) => Math.max(0, prev - 1));
      api.post(`/notifications/${notif.id}/read`).catch(() => {});
    }
    if (notif.link) navigate(notif.link);
  };

  const handleMarkAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, lida: true })));
    setUnread(0);
    api.post('/notifications/read-all').catch(() => {});
  };

  const handleEnablePush = async () => {
    try {
      await subscribeToPush();
    } finally {
      setPermission(pushPermission());
    }
  };

  const showEnablePush = pushSupported() && permission === 'default';

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={toggleOpen}
        className="relative p-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        aria-label="Notificações"
      >
        {unread > 0 ? <BellRing size={20} /> : <Bell size={20} />}
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-700 rounded-xl shadow-xl overflow-hidden ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-grafite-800">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Notificações</span>
            {unread > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-laranja-600 dark:text-laranja-400 hover:underline"
              >
                <CheckCheck size={14} />
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                Nenhuma notificação por enquanto
              </div>
            ) : (
              items.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-grafite-800 hover:bg-gray-50 dark:hover:bg-grafite-800 transition-colors ${
                    notif.lida ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg leading-none mt-0.5">
                      {TIPO_ICON[notif.tipo] || TIPO_ICON.geral}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {notif.titulo.replace(/^[^\w\s]+\s*/u, '')}
                        </p>
                        {!notif.lida && <span className="w-2 h-2 bg-laranja-500 rounded-full shrink-0" />}
                      </div>
                      {notif.mensagem && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                          {notif.mensagem}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                        {timeAgo(notif.created_at)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {showEnablePush && (
            <button
              onClick={handleEnablePush}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-xs font-medium text-laranja-600 dark:text-laranja-400 bg-laranja-600/5 hover:bg-laranja-600/10 transition-colors"
            >
              <Smartphone size={14} />
              Ativar notificações neste dispositivo
            </button>
          )}
          {pushSupported() && permission === 'denied' && (
            <div className="px-4 py-2 text-[11px] text-gray-400 dark:text-gray-500 text-center border-t border-gray-100 dark:border-grafite-800">
              Notificações bloqueadas — permita nas configurações do navegador
            </div>
          )}
        </div>
      )}
    </div>
  );
}

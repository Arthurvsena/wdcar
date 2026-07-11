import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const TOAST_TTL_MS = 4000;

const STYLES = {
  success: { icon: CheckCircle2, accent: 'text-green-500', bar: 'bg-green-500' },
  error: { icon: XCircle, accent: 'text-red-500', bar: 'bg-red-500' },
  info: { icon: Info, accent: 'text-blue-500', bar: 'bg-blue-500' },
};

function Toast({ toast, onDismiss }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const { icon: Icon, accent, bar } = STYLES[toast.type] || STYLES.info;

  return (
    <div
      className={`flex items-start gap-3 w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-700 rounded-xl shadow-lg overflow-hidden transition-all duration-300 ${
        mounted ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
      }`}
    >
      <div className={`w-1 self-stretch shrink-0 ${bar}`} />
      <Icon size={18} className={`${accent} mt-3 shrink-0`} />
      <p className="flex-1 py-3 text-sm text-gray-800 dark:text-gray-200">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="p-3 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 shrink-0"
        aria-label="Fechar"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((type, message) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => dismiss(id), TOAST_TTL_MS);
  }, [dismiss]);

  const api = {
    success: useCallback((msg) => push('success', msg), [push]),
    error: useCallback((msg) => push('error', msg), [push]),
    info: useCallback((msg) => push('info', msg), [push]),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[100] space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

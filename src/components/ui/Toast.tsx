import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { newId } from '../../utils/id';
import {
  ToastContext,
  friendlyMessage,
  type ToastApi,
  type ToastTone,
} from './toast-context';
import './Toast.css';

interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = newId();
    setToasts((current) => [...current.slice(-2), { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      error: (error, fallback = 'Something went wrong. Please try again.') => {
        // Keep the raw error for developers only — never show a stack trace.
        console.error(error);
        show(friendlyMessage(error, fallback), 'error');
      },
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.tone}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

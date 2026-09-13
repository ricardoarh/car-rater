import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './Sheet.css';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** 'sheet' slides from the bottom (mobile), 'dialog' centres. */
  variant?: 'sheet' | 'dialog';
  labelledBy?: string;
}

export function Sheet({ open, onClose, title, children, variant = 'sheet' }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  /*
   * Callers pass an inline arrow for onClose, so its identity changes on every
   * render. Keeping it in a ref means this effect depends on `open` alone —
   * without that, every re-render tore down and re-ran the whole setup, which
   * moved focus away from whatever the user was typing in.
   */
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    restoreTo.current = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
      }
      if (event.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('button, input, textarea')?.focus();
    }, 40);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = previous;
      window.clearTimeout(timer);
      restoreTo.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="sheet-root" role="presentation">
      <div className="sheet-scrim" onClick={onClose} />
      <div
        className={`sheet sheet--${variant}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={panelRef}
      >
        {variant === 'sheet' && <div className="sheet__grab" aria-hidden="true" />}
        {title && <h2 className="sheet__title">{title}</h2>}
        <div className="sheet__body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

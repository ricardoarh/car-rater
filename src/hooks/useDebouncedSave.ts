import { useCallback, useEffect, useRef } from 'react';

/**
 * Debounced autosave that always flushes the last value — on unmount, and when
 * the phone is locked or the app is backgrounded.
 */
export function useDebouncedSave<T>(
  save: (value: T) => void | Promise<void>,
  delay = 500,
): (value: T) => void {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ value: T } | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (pending.current) {
      const { value } = pending.current;
      pending.current = null;
      void saveRef.current(value);
    }
  }, []);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [flush]);

  return useCallback(
    (value: T) => {
      pending.current = { value };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, delay);
    },
    [delay, flush],
  );
}

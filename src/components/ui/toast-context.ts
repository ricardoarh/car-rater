import { createContext, useContext } from 'react';

export type ToastTone = 'info' | 'success' | 'error';

export interface ToastApi {
  show: (message: string, tone?: ToastTone) => void;
  error: (error: unknown, fallback?: string) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);

/** Turns any thrown value into a sentence a person can act on. */
export function friendlyMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message && !/^[A-Z][a-z]+Error:/.test(error.message)) {
    return error.message;
  }
  return fallback;
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    // Components can be rendered in isolation (tests); degrade quietly.
    return {
      show: () => undefined,
      error: (error) => console.error(error),
    };
  }
  return context;
}

import { create } from 'zustand';

export type ToastKind = 'info' | 'success' | 'error';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  action?: ToastAction;
}

interface ToastState {
  toasts: ToastItem[];
  push: (kind: ToastKind, message: string, durationMs?: number, action?: ToastAction) => number;
  dismiss: (id: number) => void;
}

const DEFAULT_DURATION_MS = 4000;
const MAX_TOASTS = 3;
let nextId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (kind, message, durationMs = DEFAULT_DURATION_MS, action) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, kind, message, action }].slice(-MAX_TOASTS) }));
    if (durationMs > 0) setTimeout(() => get().dismiss(id), durationMs);
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Show a friendly message. Works outside React too (e.g. from API modules or the audio engine). */
export const toast = {
  info: (message: string) => useToastStore.getState().push('info', message),
  success: (message: string) => useToastStore.getState().push('success', message),
  error: (message: string) => useToastStore.getState().push('error', message, 6000),
  /** Success toast with a button, e.g. "Undo". Stays for 5 seconds by default. */
  withAction: (message: string, action: ToastAction, durationMs = 5000) =>
    useToastStore.getState().push('info', message, durationMs, action),
};

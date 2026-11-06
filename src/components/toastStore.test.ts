import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast, useToastStore } from './toastStore';

describe('toast store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToastStore.setState({ toasts: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds and auto-dismisses a toast', () => {
    toast.success('Saved');
    expect(useToastStore.getState().toasts).toMatchObject([{ kind: 'success', message: 'Saved' }]);
    vi.advanceTimersByTime(4000);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('keeps at most three toasts', () => {
    ['a', 'b', 'c', 'd'].forEach((m) => toast.info(m));
    expect(useToastStore.getState().toasts.map((t) => t.message)).toEqual(['b', 'c', 'd']);
  });

  it('dismisses by id', () => {
    const id = toast.error('Oops');
    useToastStore.getState().dismiss(id);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});

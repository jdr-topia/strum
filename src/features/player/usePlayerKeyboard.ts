import { useEffect } from 'react';
import { usePlayerStore } from './playerStore';

const SEEK_STEP_SEC = 10;
const VOLUME_STEP = 0.05;

/** True when the key press belongs to a text field or other control, not the player. */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return !!target.closest('input, textarea, select, [contenteditable="true"]');
}

/** Desktop shortcuts from the Phase 3 spec. Ignored while typing. */
export function usePlayerKeyboard(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTyping(e.target)) return;

      const s = usePlayerStore.getState();
      switch (e.key) {
        case ' ':
          e.preventDefault();
          s.togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) s.prev();
          else s.seek(s.positionSec - SEEK_STEP_SEC);
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) s.next();
          else s.seek(s.positionSec + SEEK_STEP_SEC);
          break;
        case 'ArrowUp':
          e.preventDefault();
          s.setVolume(s.volume + VOLUME_STEP);
          break;
        case 'ArrowDown':
          e.preventDefault();
          s.setVolume(s.volume - VOLUME_STEP);
          break;
        case 'm':
        case 'M':
          s.toggleMute();
          break;
        case 's':
        case 'S':
          s.toggleShuffle();
          break;
        case 'r':
        case 'R':
          s.cycleRepeat();
          break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

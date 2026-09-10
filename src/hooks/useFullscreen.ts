import { useCallback, useEffect, useState } from 'react';

/** Tracks and toggles native fullscreen for a single element. SSR- and jsdom-safe. */
export function useFullscreen(element: HTMLElement | null) {
  const supported =
    typeof document !== 'undefined' &&
    typeof document.documentElement.requestFullscreen === 'function';
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!supported) return;
    const onChange = () => setActive(document.fullscreenElement === element);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [supported, element]);

  const toggle = useCallback(() => {
    if (!supported || !element) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void element.requestFullscreen();
    }
  }, [supported, element]);

  return { supported, active, toggle };
}

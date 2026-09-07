import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';

interface Pan {
  pointerId: number;
  element: HTMLDivElement;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

function boundPan(value: number, size: number, scale: number) {
  const limit = (size * (scale - 1)) / 2;
  return Math.max(-limit, Math.min(limit, value));
}

export function useImageZoom(
  enabled: boolean,
  scope: string,
  blocked: boolean
) {
  const viewport = useRef<HTMLDivElement>(null);
  const pan = useRef<Pan | null>(null);
  const [zoom, setZoom] = useState({ scope, enabled, scale: 1, x: 0, y: 0 });
  if (zoom.scope !== scope || zoom.enabled !== enabled) {
    setZoom({ scope, enabled, scale: 1, x: 0, y: 0 });
  }

  const release = useCallback(() => {
    const current = pan.current;
    pan.current = null;
    if (current?.element.hasPointerCapture(current.pointerId)) {
      current.element.releasePointerCapture(current.pointerId);
    }
  }, []);

  const reset = useCallback(() => {
    release();
    setZoom({ scope, enabled, scale: 1, x: 0, y: 0 });
  }, [scope, enabled, release]);

  useEffect(() => {
    const element = viewport.current;
    if (!enabled || !element) return;
    const wheel = (event: WheelEvent) => {
      if (
        blocked ||
        pan.current ||
        event.buttons ||
        event.ctrlKey ||
        event.metaKey ||
        !event.deltaY
      )
        return;
      const bounds = element.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      event.preventDefault();
      element
        .closest<HTMLElement>('.civ__stage')
        ?.focus({ preventScroll: true });
      const unit =
        event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? bounds.height : 1;
      const delta = Math.max(-200, Math.min(200, event.deltaY * unit));
      const x = event.clientX - bounds.left - bounds.width / 2;
      const y = event.clientY - bounds.top - bounds.height / 2;
      setZoom((current) => {
        const scale = Math.max(
          1,
          Math.min(4, current.scale * Math.exp(-delta * 0.002))
        );
        const ratio = scale / current.scale;
        return {
          ...current,
          scale,
          x: boundPan(x - (x - current.x) * ratio, bounds.width, scale),
          y: boundPan(y - (y - current.y) * ratio, bounds.height, scale),
        };
      });
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [enabled, scope, blocked]);

  useEffect(() => {
    const element = viewport.current;
    if (!enabled || !element) return;
    const observer =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(reset);
    if (element) observer?.observe(element);
    window.addEventListener('resize', reset);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', reset);
      release();
    };
  }, [enabled, reset, release]);

  function endPan(event: PointerEvent<HTMLDivElement>) {
    if (pan.current?.pointerId === event.pointerId) release();
  }

  return {
    viewport,
    scale: zoom.scale,
    transform: `translate3d(${zoom.x}px, ${zoom.y}px, 0) scale(${zoom.scale})`,
    reset,
    handlers: {
      onPointerDown(event: PointerEvent<HTMLDivElement>) {
        if (!event.isPrimary || event.button !== 0 || zoom.scale <= 1) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        event.currentTarget.focus({ preventScroll: true });
        pan.current = {
          pointerId: event.pointerId,
          element: event.currentTarget,
          x: event.clientX,
          y: event.clientY,
          offsetX: zoom.x,
          offsetY: zoom.y,
          width: bounds.width,
          height: bounds.height,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      onPointerMove(event: PointerEvent<HTMLDivElement>) {
        const current = pan.current;
        if (!current || current.pointerId !== event.pointerId) return;
        setZoom((previous) => ({
          ...previous,
          x: boundPan(
            current.offsetX + event.clientX - current.x,
            current.width,
            previous.scale
          ),
          y: boundPan(
            current.offsetY + event.clientY - current.y,
            current.height,
            previous.scale
          ),
        }));
      },
      onPointerUp: endPan,
      onPointerCancel: endPan,
      onLostPointerCapture: endPan,
    },
  };
}

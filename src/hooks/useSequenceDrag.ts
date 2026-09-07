import { useRef } from 'react';
import type { PointerEvent } from 'react';

interface Drag {
  pointerId: number;
  x: number;
  y: number;
  frame: number;
  step: number;
  horizontal: boolean;
}

export function useSequenceDrag(
  pixelsPerFrame: number,
  onSelect: (index: number) => void,
  startFrame: () => number,
  canDrag = true
) {
  const drag = useRef<Drag | null>(null);

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return {
    onPointerDown(event: PointerEvent<HTMLDivElement>) {
      if (!canDrag || !event.isPrimary || event.button !== 0) return;
      event.currentTarget.focus({ preventScroll: true });
      drag.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        frame: startFrame(),
        step: 0,
        horizontal: false,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove(event: PointerEvent<HTMLDivElement>) {
      const current = drag.current;
      if (!current || current.pointerId !== event.pointerId) return;
      const deltaX = current.x - event.clientX;
      const deltaY = current.y - event.clientY;
      if (
        !current.horizontal &&
        Math.abs(deltaY) > Math.max(6, Math.abs(deltaX))
      ) {
        endDrag(event);
        return;
      }
      if (Math.abs(deltaX) >= pixelsPerFrame) current.horizontal = true;
      const step = Math.trunc(deltaX / pixelsPerFrame);
      if (step !== current.step) {
        current.step = step;
        onSelect(current.frame + step);
      }
    },
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onLostPointerCapture() {
      drag.current = null;
    },
  };
}

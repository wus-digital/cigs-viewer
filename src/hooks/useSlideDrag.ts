import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent, TransitionEvent } from 'react';
import { normalizeFrame } from '../utils/frames.js';

interface Gesture {
  pointerId: number;
  x: number;
  y: number;
  width: number;
  horizontal: boolean;
  frameIndex: number;
  lastX: number;
  direction: -1 | 1;
}

export interface SlideMotion {
  offset: number;
  active: boolean;
  settling: boolean;
  direction: -1 | 1;
  targetIndex?: number | undefined;
  programmatic?: boolean;
}

export interface Motion extends SlideMotion {
  scope: string;
  frameIndex: number;
  viewportElement: HTMLDivElement | null | undefined;
}

export function useSlideDrag(
  frameIndex: number,
  count: number,
  loop: boolean,
  onSelect: (index: number) => void,
  scope: string,
  viewportElement?: HTMLDivElement | null
) {
  const viewport = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const pending = useRef<{
    from: number;
    target: number | undefined;
    callback: () => void;
  } | null>(null);
  const latestFrame = useRef(frameIndex);
  const latestSelect = useRef(onSelect);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationFrame = useRef<number | null>(null);
  const [motion, setMotion] = useState<Motion>({
    offset: 0,
    active: false,
    settling: false,
    direction: 1,
    scope,
    frameIndex,
    viewportElement,
  });
  if (
    motion.scope !== scope ||
    motion.frameIndex !== frameIndex ||
    motion.viewportElement !== viewportElement
  ) {
    setMotion({
      offset: 0,
      active: false,
      settling: false,
      direction: 1,
      scope,
      frameIndex,
      viewportElement,
    });
  }

  function releasePointer() {
    const pointerId = gesture.current?.pointerId;
    gesture.current = null;
    if (
      pointerId !== undefined &&
      viewport.current?.hasPointerCapture(pointerId)
    ) {
      viewport.current.releasePointerCapture(pointerId);
    }
  }

  const clearScheduled = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    if (animationFrame.current !== null)
      window.cancelAnimationFrame?.(animationFrame.current);
    timer.current = null;
    animationFrame.current = null;
  }, []);

  const finish = useCallback(() => {
    const action = pending.current;
    const valid = action?.from === latestFrame.current;
    const target = valid ? action?.target : undefined;
    pending.current = null;
    clearScheduled();
    setMotion({
      offset: 0,
      active: false,
      settling: false,
      direction: 1,
      scope,
      frameIndex: target ?? latestFrame.current,
      viewportElement,
    });
    if (valid) action?.callback();
    return target;
  }, [scope, clearScheduled, viewportElement]);

  function settle(
    offset: number,
    target?: number,
    from = frameIndex,
    prepare = false
  ) {
    clearScheduled();
    releasePointer();
    const action = {
      from,
      target:
        target === undefined ? undefined : normalizeFrame(target, count, loop),
      callback: () => {
        if (target !== undefined) latestSelect.current(target);
      },
    };
    pending.current = action;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      finish();
      return;
    }
    const stageFirst =
      prepare && typeof window.requestAnimationFrame === 'function';
    setMotion((current) => ({
      offset: stageFirst ? 0 : offset,
      active: true,
      settling: !stageFirst,
      direction: offset === 0 ? current.direction : offset < 0 ? 1 : -1,
      targetIndex: action.target,
      programmatic: prepare,
      scope,
      frameIndex: from,
      viewportElement,
    }));
    if (stageFirst) {
      // Mount the incoming frame at its parallax offset before animating both layers.
      animationFrame.current = window.requestAnimationFrame(() => {
        animationFrame.current = window.requestAnimationFrame(() => {
          animationFrame.current = null;
          if (pending.current !== action) return;
          setMotion((current) => ({ ...current, offset, settling: true }));
          timer.current = setTimeout(finish, prepare ? 660 : 260);
        });
      });
    } else {
      // transitionend may not fire for zero-distance or interrupted transitions.
      timer.current = setTimeout(finish, prepare ? 660 : 260);
    }
  }

  function completeTransition() {
    return pending.current ? (finish() ?? frameIndex) : frameIndex;
  }

  function select(target: number, relative = false) {
    const from = completeTransition();
    const next = normalizeFrame(relative ? from + target : target, count, loop);
    if (count < 2 || next === from) return;
    const direction = (relative ? target : next - from) > 0 ? 1 : -1;
    const width = viewport.current?.getBoundingClientRect().width ?? 0;
    if (width <= 0) {
      latestSelect.current(next);
      return;
    }
    settle(-direction * width, next, from, true);
  }

  useEffect(() => {
    function reset() {
      if (pending.current) finish();
      const width = viewport.current?.getBoundingClientRect().width;
      if (gesture.current && width) gesture.current.width = width;
    }
    let width = viewport.current?.getBoundingClientRect().width;
    const observer =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(() => {
            const nextWidth = viewport.current?.getBoundingClientRect().width;
            if (nextWidth !== width) reset();
            width = nextWidth;
          });
    if (viewport.current) observer?.observe(viewport.current);
    window.addEventListener('resize', reset);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', reset);
      releasePointer();
      pending.current = null;
      clearScheduled();
    };
  }, [scope, finish, clearScheduled, viewportElement]);

  useEffect(() => {
    latestFrame.current = frameIndex;
    if (gesture.current && gesture.current.frameIndex !== frameIndex)
      releasePointer();
    if (pending.current && pending.current.from !== frameIndex) {
      pending.current = null;
      clearScheduled();
    }
  }, [frameIndex, clearScheduled]);

  useEffect(() => {
    latestSelect.current = onSelect;
  }, [onSelect]);

  function offsetAt(x: number, current: Gesture) {
    const previous = loop || frameIndex > 0;
    const next = loop || frameIndex < count - 1;
    return Math.max(
      next ? -current.width : 0,
      Math.min(previous ? current.width : 0, x - current.x)
    );
  }

  function cancel(event: PointerEvent<HTMLDivElement>) {
    if (gesture.current?.pointerId !== event.pointerId) return;
    if (!gesture.current.horizontal) {
      releasePointer();
      return;
    }
    settle(0);
  }

  function endGesture(
    event: PointerEvent<HTMLDivElement>,
    inferMovement: boolean
  ) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if (current.frameIndex !== frameIndex) {
      releasePointer();
      return;
    }
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (
      !current.horizontal &&
      inferMovement &&
      Math.abs(dx) >= 2 &&
      Math.abs(dx) >= Math.abs(dy)
    ) {
      current.horizontal = true;
      current.direction = dx < 0 ? 1 : -1;
    }
    if (!current.horizontal) {
      releasePointer();
      return;
    }
    const target = frameIndex + current.direction;
    const allowed = loop || (target >= 0 && target < count);
    settle(
      allowed ? -current.direction * current.width : 0,
      allowed ? target : undefined
    );
  }

  return {
    viewport,
    motion,
    select,
    completeTransition,
    onTransitionEnd(event: TransitionEvent<HTMLDivElement>) {
      if (
        pending.current &&
        event.target === event.currentTarget &&
        event.propertyName === 'transform'
      ) {
        finish();
      }
    },
    handlers: {
      onPointerDown(event: PointerEvent<HTMLDivElement>) {
        if (
          !event.isPrimary ||
          event.button !== 0 ||
          count < 2 ||
          gesture.current
        )
          return;
        const width = event.currentTarget.getBoundingClientRect().width;
        if (width <= 0) return;
        const startFrame = completeTransition();
        event.currentTarget
          .closest<HTMLElement>('.civ__stage')
          ?.focus({ preventScroll: true });
        gesture.current = {
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          width,
          horizontal: false,
          frameIndex: startFrame,
          lastX: event.clientX,
          direction: 1,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      onPointerMove(event: PointerEvent<HTMLDivElement>) {
        const current = gesture.current;
        if (!current || current.pointerId !== event.pointerId) return;
        const dx = event.clientX - current.x;
        const dy = event.clientY - current.y;
        if (!current.horizontal && Math.abs(dy) > Math.max(6, Math.abs(dx))) {
          cancel(event);
          return;
        }
        if (Math.abs(dx) < 2 && !current.horizontal) return;
        current.horizontal = true;
        const step = event.clientX - current.lastX;
        if (Math.abs(step) >= 2) current.direction = step < 0 ? 1 : -1;
        current.lastX = event.clientX;
        const offset = offsetAt(event.clientX, current);
        setMotion((previous) => ({
          offset,
          active: offset !== 0 || previous.active,
          settling: false,
          direction: current.direction,
          scope,
          frameIndex,
          viewportElement,
        }));
      },
      onPointerUp(event: PointerEvent<HTMLDivElement>) {
        endGesture(event, true);
      },
      onPointerCancel: cancel,
      onLostPointerCapture(event: PointerEvent<HTMLDivElement>) {
        endGesture(event, false);
      },
    },
  };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ViewerFrameChange, ViewerLabels } from '../types/viewer.js';
import {
  buttonClasses,
  imageClasses,
  statusClasses,
} from '../constants/tailwind.js';

interface Props {
  src: string;
  change: ViewerFrameChange;
  active: boolean;
  labels: ViewerLabels;
  onImageError: ((error: Error, change: ViewerFrameChange) => void) | undefined;
}

interface Request {
  attempt: number;
  status: 'loading' | 'loaded' | 'error';
}

export function ZoomFrameImage({
  src,
  change,
  active,
  labels,
  onImageError,
}: Props) {
  const image = useRef<HTMLImageElement>(null);
  const settled = useRef<HTMLImageElement | null>(null);
  const attachImage = useCallback(
    (element: HTMLImageElement | null) => {
      // Only this foreground request is cancelled; the base queue is independent.
      if (image.current !== element) image.current?.removeAttribute('src');
      image.current = element;
      if (element && element.getAttribute('src') !== src) {
        element.setAttribute('src', src);
      }
    },
    [src]
  );
  const [state, setState] = useState<{
    active: boolean;
    attempt: number;
    request: Request | null;
  }>({
    active,
    attempt: 0,
    request: active ? { attempt: 0, status: 'loading' } : null,
  });
  if (state.active !== active) {
    const attempt = state.attempt + 1;
    setState({
      active,
      attempt,
      request:
        state.request?.status === 'loaded'
          ? state.request
          : active
            ? { attempt, status: 'loading' }
            : null,
    });
  }
  const { request } = state;
  const settle = useCallback(
    (element: HTMLImageElement, loaded: boolean) => {
      if (
        !active ||
        image.current !== element ||
        settled.current === element ||
        request?.status !== 'loading'
      )
        return;
      settled.current = element;
      setState((current) => ({
        ...current,
        request: {
          attempt: request.attempt,
          status: loaded ? 'loaded' : 'error',
        },
      }));
      if (!loaded) {
        onImageError?.(new Error(`Viewer zoom image failed to load: ${src}`), {
          ...change,
          frame: { ...change.frame, src },
        });
      }
    },
    [active, change, onImageError, request, src]
  );

  useEffect(() => {
    const element = image.current;
    if (element?.complete) settle(element, element.naturalWidth > 0);
  }, [settle]);

  if (!request) return null;
  return (
    <div
      className='civ__zoom-quality pointer-events-none absolute inset-0 z-[3]'
      hidden={!active}
    >
      <img
        key={request.attempt}
        ref={attachImage}
        className={imageClasses}
        data-civ-layer={2}
        src={src}
        alt=''
        aria-hidden='true'
        draggable={false}
        decoding='async'
        fetchPriority='high'
        style={{
          visibility: request.status === 'loaded' ? 'visible' : 'hidden',
        }}
        onLoad={(event) => settle(event.currentTarget, true)}
        onError={(event) => settle(event.currentTarget, false)}
      />
      {active && request.status === 'loading' && (
        <span className='civ__sr-only sr-only' role='status'>
          {labels.loading}
        </span>
      )}
      {active && request.status === 'error' && (
        <div className={statusClasses} role='alert'>
          <span>{labels.error}</span>
          <button
            type='button'
            className={`${buttonClasses} pointer-events-auto`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() =>
              setState((current) => ({
                ...current,
                attempt: current.attempt + 1,
                request: {
                  attempt: current.attempt + 1,
                  status: 'loading',
                },
              }))
            }
          >
            {labels.retry}
          </button>
        </div>
      )}
    </div>
  );
}

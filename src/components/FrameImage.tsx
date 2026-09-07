import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ViewerFrameChange, ViewerLabels } from '../types/viewer.js';
import {
  buttonClasses,
  imageClasses,
  loadingVeilClasses,
  statusClasses,
} from '../constants/tailwind.js';

interface Props {
  change: ViewerFrameChange;
  alt: string;
  labels: ViewerLabels;
  onImageError: ((error: Error, change: ViewerFrameChange) => void) | undefined;
  preview?: boolean;
  enabled?: boolean;
  fallbackSrc?: string | undefined;
  onSettled?: (image: HTMLImageElement, loaded: boolean) => void;
  onRetry?: () => void;
}

interface LoadedImage {
  src: string;
  attempt: number;
  generation: number;
}

interface RequestState {
  src: string;
  status: 'loading' | 'loaded' | 'error';
  attempt: number;
  generation: number;
  fadingFrom: LoadedImage | null;
}

export function FrameImage({
  change,
  alt,
  labels,
  onImageError,
  preview = false,
  enabled = true,
  fallbackSrc,
  onSettled,
  onRetry,
}: Props) {
  const image = useRef<HTMLImageElement>(null);
  const settled = useRef(-1);
  const [request, setRequest] = useState<RequestState>({
    src: change.frame.src,
    status: 'loading',
    attempt: 0,
    generation: 0,
    fadingFrom: null,
  });
  const [lastGood, setLastGood] = useState<LoadedImage | null>(null);
  if (request.src !== change.frame.src) {
    setRequest({
      src: change.frame.src,
      status: 'loading',
      attempt: 0,
      generation: request.generation + 1,
      fadingFrom: null,
    });
  }
  const previous =
    lastGood?.generation !== request.generation ? lastGood : null;
  const retained = useMemo(
    () =>
      request.status === 'loaded'
        ? request.fadingFrom
        : (previous ??
          (fallbackSrc && fallbackSrc !== request.src
            ? { src: fallbackSrc, attempt: 0, generation: -1 }
            : null)),
    [request.status, request.fadingFrom, request.src, previous, fallbackSrc]
  );

  const finishFade = useCallback((generation: number) => {
    setRequest((current) =>
      current.generation === generation && current.fadingFrom
        ? { ...current, fadingFrom: null }
        : current
    );
  }, []);

  const handleLoad = useCallback(
    (element: HTMLImageElement) => {
      if (
        !enabled ||
        image.current !== element ||
        settled.current === request.generation
      )
        return;
      settled.current = request.generation;
      const fadingFrom =
        retained &&
        retained.src !== request.src &&
        !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
          ? retained
          : null;
      // Establish opacity zero even for cached images before revealing the new layer.
      if (fadingFrom) element.getBoundingClientRect();
      setRequest((current) =>
        current.generation === request.generation
          ? { ...current, status: 'loaded', fadingFrom }
          : current
      );
      setLastGood({
        src: request.src,
        attempt: request.attempt,
        generation: request.generation,
      });
      onSettled?.(element, true);
    },
    [
      enabled,
      request.generation,
      request.src,
      request.attempt,
      retained,
      onSettled,
    ]
  );

  const handleError = useCallback(
    (element: HTMLImageElement) => {
      if (
        !enabled ||
        image.current !== element ||
        settled.current === request.generation
      )
        return;
      settled.current = request.generation;
      setRequest((current) =>
        current.generation === request.generation
          ? { ...current, status: 'error' }
          : current
      );
      onSettled?.(element, false);
      onImageError?.(new Error('Viewer image failed to load.'), change);
    },
    [change, enabled, request.generation, onImageError, onSettled]
  );

  useEffect(() => {
    if (
      enabled &&
      settled.current !== request.generation &&
      image.current?.complete
    ) {
      if (image.current.naturalWidth > 0) handleLoad(image.current);
      else handleError(image.current);
    }
  }, [enabled, request.generation, handleLoad, handleError]);

  useEffect(() => {
    if (!request.fadingFrom) return;
    const complete = () => finishFade(request.generation);
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const onPreferenceChange = () => {
      if (preference?.matches) complete();
    };
    preference?.addEventListener?.('change', onPreferenceChange);
    const timeout = window.setTimeout(complete, 450);
    return () => {
      window.clearTimeout(timeout);
      preference?.removeEventListener?.('change', onPreferenceChange);
    };
  }, [request.fadingFrom, request.generation, finishFade]);

  const layers = [
    {
      src: request.src,
      attempt: request.attempt,
      generation: request.generation,
      current: true,
    },
    ...(retained ? [{ ...retained, current: false }] : []),
  ];
  return (
    <>
      {layers.map((layer) => (
        <img
          key={JSON.stringify([layer.src, layer.attempt, layer.generation])}
          ref={layer.current ? image : undefined}
          className={
            layer.current
              ? `${imageClasses} relative z-[1] ${
                  request.fadingFrom
                    ? 'transition-opacity duration-[400ms] ease-in-out motion-reduce:transition-none'
                    : ''
                }`
              : `${imageClasses} civ__image--retained absolute inset-0 z-0`
          }
          data-civ-layer={layer.current ? 1 : 0}
          src={layer.current && !enabled ? undefined : layer.src}
          alt={layer.current ? alt : ''}
          aria-hidden={layer.current ? undefined : true}
          draggable={false}
          decoding='async'
          onLoad={
            layer.current ? (event) => handleLoad(event.currentTarget) : undefined
          }
          onError={
            layer.current
              ? (event) => handleError(event.currentTarget)
              : undefined
          }
          onTransitionEnd={
            layer.current
              ? (event) => {
                  if (
                    event.target === event.currentTarget &&
                    event.propertyName === 'opacity' &&
                    image.current === event.currentTarget
                  )
                    finishFade(request.generation);
                }
              : undefined
          }
          style={{
            opacity:
              layer.current && retained && request.status !== 'loaded' ? 0 : 1,
            visibility:
              layer.current &&
              (!enabled ||
                request.status === 'error' ||
                (retained && request.status !== 'loaded'))
                ? 'hidden'
                : 'visible',
          }}
        />
      ))}
      {retained && request.status !== 'loaded' && (
        <div
          className={loadingVeilClasses}
          role={!preview && request.status === 'loading' ? 'status' : undefined}
        >
          {request.status === 'loading' && (
            <span className='civ__sr-only sr-only'>{labels.loading}</span>
          )}
        </div>
      )}
      {request.status === 'loading' && !retained && (
        <div className={statusClasses} role={preview ? undefined : 'status'}>
          {labels.loading}
        </div>
      )}
      {request.status === 'error' && (
        <div className={statusClasses} role={preview ? undefined : 'alert'}>
          <span>{labels.error}</span>
          {!preview && (
            <button
              className={buttonClasses}
              type='button'
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => {
                onRetry?.();
                setRequest((current) => ({
                  ...current,
                  status: 'loading',
                  attempt: current.attempt + 1,
                  generation: current.generation + 1,
                }));
              }}
            >
              {labels.retry}
            </button>
          )}
        </div>
      )}
    </>
  );
}

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
  generating?: boolean | undefined;
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
  generating = false,
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

  // The dark loading veil is fully decoupled from the image cross-fade: it
  // has its own appear -> shown -> hide lifecycle so it always fades in and
  // out smoothly over its own timeline, never popping in/out abruptly (e.g.
  // even when the underlying image happens to be identical to the retained
  // one and needs no cross-fade of its own).
  const hasRetained = Boolean(retained);
  const [cover, setCover] = useState<{
    generation: number;
    phase: 'idle' | 'entering' | 'appearing' | 'shown' | 'hiding';
  }>({ generation: request.generation, phase: 'idle' });
  if (cover.generation !== request.generation) {
    setCover({
      generation: request.generation,
      phase: cover.phase === 'idle' ? 'idle' : 'shown',
    });
  }
  useEffect(() => {
    const needsCover =
      generating || (request.status === 'loading' && hasRetained);
    if (!needsCover) return;
    const generation = request.generation;
    const timeout = window.setTimeout(() => {
      setCover((current) =>
        current.generation === generation &&
        (current.phase === 'idle' || current.phase === 'hiding')
          ? { generation, phase: 'entering' }
          : current
      );
    }, generating ? 0 : 100);
    return () => window.clearTimeout(timeout);
  }, [request.status, request.generation, hasRetained, generating]);
  // The veil is mounted at opacity 0 in the 'entering' phase first, then
  // flipped to opacity 1 on the next animation frame. Toggling both in the
  // same commit as the initial mount would give the browser nothing to
  // transition from, so the fade-in would snap instantly instead of
  // animating.
  useEffect(() => {
    if (cover.phase !== 'entering') return;
    const generation = cover.generation;
    const raf = requestAnimationFrame(() => {
      setCover((current) =>
        current.generation === generation && current.phase === 'entering'
          ? { generation, phase: 'appearing' }
          : current
      );
    });
    return () => cancelAnimationFrame(raf);
  }, [cover.phase, cover.generation]);
  useEffect(() => {
    if (cover.phase !== 'appearing') return;
    const generation = cover.generation;
    const timeout = window.setTimeout(() => {
      setCover((current) =>
        current.generation === generation && current.phase === 'appearing'
          ? { generation, phase: 'shown' }
          : current
      );
    }, 200);
    return () => window.clearTimeout(timeout);
  }, [cover.phase, cover.generation]);
  useEffect(() => {
    if (cover.phase !== 'hiding') return;
    const generation = cover.generation;
    const timeout = window.setTimeout(() => {
      setCover((current) =>
        current.generation === generation && current.phase === 'hiding'
          ? { generation, phase: 'idle' }
          : current
      );
    }, 200);
    return () => window.clearTimeout(timeout);
  }, [cover.phase, cover.generation]);
  useEffect(() => {
    if (
      generating ||
      request.status === 'loading' ||
      cover.phase === 'idle' ||
      cover.phase === 'hiding'
    )
      return;
    const generation = cover.generation;
    const timeout = window.setTimeout(() => {
      setCover((current) => {
        if (current.generation !== generation) return current;
        return current.phase === 'entering'
          ? { generation, phase: 'idle' }
          : { generation, phase: 'hiding' };
      });
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [generating, request.status, cover.phase, cover.generation]);
  // 'entering' never became visible (still opacity 0), so a load that
  // resolves that quickly can reveal immediately, same as 'idle'/'shown'.
  const veilSettled =
    cover.phase === 'idle' ||
    cover.phase === 'entering' ||
    cover.phase === 'shown';
  const veilMounted = request.status === 'error' || cover.phase !== 'idle';
  const veilOpaque =
    request.status === 'error' ||
    cover.phase === 'appearing' ||
    cover.phase === 'shown';

  const [dataReady, setDataReady] = useState<{
    generation: number;
    element: HTMLImageElement;
  } | null>(null);
  // Reveal the newly loaded image only once the veil (if it was shown at
  // all) has completed its fade-in. Loads that resolve before the veil ever
  // becomes visible (cache hits), or that have nothing to veil in the first
  // place (no retained image), are revealed immediately.
  if (
    request.status === 'loading' &&
    dataReady &&
    dataReady.generation === request.generation &&
    veilSettled
  ) {
    const fadingFrom =
      retained &&
      retained.src !== request.src &&
      !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        ? retained
        : null;
    setRequest({ ...request, status: 'loaded', fadingFrom });
    setLastGood({
      src: request.src,
      attempt: request.attempt,
      generation: request.generation,
    });
    if (cover.phase === 'shown') {
      setCover({ generation: request.generation, phase: 'hiding' });
    } else if (cover.phase === 'entering') {
      // Never became visible; cancel the pending fade-in instead of letting
      // it flash in after the image has already been revealed.
      setCover({ generation: request.generation, phase: 'idle' });
    }
  }

  const handleLoad = useCallback(
    (element: HTMLImageElement) => {
      if (
        !enabled ||
        image.current !== element ||
        settled.current === request.generation
      )
        return;
      settled.current = request.generation;
      onSettled?.(element, true);
      setDataReady({ generation: request.generation, element });
    },
    [enabled, request.generation, onSettled]
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
    const timeout = window.setTimeout(complete, 260);
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
                    ? 'transition-opacity duration-[200ms] ease-in-out motion-reduce:transition-none'
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
      {veilMounted && (
        <div
          className={loadingVeilClasses}
          style={{ opacity: veilOpaque ? 1 : 0 }}
          role={
            !preview && (generating || request.status === 'loading')
              ? 'status'
              : undefined
          }
        >
          {(generating || request.status === 'loading') && (
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

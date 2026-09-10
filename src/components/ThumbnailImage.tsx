import { useCallback, useEffect, useRef, useState } from 'react';
import { thumbnailImageClasses } from '../constants/tailwind.js';
import { slotClasses } from '../utils/classes.js';

interface Props {
  src: string;
  ready: boolean;
  index: number;
  placeholder?: string;
  className?: string | undefined;
}

interface RequestState {
  src: string;
  generation: number;
  loaded: boolean;
  fadingFrom: string | null;
}

interface LastGood {
  src: string;
  generation: number;
}

export function ThumbnailImage({
  src,
  ready,
  index,
  placeholder,
  className,
}: Props) {
  const image = useRef<HTMLImageElement>(null);
  const settled = useRef(-1);
  const [request, setRequest] = useState<RequestState | null>(
    ready ? { src, generation: 0, loaded: false, fadingFrom: null } : null
  );
  const [lastGood, setLastGood] = useState<LastGood | null>(null);
  if (ready && request?.src !== src) {
    setRequest({
      src,
      generation: (request?.generation ?? -1) + 1,
      loaded: false,
      fadingFrom: null,
    });
  }
  const retained =
    request &&
    (request.generation === lastGood?.generation
      ? request.fadingFrom
      : (lastGood?.src ?? null));

  const finishFade = useCallback((generation: number) => {
    setRequest((current) =>
      current && current.generation === generation && current.fadingFrom
        ? { ...current, fadingFrom: null }
        : current
    );
  }, []);

  const handleLoad = useCallback(
    (element: HTMLImageElement) => {
      if (
        !request ||
        image.current !== element ||
        settled.current === request.generation
      )
        return;
      settled.current = request.generation;
      const reduceMotion = window.matchMedia?.(
        '(prefers-reduced-motion: reduce)'
      ).matches;
      const fadingFrom =
        retained && retained !== request.src && !reduceMotion ? retained : null;
      setRequest((current) =>
        current && current.generation === request.generation
          ? { ...current, loaded: true, fadingFrom }
          : current
      );
      setLastGood({ src: request.src, generation: request.generation });
    },
    [request, retained]
  );

  useEffect(() => {
    if (
      request &&
      settled.current !== request.generation &&
      image.current?.complete
    ) {
      if (image.current.naturalWidth > 0) handleLoad(image.current);
    }
  }, [request, handleLoad]);

  useEffect(() => {
    if (!request?.fadingFrom) return;
    const generation = request.generation;
    const complete = () => finishFade(generation);
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const onPreferenceChange = () => {
      if (preference?.matches) complete();
    };
    preference?.addEventListener?.('change', onPreferenceChange);
    const timeout = window.setTimeout(complete, 300);
    return () => {
      window.clearTimeout(timeout);
      preference?.removeEventListener?.('change', onPreferenceChange);
    };
  }, [request?.fadingFrom, request?.generation, finishFade]);

  if (!request)
    return (
      <span
        className={slotClasses(
          'civ__thumbnail-placeholder',
          `grid place-items-center ${thumbnailImageClasses}`,
          className
        )}
      >
        {placeholder ?? index + 1}
      </span>
    );

  return (
    // The button applies its own padding/border, so absolute children positioned
    // with inset-0 here (a padding-free wrapper) always match the in-flow image's
    // content-box size exactly, avoiding CSS over-constraint size mismatches.
    <span className='civ__thumbnail-image-wrapper relative block size-full'>
      <img
        key={`${request.src}-${request.generation}`}
        ref={image}
        className={slotClasses(
          'civ__thumbnail-image',
          `${thumbnailImageClasses} absolute inset-0 z-[1] ${
            request.fadingFrom
              ? 'transition-opacity duration-300 ease-in-out motion-reduce:transition-none'
              : ''
          }`,
          className
        )}
        src={request.src}
        alt=''
        width={80}
        height={45}
        loading='lazy'
        decoding='async'
        draggable={false}
        onLoad={(event) => handleLoad(event.currentTarget)}
        onTransitionEnd={(event) => {
          if (
            event.target === event.currentTarget &&
            event.propertyName === 'opacity' &&
            image.current === event.currentTarget
          )
            finishFade(request.generation);
        }}
        style={{ opacity: retained && !request.loaded ? 0 : 1 }}
      />
      {retained && (
        <img
          className={slotClasses(
            'civ__thumbnail-image civ__thumbnail-image--retained',
            `${thumbnailImageClasses} absolute inset-0 z-0`,
            className
          )}
          src={retained}
          alt=''
          aria-hidden
          width={80}
          height={45}
          draggable={false}
        />
      )}
    </span>
  );
}

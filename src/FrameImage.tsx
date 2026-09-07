import { useCallback, useEffect, useRef, useState } from 'react';
import type { ViewerFrameChange, ViewerLabels } from './types.js';

interface Props {
  change: ViewerFrameChange;
  alt: string;
  labels: ViewerLabels;
  onImageError: ((error: Error, change: ViewerFrameChange) => void) | undefined;
}

export function FrameImage({ change, alt, labels, onImageError }: Props) {
  const image = useRef<HTMLImageElement>(null);
  const settled = useRef(false);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(
    'loading'
  );
  const [attempt, setAttempt] = useState(0);

  const handleError = useCallback(() => {
    if (settled.current) return;
    settled.current = true;
    setStatus('error');
    onImageError?.(new Error('Viewer image failed to load.'), change);
  }, [change, onImageError]);

  useEffect(() => {
    if (!settled.current && image.current?.complete) {
      if (image.current.naturalWidth > 0) {
        settled.current = true;
        setStatus('loaded');
      } else {
        handleError();
      }
    }
  }, [attempt, handleError]);

  return (
    <>
      <img
        key={attempt}
        ref={image}
        className='civ__image'
        src={change.frame.src}
        alt={alt}
        draggable={false}
        decoding='async'
        onLoad={() => {
          settled.current = true;
          setStatus('loaded');
        }}
        onError={handleError}
        style={{ visibility: status === 'error' ? 'hidden' : 'visible' }}
      />
      {status === 'loading' && (
        <div className='civ__status' role='status'>
          {labels.loading}
        </div>
      )}
      {status === 'error' && (
        <div className='civ__status' role='alert'>
          <span>{labels.error}</span>
          <button
            type='button'
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => {
              settled.current = false;
              setStatus('loading');
              setAttempt((value) => value + 1);
            }}
          >
            {labels.retry}
          </button>
        </div>
      )}
    </>
  );
}

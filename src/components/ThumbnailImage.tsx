import { useState } from 'react';
import {
  loadingVeilClasses,
  thumbnailImageClasses,
} from '../constants/tailwind.js';
import { slotClasses } from '../utils/classes.js';

interface Props {
  src: string;
  ready: boolean;
  index: number;
  placeholder?: string;
  className?: string | undefined;
}

export function ThumbnailImage({
  src,
  ready,
  index,
  placeholder,
  className,
}: Props) {
  const [displayed, setDisplayed] = useState<string | undefined>(
    ready ? src : undefined
  );
  if (ready && displayed !== src) setDisplayed(src);
  return (
    <span
      className={slotClasses(
        'civ__thumbnail-placeholder',
        'relative grid h-[36px] w-[64px] place-items-center',
        className
      )}
    >
      {displayed ? (
        <>
          <img
            className={slotClasses(
              'civ__thumbnail-image',
              thumbnailImageClasses,
              className
            )}
            src={displayed}
            alt=''
            width={80}
            height={45}
            loading='lazy'
            decoding='async'
            draggable={false}
          />
          {displayed !== src && <span className={loadingVeilClasses} />}
        </>
      ) : (
        (placeholder ?? index + 1)
      )}
    </span>
  );
}

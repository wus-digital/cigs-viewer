import { useState } from 'react';
import { thumbnailImageClasses } from '../constants/tailwind.js';
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
  if (!displayed)
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
  );
}

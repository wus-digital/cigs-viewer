import { useState } from 'react';
import { loadingVeilClasses } from '../constants/tailwind.js';

interface Props {
  src: string;
  ready: boolean;
  index: number;
  placeholder?: string;
}

export function ThumbnailImage({ src, ready, index, placeholder }: Props) {
  const [displayed, setDisplayed] = useState<string | undefined>(
    ready ? src : undefined
  );
  if (ready && displayed !== src) setDisplayed(src);
  return (
    <span className='civ__thumbnail-placeholder relative grid h-[36px] w-[64px] place-items-center'>
      {displayed ? (
        <>
          <img
            className='block h-[36px] w-[64px] object-contain'
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

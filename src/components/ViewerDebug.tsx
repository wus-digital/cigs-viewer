import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import type { ViewerLabels } from '../types/viewer.js';

interface Props {
  viewport: RefObject<HTMLDivElement | null>;
  cameraId: string | undefined;
  scale: number;
  labels: ViewerLabels;
}

interface DisplayedImage {
  src: string;
  width: number;
  height: number;
}

export function ViewerDebug({ viewport, cameraId, scale, labels }: Props) {
  const [image, setImage] = useState<DisplayedImage | null>(null);

  useEffect(() => {
    const stage = viewport.current;
    if (!stage) return;
    const update = () => {
      // Inspect painted foreground layers, including retained images and the 4K overlay.
      const displayed = [
        ...stage.querySelectorAll<HTMLImageElement>('.civ__track .civ__image'),
      ]
        .sort(
          (left, right) =>
            Number(right.dataset.civLayer ?? 0) -
            Number(left.dataset.civLayer ?? 0)
        )
        .find(
          (element) =>
            element.naturalWidth > 0 &&
            !element.closest('[hidden]') &&
            window.getComputedStyle(element).visibility === 'visible' &&
            window.getComputedStyle(element).opacity !== '0'
        );
      const next = displayed
        ? {
            src: displayed.currentSrc || displayed.src,
            width: displayed.naturalWidth,
            height: displayed.naturalHeight,
          }
        : null;
      setImage((previous) =>
        previous?.src === next?.src &&
        previous?.width === next?.width &&
        previous?.height === next?.height
          ? previous
          : next
      );
    };
    const observer = new window.MutationObserver(update);
    observer.observe(stage, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['src', 'style', 'class', 'hidden'],
    });
    stage.addEventListener('load', update, true);
    stage.addEventListener('error', update, true);
    update();
    return () => {
      observer.disconnect();
      stage.removeEventListener('load', update, true);
      stage.removeEventListener('error', update, true);
    };
  }, [viewport]);

  return (
    <dl
      className='civ__debug m-0 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-[12px] gap-y-[6px] border-t border-black/15 p-[12px] font-mono text-[12px] leading-[1.5] [&_dd]:m-0 [&_dd]:[overflow-wrap:anywhere] [&_dt]:font-semibold'
      aria-label={labels.debug ?? 'Viewer debug'}
    >
      <dt>{labels.debugCamera ?? 'Camera'}</dt>
      <dd data-debug='camera'>{cameraId ?? '-'}</dd>
      <dt>{labels.debugImage ?? 'Displayed image'}</dt>
      <dd data-debug='image'>{image?.src ?? '-'}</dd>
      <dt>{labels.debugResolution ?? 'Original resolution'}</dt>
      <dd data-debug='resolution'>
        {image ? `${image.width} x ${image.height} px` : '-'}
      </dd>
      <dt>{labels.debugZoom ?? 'Zoom'}</dt>
      <dd data-debug='zoom'>{scale.toFixed(2)}x</dd>
    </dl>
  );
}

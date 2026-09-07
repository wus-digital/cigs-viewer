import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import type { ViewerLabels } from '../types/viewer.js';
import { debugClasses } from '../constants/tailwind.js';
import { slotClasses } from '../utils/classes.js';

interface Props {
  viewport: RefObject<HTMLDivElement | null>;
  cameraId: string | undefined;
  scale: number;
  labels: ViewerLabels;
  viewportElement?: HTMLDivElement | null;
  className?: string | undefined;
}

interface DisplayedImage {
  src: string;
  width: number;
  height: number;
}

export function ViewerDebug({
  viewport,
  viewportElement,
  cameraId,
  scale,
  labels,
  className,
}: Props) {
  const [image, setImage] = useState<DisplayedImage | null>(null);
  const displayedImage = viewportElement === null ? null : image;

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
  }, [viewport, viewportElement]);

  return (
    <dl
      className={slotClasses('civ__debug', debugClasses, className)}
      aria-label={labels.debug ?? 'Viewer debug'}
    >
      <dt>{labels.debugCamera ?? 'Camera'}</dt>
      <dd data-debug='camera'>{cameraId ?? '-'}</dd>
      <dt>{labels.debugImage ?? 'Displayed image'}</dt>
      <dd data-debug='image'>{displayedImage?.src ?? '-'}</dd>
      <dt>{labels.debugResolution ?? 'Original resolution'}</dt>
      <dd data-debug='resolution'>
        {displayedImage
          ? `${displayedImage.width} x ${displayedImage.height} px`
          : '-'}
      </dd>
      <dt>{labels.debugZoom ?? 'Zoom'}</dt>
      <dd data-debug='zoom'>{scale.toFixed(2)}x</dd>
    </dl>
  );
}

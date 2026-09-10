import { useEffect, useState, type RefObject } from 'react';

interface Props {
  viewerRoot: RefObject<HTMLElement | null>;
  cameraId: string | undefined;
}

interface DisplayedImage {
  src: string;
  width: number;
  height: number;
}

function readScale(element: Element | null) {
  if (!(element instanceof HTMLElement)) return 1;
  const transform = window.getComputedStyle(element).transform;
  if (transform === 'none') return 1;
  const matrix = new DOMMatrixReadOnly(transform);
  return Math.sqrt(matrix.a ** 2 + matrix.b ** 2);
}

export function ViewerDebugPanel({ viewerRoot, cameraId }: Props) {
  const [image, setImage] = useState<DisplayedImage | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const root = viewerRoot.current;
    if (!root) return;

    const update = () => {
      const displayed = [
        ...root.querySelectorAll<HTMLImageElement>('.civ__track .civ__image'),
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
      const nextImage = displayed
        ? {
            src: displayed.currentSrc || displayed.src,
            width: displayed.naturalWidth,
            height: displayed.naturalHeight,
          }
        : null;
      setImage((previous) =>
        previous?.src === nextImage?.src &&
        previous?.width === nextImage?.width &&
        previous?.height === nextImage?.height
          ? previous
          : nextImage
      );
      setScale(readScale(root.querySelector('.civ__zoom-layer')));
    };

    const observer = new window.MutationObserver(update);
    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['src', 'style', 'class', 'hidden'],
    });
    root.addEventListener('load', update, true);
    root.addEventListener('error', update, true);
    update();

    return () => {
      observer.disconnect();
      root.removeEventListener('load', update, true);
      root.removeEventListener('error', update, true);
    };
  }, [viewerRoot]);

  return (
    <dl
      className='m-0 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1.5 font-mono text-xs leading-[1.5] text-slate-700 [&_dd]:m-0 [&_dd]:[overflow-wrap:anywhere] [&_dt]:font-semibold'
      aria-label='Viewer-Debug'
    >
      <dt>Kamera</dt>
      <dd data-debug='camera'>{cameraId ?? '-'}</dd>
      <dt>Angezeigtes Bild</dt>
      <dd data-debug='image'>{image?.src ?? '-'}</dd>
      <dt>Originalaufloesung</dt>
      <dd data-debug='resolution'>
        {image ? `${image.width} x ${image.height} px` : '-'}
      </dd>
      <dt>Zoomstufe</dt>
      <dd data-debug='zoom'>{scale.toFixed(2)}x</dd>
    </dl>
  );
}

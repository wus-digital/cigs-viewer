import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import { adjacentSourceBatches, frameIdentity } from '../utils/frames.js';
import { ImageLoadQueue } from '../utils/image-load-queue.js';
import type { ViewerFrame } from '../types/viewer.js';

export function useFrameLoading(
  frames: readonly ViewerFrame[],
  frameIndex: number,
  radius: number | 'all',
  loop: boolean,
  showThumbnails: boolean,
  scope = ''
) {
  const plan = useMemo(() => {
    const current = frames[frameIndex]?.src;
    const batches = adjacentSourceBatches(
      frames,
      frameIndex,
      radius === 'all' ? frames.length - 1 : radius,
      loop
    );
    const scheduled = new Set([current, ...batches.flat()]);
    if (showThumbnails) {
      for (const { thumbnailSrc } of frames) {
        if (frames.length > 1 && thumbnailSrc && !scheduled.has(thumbnailSrc)) {
          batches.push([thumbnailSrc]);
          scheduled.add(thumbnailSrc);
        }
      }
    }
    const frameSources = new Map(
      frames.map((frame, index) => [frameIdentity(frame, index), frame.src])
    );
    return {
      key: JSON.stringify([current, batches, [...frameSources]]),
      current,
      batches,
      frames: frameSources,
    };
  }, [frames, frameIndex, radius, loop, showThumbnails]);
  const [state, setState] = useState(() => ({
    scope,
    queue: new ImageLoadQueue(plan),
  }));
  if (state.scope !== scope) {
    setState({ scope, queue: new ImageLoadQueue(plan) });
  }
  const { queue } = state;
  const snapshot = useSyncExternalStore(
    queue.subscribe,
    queue.getSnapshot,
    queue.getServerSnapshot
  );

  // `useLayoutEffect` (not `useEffect`) is required here: `plan.key` can
  // change (e.g. a frame's src/thumbnailSrc resolving) more often than the
  // *current* frame actually changes. `enabled` below is derived from
  // `snapshot.key === plan.key`, so a plan change makes it briefly false
  // until this effect reconciles the queue with the new plan. A passive
  // `useEffect` runs after the browser has already painted, so that
  // momentary "false" would flash on screen (image hidden -> dark
  // background shows through). A layout effect runs before paint, so the
  // reconciliation - and any resulting re-render - completes invisibly.
  useLayoutEffect(() => {
    queue.start(plan);
  }, [queue, plan]);
  useEffect(() => () => queue.stop(), [queue]);

  const onSettled = useCallback(
    (image: HTMLImageElement, loaded: boolean) => {
      queue.settleCurrent(plan.key, image, loaded);
    },
    [queue, plan.key]
  );
  const onRetry = useCallback(
    () => queue.retryCurrent(plan.key),
    [queue, plan.key]
  );

  return {
    enabled: snapshot.key === plan.key,
    loadedSources: snapshot.loaded,
    failedSources: snapshot.failed,
    retainedSources: snapshot.retained,
    onSettled,
    onRetry,
  };
}

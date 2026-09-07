import {
  useCallback,
  useEffect,
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
  alternateThumbnail: string | undefined,
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
      if (alternateThumbnail && !scheduled.has(alternateThumbnail)) {
        batches.push([alternateThumbnail]);
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
  }, [frames, frameIndex, radius, loop, showThumbnails, alternateThumbnail]);
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

  useEffect(() => {
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

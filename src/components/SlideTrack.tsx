import type { ReactNode, TransitionEventHandler } from 'react';
import type { SlideMotion } from '../hooks/useSlideDrag.js';
import { frameIdentity, normalizeFrame } from '../utils/frames.js';
import type {
  ViewerFrame,
  ViewerLabels,
  ViewerViewMode,
} from '../types/viewer.js';
import { FrameImage } from './FrameImage.js';
import { fill, statusClasses } from '../constants/tailwind.js';

interface Props {
  frames: readonly ViewerFrame[];
  alternateFrame: ViewerFrame | undefined;
  frameIndex: number;
  viewMode: ViewerViewMode;
  loop: boolean;
  labels: ViewerLabels;
  motion: SlideMotion;
  onTransitionEnd: TransitionEventHandler<HTMLDivElement>;
  children: ReactNode;
  loadedSources: ReadonlySet<string>;
  failedSources: ReadonlySet<string>;
  retainedSources: ReadonlyMap<string, string>;
}

export function SlideTrack({
  frames,
  alternateFrame,
  frameIndex,
  viewMode,
  loop,
  labels,
  motion,
  onTransitionEnd,
  children,
  loadedSources,
  failedSources,
  retainedSources,
}: Props) {
  const { offset, active, settling, direction } = motion;
  const transitionClasses = settling
    ? motion.programmatic
      ? 'transition-transform duration-[600ms] ease-[cubic-bezier(0.45,0,0.2,1)] motion-reduce:transition-none'
      : 'transition-transform duration-[220ms] ease-[cubic-bezier(0.22,0.61,0.36,1)] motion-reduce:transition-none'
    : '';
  // Center reversed or cancelled targets so changing direction cannot expose gaps.
  const parallax =
    offset * direction > 0 || (settling && offset === 0)
      ? '0px'
      : `clamp(${direction > 0 ? '0px' : '-20%'}, calc(${direction * 20}% + ${offset * 0.2}px), ${direction > 0 ? '20%' : '0px'})`;
  const target = frameIndex + direction;
  const neighborIndex =
    motion.targetIndex ?? normalizeFrame(target, frames.length, loop);
  const neighbor =
    motion.switchingView && active
      ? alternateFrame
      : active &&
          frames.length > 1 &&
          (loop || (target >= 0 && target < frames.length))
        ? frames[neighborIndex]
        : undefined;
  const retainedSrc =
    neighbor && !motion.switchingView
      ? retainedSources.get(frameIdentity(neighbor, neighborIndex))
      : undefined;
  return (
    <div className={`civ__slider ${fill} isolate`}>
      <div
        className={`${fill} z-[1] bg-[var(--civ-background)] ${transitionClasses} ${
          settling
            ? motion.programmatic
              ? 'civ__track civ__track--settling civ__track--navigation'
              : 'civ__track civ__track--settling'
            : 'civ__track'
        }`}
        style={{ transform: `translate3d(${offset}px, 0, 0)` }}
        onTransitionEnd={onTransitionEnd}
      >
        <div className={`civ__slide ${fill}`}>{children}</div>
      </div>
      {neighbor && (
        <div
          className={`${fill} pointer-events-none z-0 ${transitionClasses} ${
            settling
              ? motion.programmatic
                ? 'civ__slide civ__slide--neighbor civ__slide--settling civ__slide--navigation'
                : 'civ__slide civ__slide--neighbor civ__slide--settling'
              : 'civ__slide civ__slide--neighbor'
          }`}
          style={{ transform: `translate3d(${parallax}, 0, 0)` }}
          aria-hidden='true'
        >
          {loadedSources.has(neighbor.src) || retainedSrc ? (
            <FrameImage
              key={neighbor.src}
              change={{
                viewMode: motion.switchingView
                  ? viewMode === 'exterior'
                    ? 'interior'
                    : 'exterior'
                  : viewMode,
                frameIndex: neighborIndex,
                frame: neighbor,
              }}
              alt=''
              labels={labels}
              onImageError={undefined}
              preview
              enabled={loadedSources.has(neighbor.src)}
              fallbackSrc={retainedSrc}
            />
          ) : (
            <div className={statusClasses}>
              {failedSources.has(neighbor.src) ? labels.error : labels.loading}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

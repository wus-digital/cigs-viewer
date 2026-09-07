import type { ViewerFrame } from '../types/viewer.js';

export function normalizeFrame(
  index: number,
  count: number,
  loop: boolean
): number {
  if (count === 0) return 0;
  return loop
    ? ((index % count) + count) % count
    : Math.max(0, Math.min(index, count - 1));
}

export function adjacentSources(
  frames: readonly ViewerFrame[],
  index: number,
  radius: number,
  loop: boolean
): string[] {
  const sources = new Set<string>();
  for (let offset = 1; offset <= radius; offset++) {
    for (const direction of [-1, 1]) {
      const frame =
        frames[normalizeFrame(index + direction * offset, frames.length, loop)];
      if (frame && frame.src !== frames[index]?.src) sources.add(frame.src);
    }
  }
  return [...sources];
}

export function validateFrames(
  frames: readonly ViewerFrame[],
  name: string
): void {
  for (const [index, frame] of frames.entries()) {
    if (typeof frame?.src !== 'string' || !frame.src.trim()) {
      throw new TypeError(
        `${name}[${index}].src must be a non-empty image URL.`
      );
    }
  }
}

export function validateInteger(
  value: number,
  name: string,
  min: number,
  max = Number.MAX_SAFE_INTEGER
): void {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new RangeError(
      `${name} must be an integer between ${min} and ${max}.`
    );
  }
}

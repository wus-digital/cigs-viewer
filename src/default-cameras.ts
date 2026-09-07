import type { ViewerCamera } from './types.js';

export const DEFAULT_EXTERIOR_CAMERAS: readonly ViewerCamera[] = Object.freeze(
  ['C1', 'C2', 'C3', 'C4', 'C5', 'C9', 'C10'].map((id) => Object.freeze({ id }))
);

export const DEFAULT_INTERIOR_CAMERAS: readonly ViewerCamera[] = Object.freeze(
  ['C6', 'C7', 'C8', 'C11', 'C12', 'C13', 'C14'].map((id) =>
    Object.freeze({ id })
  )
);

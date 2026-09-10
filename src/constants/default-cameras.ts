const EXTERIOR_CAMERAS = (
  ['C1', 'C2', 'C3', 'C4', 'C5', 'C8', 'C9', 'C10'] as const
).map((id) => Object.freeze({ id }));

const INTERIOR_CAMERAS = (
  ['C6', 'C7', 'C11', 'C12', 'C13', 'C14'] as const
).map((id) => Object.freeze({ id }));

/**
 * The full system camera catalog, in default swipe order. The viewer no
 * longer distinguishes exterior/interior cameras - they're just cameras -
 * so this single flat, frozen list is the only default camera export.
 */
export const DEFAULT_CAMERAS = Object.freeze([
  ...EXTERIOR_CAMERAS,
  ...INTERIOR_CAMERAS,
]);

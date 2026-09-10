/**
 * The full system camera catalog, in default swipe order. The viewer
 * doesn't distinguish exterior/interior cameras - they're just cameras C1
 * through C15 - so this single flat, frozen list is the only default
 * camera export.
 */
export const DEFAULT_CAMERAS = Object.freeze(
  (
    [
      'C1',
      'C2',
      'C3',
      'C4',
      'C5',
      'C6',
      'C7',
      'C8',
      'C9',
      'C10',
      'C11',
      'C12',
      'C13',
      'C14',
      'C15',
    ] as const
  ).map((id) => Object.freeze({ id })),
);

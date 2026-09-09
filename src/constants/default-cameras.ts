export const EXTERIOR_CAMERAS = Object.freeze(
  (['C1', 'C2', 'C3', 'C4', 'C5', 'C8', 'C9', 'C10'] as const).map((id) =>
    Object.freeze({ id })
  )
);

export const INTERIOR_CAMERAS = Object.freeze(
  (['C6', 'C7', 'C11', 'C12', 'C13', 'C14'] as const).map((id) =>
    Object.freeze({ id })
  )
);

export const DEFAULT_EXTERIOR_CAMERAS = EXTERIOR_CAMERAS;
export const DEFAULT_INTERIOR_CAMERAS = INTERIOR_CAMERAS;

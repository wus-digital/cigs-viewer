export const fill = 'absolute inset-0 size-full';
export const imageClasses =
  'civ__image pointer-events-none block size-full max-w-none object-contain';
export const statusClasses =
  'civ__status absolute inset-0 z-[2] flex flex-col items-center justify-center gap-[12px] p-[16px] text-center';
export const loadingVeilClasses =
  'civ__loading-veil pointer-events-none absolute inset-0 z-[1] bg-black/20';
export const buttonInteraction =
  '[font-family:inherit] cursor-pointer disabled:cursor-default disabled:opacity-45 focus-visible:outline-[3px] focus-visible:outline-solid focus-visible:outline-[var(--civ-accent)] focus-visible:outline-offset-[-3px]';
export const buttonClasses = `${buttonInteraction} min-h-[44px] rounded-[4px] border border-current bg-transparent px-[12px] py-[8px]`;
export const thumbnailButtonClasses = `${buttonInteraction} relative min-h-[44px] min-w-[68px] flex-none rounded-[3px] border-2 border-transparent bg-black/25 p-[2px] text-white opacity-65 enabled:hover:opacity-100 aria-pressed:border-white aria-pressed:opacity-100 aria-pressed:shadow-[0_0_0_1px_rgb(0_0_0/25%)]`;
export const arrowClasses = `${buttonInteraction} pointer-events-auto absolute top-1/2 grid h-[56px] w-[44px] -translate-y-1/2 place-items-center border-0 bg-transparent p-[8px] text-white enabled:hover:bg-black/45`;

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
export const arrowClasses = `${buttonInteraction} pointer-events-auto grid h-[56px] w-[44px] place-items-center border-0 bg-transparent p-[8px] text-white enabled:hover:bg-black/45`;
export const rootClasses =
  'box-border w-full min-w-0 bg-[var(--civ-background)] [font-family:inherit] text-[var(--civ-foreground)] [--civ-accent:#176bba] [--civ-aspect-ratio:16/9] [--civ-background:#f4f4f4] [--civ-foreground:#181818] [&_*]:box-border';
export const viewportClasses =
  'relative aspect-[var(--civ-aspect-ratio)] w-full overflow-hidden select-none focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--civ-accent)] focus-visible:outline-solid';
export const thumbnailsClasses =
  'flex w-max max-w-[calc(100%_-_24px)] [touch-action:pan-x_pan-y] gap-[6px] overflow-x-auto p-[3px] [scrollbar-color:rgb(255_255_255/50%)_transparent] [scrollbar-width:thin]';
export const thumbnailImageClasses = 'block h-[36px] w-[64px] object-contain';
export const zoomResetClasses = `${buttonInteraction} min-h-[44px] rounded-[4px] border border-white/50 bg-black/55 px-[12px] py-[8px] text-[12px] text-white hover:bg-black/45`;
export const debugClasses =
  'm-0 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-[12px] gap-y-[6px] border-t border-black/15 p-[12px] font-mono text-[12px] leading-[1.5] [&_dd]:m-0 [&_dd]:[overflow-wrap:anywhere] [&_dt]:font-semibold';

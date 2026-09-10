export const fill = 'absolute inset-0 size-full';
export const imageClasses =
  'civ__image pointer-events-none block size-full max-w-none object-contain [[data-fullscreen=true]_&]:object-cover';
export const statusClasses =
  'civ__status absolute inset-0 z-[2] flex flex-col items-center justify-center gap-[12px] p-[16px] text-center';
export const loadingVeilClasses =
  'civ__loading-veil pointer-events-none absolute inset-0 z-[1] bg-black/20 transition-opacity duration-[200ms] ease-in-out motion-reduce:transition-none';
export const buttonInteraction =
  '[font-family:inherit] cursor-pointer disabled:cursor-default disabled:opacity-45 focus-visible:outline-[3px] focus-visible:outline-solid focus-visible:outline-[var(--civ-accent)] focus-visible:outline-offset-[-3px]';
export const buttonClasses = `${buttonInteraction} min-h-[44px] rounded-[4px] border border-current bg-transparent px-[12px] py-[8px]`;
export const thumbnailButtonClasses = `${buttonInteraction} relative w-20 h-[45px] flex flex-none p-[2px] rounded-[3px] border-2 border-transparent text-white transition-all duration-200 overflow-hidden opacity-60 enabled:hover:opacity-90 enabled:hover:ring-2 enabled:hover:ring-white/40 aria-pressed:opacity-100 aria-pressed:border-white`;
export const arrowClasses = `${buttonInteraction} pointer-events-auto grid h-[56px] w-[44px] place-items-center border-0 bg-transparent p-[8px] text-white enabled:hover:bg-black/45`;
export const rootClasses =
  'box-border w-full min-w-0 bg-[var(--civ-background)] [font-family:inherit] text-[var(--civ-foreground)] [--civ-accent:#176bba] [--civ-aspect-ratio:16/9] [--civ-background:#f4f4f4] [--civ-foreground:#181818] [&_*]:box-border';
export const viewportClasses =
  'relative aspect-[var(--civ-aspect-ratio)] w-full overflow-hidden select-none focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--civ-accent)] focus-visible:outline-solid';
export const thumbnailsClasses =
  'flex w-max max-w-[calc(100%_-_24px)] [touch-action:pan-x_pan-y] justify-center items-center gap-2 overflow-x-auto p-[3px] [scrollbar-color:rgb(255_255_255/50%)_transparent] [scrollbar-width:thin]';
export const toolbarClasses =
  'absolute bottom-[8px] left-[12px] right-[12px] z-[3] flex items-center justify-center gap-[80px]';
export const toolbarThumbnailsClasses = 'max-w-none min-w-0 pr-0';
export const toolbarActionsClasses = 'flex flex-none items-center gap-1';
export const toolbarActionsMirrorClasses =
  'flex flex-none items-center gap-1 invisible pointer-events-none';
export const thumbnailImageClasses =
  'w-full h-full object-cover object-center rounded-[2px]';
export const zoomResetClasses = `${buttonInteraction} min-h-[44px] rounded-[4px] border border-white/50 bg-black/55 px-[12px] py-[8px] text-[12px] text-white hover:bg-black/45`;
export const fullscreenButtonClasses = `${buttonInteraction} pointer-events-auto grid h-[37px] w-[37px] flex-none place-items-center rounded-[3px] border-0 bg-black/55 p-[8px] text-white enabled:hover:bg-black/45`;
export const actionButtonClasses = fullscreenButtonClasses;
export const controlsAgendaClasses =
  'pointer-events-none absolute top-[8px] left-[8px] z-[3] max-w-[calc(100%_-_16px)] rounded-[4px] bg-black/55 px-[10px] py-[6px] text-[12px] leading-[1.4] text-white [overflow-wrap:anywhere]';

import {
  CigsViewerActionButton,
  CigsViewerFullscreenButton,
  CigsViewerNextButton,
  CigsViewerPreviousButton,
  CigsViewerZoomResetButton,
} from './CigsViewerButtons.js';
import { CigsViewerThumbnails } from './CigsViewerThumbnails.js';
import { useViewerContext, ViewerLayoutContext } from './ViewerContext.js';
import { slotClasses } from '../utils/classes.js';
import {
  toolbarActionsClasses,
  toolbarActionsMirrorClasses,
  toolbarClasses,
  toolbarThumbnailsClasses,
} from '../constants/tailwind.js';

export function ViewerControls() {
  const { classNames, actions } = useViewerContext('ViewerControls');
  const actionButtons = actions?.map((action) => (
    <CigsViewerActionButton key={action.key ?? action.label} action={action} />
  ));
  return (
    <ViewerLayoutContext.Provider
      value={{
        previousButton: 'absolute top-1/2 left-[4px] -translate-y-1/2',
        nextButton: 'absolute top-1/2 right-[4px] -translate-y-1/2',
        zoomResetButton: 'absolute top-[8px] right-[8px] z-[3]',
      }}
    >
      <div
        className={slotClasses(
          'civ__navigation',
          'pointer-events-none absolute inset-0 z-[3]',
          classNames?.navigation
        )}
      >
        <CigsViewerPreviousButton />
        <CigsViewerNextButton />
      </div>
      <div
        className={slotClasses('civ__toolbar', toolbarClasses, classNames?.toolbar)}
      >
        <div className={toolbarActionsClasses}>
          {actionButtons}
          <CigsViewerFullscreenButton />
        </div>
        <CigsViewerThumbnails className={toolbarThumbnailsClasses} />
        {/*
          Invisible mirror of the actions group: keeps the thumbnails perfectly
          centered by giving the grid's outer columns matching intrinsic widths,
          regardless of how many action buttons are configured.
        */}
        <div className={toolbarActionsMirrorClasses} aria-hidden='true' inert>
          {actionButtons}
          <CigsViewerFullscreenButton />
        </div>
      </div>
      <CigsViewerZoomResetButton />
    </ViewerLayoutContext.Provider>
  );
}


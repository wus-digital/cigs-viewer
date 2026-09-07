import {
  CigsViewerNextButton,
  CigsViewerPreviousButton,
  CigsViewerZoomResetButton,
} from './CigsViewerButtons.js';
import { CigsViewerThumbnails } from './CigsViewerThumbnails.js';
import { useViewerContext, ViewerLayoutContext } from './ViewerContext.js';
import { slotClasses } from '../utils/classes.js';

export function ViewerControls() {
  const { classNames } = useViewerContext('ViewerControls');
  return (
    <ViewerLayoutContext.Provider
      value={{
        previousButton: 'absolute top-1/2 left-[4px] -translate-y-1/2',
        nextButton: 'absolute top-1/2 right-[4px] -translate-y-1/2',
        thumbnails: 'absolute bottom-[8px] left-1/2 z-[3] -translate-x-1/2',
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
      <CigsViewerThumbnails />
      <CigsViewerZoomResetButton />
    </ViewerLayoutContext.Provider>
  );
}

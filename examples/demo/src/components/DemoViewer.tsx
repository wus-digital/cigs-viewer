import {
  CigsViewer,
  CigsViewerViewport,
  CigsViewerPreviousButton,
  CigsViewerNextButton,
  CigsViewerZoomResetButton,
  CigsViewerThumbnails,
  type CigsViewerProps,
} from 'cigs-viewer';
import {
  customNextClasses,
  customPreviousClasses,
  customThumbnailsClasses,
  customZoomClasses,
  styledClassNames,
  type ViewerLayout,
} from '../viewer-example.js';

interface Props extends CigsViewerProps {
  layout: ViewerLayout;
}

export function DemoViewer({ layout, ...props }: Props) {
  const styling = layout === 'styled' ? { classNames: styledClassNames } : {};
  return (
    <CigsViewer {...props} {...styling}>
      {layout === 'custom' ? (
        <>
          <CigsViewerViewport>
            <CigsViewerPreviousButton asChild>
              <button className={customPreviousClasses}>
                <svg
                  width='20'
                  height='20'
                  viewBox='0 0 24 24'
                  fill='none'
                  aria-hidden='true'
                >
                  <path
                    d='m15 5-7 7 7 7'
                    stroke='currentColor'
                    strokeWidth='1.5'
                  />
                </svg>
              </button>
            </CigsViewerPreviousButton>
            <CigsViewerNextButton asChild>
              <button className={customNextClasses}>
                <svg
                  width='20'
                  height='20'
                  viewBox='0 0 24 24'
                  fill='none'
                  aria-hidden='true'
                >
                  <path
                    d='m9 5 7 7-7 7'
                    stroke='currentColor'
                    strokeWidth='1.5'
                  />
                </svg>
              </button>
            </CigsViewerNextButton>
            <CigsViewerZoomResetButton className={customZoomClasses} />
          </CigsViewerViewport>
          <CigsViewerThumbnails className={customThumbnailsClasses} />
        </>
      ) : undefined}
    </CigsViewer>
  );
}

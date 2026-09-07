import type {
  CigsViewerProps,
  ViewerFrameChange,
  ViewerCameraId,
  ViewerClassNames,
  CigsViewerButtonProps,
  CigsViewerViewportProps,
  CigsViewerThumbnailsProps,
} from 'cigs-viewer';
import {
  CigsViewer,
  CigsViewerViewport,
  CigsViewerPreviousButton,
  CigsViewerNextButton,
  CigsViewerZoomResetButton,
  CigsViewerThumbnails,
  CigsViewerViewSwitchButton,
} from 'cigs-viewer';
import { createElement, createRef } from 'react';

const props: CigsViewerProps = {
  configuration: { B: '01', M: '01', count: 0, missing: undefined },
  baseUrl: '/renders',
  exteriorCameras: [{ id: 'C360_001' }],
  interiorCameras: [{ id: 'CINT_DASH' }],
  cameraId: 'C360_001',
  dragMode: 'slide',
  preloadRadius: 'all',
  enableZoom: true,
  onFrameChange: (change: ViewerFrameChange) => {
    const camera: string = change.frame.cameraId;
    return camera;
  },
};

export const invalidUrls: CigsViewerProps = {
  ...props,
  // @ts-expect-error Public input is configuration plus cameras, never image URLs.
  exteriorFrames: [{ src: '/manual.webp' }],
};
export const invalidQuality: CigsViewerProps = {
  ...props,
  // @ts-expect-error Only CIGS render quality tags are supported.
  quality: 'low',
};
export const invalidZoom: CigsViewerProps = {
  ...props,
  // @ts-expect-error Zoom activation is a boolean.
  enableZoom: 'wheel',
};
export const defaultCameras: CigsViewerProps = {
  configuration: { B: '01' },
  baseUrl: '/renders',
};

export const viewer = createElement(CigsViewer, defaultCameras);
const classNames: ViewerClassNames = {
  root: 'rounded-xl',
  viewport: 'aspect-square',
  navigation: 'z-20',
  previousButton: 'bg-white',
  nextButton: 'bg-white',
  zoomResetButton: 'rounded-full',
  thumbnails: 'gap-4',
  thumbnail: 'aria-pressed:border-blue-500',
  thumbnailImage: 'object-cover',
  viewSwitchButton: 'border-blue-500',
  debug: 'text-sm',
};
export const invalidSlot: ViewerClassNames = {
  // @ts-expect-error Unknown styling slots are rejected.
  imageTransform: 'scale-150',
};
const buttonProps: CigsViewerButtonProps = { asChild: true, className: 'p-4' };
const viewportProps: CigsViewerViewportProps = { className: 'aspect-square' };
const thumbnailsProps: CigsViewerThumbnailsProps = { className: 'gap-4' };
export const compoundViewer = createElement(
  CigsViewer,
  {
    ...defaultCameras,
    classNames,
    showThumbnails: true,
  },
  createElement(CigsViewerViewport, viewportProps),
  createElement(CigsViewerPreviousButton, {
    ref: createRef<HTMLButtonElement>(),
  }),
  createElement(
    CigsViewerNextButton,
    buttonProps,
    createElement('button', null, 'Next')
  ),
  createElement(CigsViewerZoomResetButton),
  createElement(CigsViewerThumbnails, thumbnailsProps),
  createElement(CigsViewerViewSwitchButton)
);
const selectedCameras: readonly ViewerCameraId[] = ['C1', 'C6'];
export const filteredViewer = createElement(CigsViewer, {
  ...defaultCameras,
  cameras: selectedCameras,
});
export const invalidCamera = createElement(CigsViewer, {
  ...defaultCameras,
  // @ts-expect-error Only system camera IDs are valid in the common selection.
  cameras: ['CUSTOM'],
});
export const sequenceViewer = createElement(CigsViewer, {
  ...props,
  dragMode: 'sequence',
});
export const invalidDragMode = createElement(CigsViewer, {
  ...props,
  // @ts-expect-error Only the supported gesture modes are accepted.
  dragMode: 'panorama',
});

// @ts-expect-error Configuration is required even when cameras use defaults.
export const missingConfiguration: CigsViewerProps = {
  baseUrl: '/renders',
};

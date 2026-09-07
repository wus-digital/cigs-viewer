import type {
  CigsViewerProps,
  ViewerFrameChange,
  ViewerCameraId,
} from 'cigs-viewer';
import { CigsViewer } from 'cigs-viewer';
import { createElement } from 'react';

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

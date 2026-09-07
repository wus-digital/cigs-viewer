import type { CigsViewerProps, ViewerFrameChange } from 'cigs-viewer';
import { CigsViewer } from 'cigs-viewer';
import { createElement } from 'react';

const props: CigsViewerProps = {
  configuration: { B: '01', M: '01', count: 0, missing: undefined },
  baseUrl: '/renders',
  exteriorCameras: [{ id: 'C360_001' }],
  interiorCameras: [{ id: 'CINT_DASH' }],
  cameraId: 'C360_001',
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
export const defaultCameras: CigsViewerProps = {
  configuration: { B: '01' },
  baseUrl: '/renders',
};

export const viewer = createElement(CigsViewer, defaultCameras);

// @ts-expect-error Configuration is required even when cameras use defaults.
export const missingConfiguration: CigsViewerProps = {
  baseUrl: '/renders',
};

import type {
  ConfiguratorImageViewerProps,
  ViewerFrameChange,
} from 'cigs-viewer';

const props: ConfiguratorImageViewerProps = {
  configuration: { B: 'GT3RS', M: '01', count: 0, missing: undefined },
  baseUrl: '/renders',
  exteriorCameras: [{ id: 'C360_001' }],
  interiorCameras: [{ id: 'CINT_DASH' }],
  cameraId: 'C360_001',
  onFrameChange: (change: ViewerFrameChange) => {
    const camera: string = change.frame.cameraId;
    return camera;
  },
};

export const invalidUrls: ConfiguratorImageViewerProps = {
  ...props,
  // @ts-expect-error Public input is configuration plus cameras, never image URLs.
  exteriorFrames: [{ src: '/manual.webp' }],
};
export const invalidQuality: ConfiguratorImageViewerProps = {
  ...props,
  // @ts-expect-error Only CIGS render quality tags are supported.
  quality: 'low',
};
export const defaultCameras: ConfiguratorImageViewerProps = {
  configuration: { B: 'GT3RS' },
  baseUrl: '/renders',
};

// @ts-expect-error Configuration is required even when cameras use defaults.
export const missingConfiguration: ConfiguratorImageViewerProps = {
  baseUrl: '/renders',
};

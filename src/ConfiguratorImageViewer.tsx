'use client';

import { useMemo } from 'react';
import { ImageFrameViewer } from './ImageFrameViewer.js';
import { buildViewerFrames } from './render-frames.js';
import type { ConfiguratorImageViewerProps } from './types.js';

export function ConfiguratorImageViewer({
  configuration,
  baseUrl,
  exteriorCameras,
  interiorCameras,
  quality = 'FHD',
  thumbnailQuality,
  omittedConfigurationKeys,
  ...controls
}: ConfiguratorImageViewerProps) {
  const frames = useMemo(
    () =>
      buildViewerFrames({
        configuration,
        baseUrl,
        exteriorCameras,
        interiorCameras,
        quality,
        ...(thumbnailQuality === undefined ? {} : { thumbnailQuality }),
        ...(omittedConfigurationKeys === undefined
          ? {}
          : { omittedConfigurationKeys }),
      }),
    [
      configuration,
      baseUrl,
      exteriorCameras,
      interiorCameras,
      quality,
      thumbnailQuality,
      omittedConfigurationKeys,
    ]
  );

  return <ImageFrameViewer {...controls} {...frames} />;
}

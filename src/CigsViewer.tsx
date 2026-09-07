'use client';

import { useMemo } from 'react';
import { ImageFrameViewer } from './ImageFrameViewer.js';
import { buildViewerFrames } from './render-frames.js';
import {
  DEFAULT_EXTERIOR_CAMERAS,
  DEFAULT_INTERIOR_CAMERAS,
} from './default-cameras.js';
import type { CigsViewerProps } from './types.js';

export function CigsViewer({
  configuration,
  baseUrl,
  exteriorCameras = DEFAULT_EXTERIOR_CAMERAS,
  interiorCameras = DEFAULT_INTERIOR_CAMERAS,
  quality = 'FHD',
  thumbnailQuality,
  omittedConfigurationKeys,
  ...controls
}: CigsViewerProps) {
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

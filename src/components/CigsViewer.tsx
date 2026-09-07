'use client';

import { useMemo } from 'react';
import { ImageFrameViewer } from './ImageFrameViewer.js';
import { buildViewerFrames } from '../utils/render-frames.js';
import type { CigsViewerProps } from '../types/viewer.js';

export function CigsViewer({
  configuration,
  baseUrl,
  cameras,
  exteriorCameras,
  interiorCameras,
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
        ...(cameras === undefined ? {} : { cameras }),
        ...(exteriorCameras === undefined ? {} : { exteriorCameras }),
        ...(interiorCameras === undefined ? {} : { interiorCameras }),
        quality,
        ...(thumbnailQuality === undefined ? {} : { thumbnailQuality }),
        ...(omittedConfigurationKeys === undefined
          ? {}
          : { omittedConfigurationKeys }),
      }),
    [
      configuration,
      baseUrl,
      cameras,
      exteriorCameras,
      interiorCameras,
      quality,
      thumbnailQuality,
      omittedConfigurationKeys,
    ]
  );

  return <ImageFrameViewer {...controls} {...frames} />;
}

import type { ViewerLabels } from '../types/viewer.js';

export const defaultLabels: ViewerLabels = {
  viewer: 'Product viewer',
  exterior: 'Exterior',
  interior: 'Interior',
  previous: 'Previous image',
  next: 'Next image',
  loading: 'Loading image...',
  empty: 'No images available for this view.',
  error: 'The image could not be loaded.',
  retry: 'Retry',
  frames: 'Choose an image',
  instructions:
    'Swipe horizontally or use the arrow keys. Home and End select the first and last image.',
  resetZoom: 'Reset zoom',
  zoomInstructions:
    'Use the mouse wheel to zoom, then drag to pan. Press Escape to reset.',
  fullscreen: 'View fullscreen',
  exitFullscreen: 'Exit fullscreen',
};

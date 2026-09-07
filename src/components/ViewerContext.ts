import { createContext, useContext } from 'react';
import type { useViewerController } from '../hooks/useViewerController.js';
import type { ViewerClassNames } from '../types/viewer.js';

export const ViewerLayoutContext = createContext<ViewerClassNames>({});

export const ViewerContext = createContext<
  ReturnType<typeof useViewerController> | undefined
>(undefined);

export function useViewerContext(component: string) {
  const context = useContext(ViewerContext);
  if (!context) {
    throw new Error(`${component} must be rendered inside CigsViewer.`);
  }
  return context;
}

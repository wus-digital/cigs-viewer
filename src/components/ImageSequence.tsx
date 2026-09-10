import { useViewerController } from '../hooks/useViewerController.js';
import type { ViewerControllerProps } from '../hooks/useViewerController.js';
import { ViewerContext } from './ViewerContext.js';
import { ViewerControls } from './ViewerControls.js';
import { CigsViewerViewport } from './CigsViewerViewport.js';

export function ImageSequence(props: ViewerControllerProps) {
  const context = useViewerController(props);
  return (
    <ViewerContext.Provider value={context}>
      {props.children === undefined ? (
        <CigsViewerViewport>
          <ViewerControls />
        </CigsViewerViewport>
      ) : (
        props.children
      )}
    </ViewerContext.Provider>
  );
}

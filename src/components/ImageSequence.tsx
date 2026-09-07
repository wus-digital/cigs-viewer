import { useViewerController } from '../hooks/useViewerController.js';
import type { ViewerControllerProps } from '../hooks/useViewerController.js';
import { ViewerContext } from './ViewerContext.js';
import { ViewerControls } from './ViewerControls.js';
import { ViewerDebug } from './ViewerDebug.js';
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
      {props.showDebug && (
        <ViewerDebug
          viewport={context.slide.viewport}
          viewportElement={context.viewportElement}
          cameraId={context.frame?.cameraId}
          scale={context.zoom.scale}
          labels={props.labels}
          className={props.classNames?.debug}
        />
      )}
    </ViewerContext.Provider>
  );
}

import type { ViewerCameraId } from 'cigs-viewer';
import { focusStyles } from '../utilities.js';

interface Props {
  cameras: readonly ViewerCameraId[];
  value: ViewerCameraId | undefined;
  onChange: (camera: ViewerCameraId | undefined) => void;
}

/**
 * Radio equivalent of `CameraSelector`: picks the single `defaultCamera`
 * initially shown on mount, restricted to the currently active `cameras`
 * selection - an explicitly chosen `defaultCamera` must exist in that
 * list, or `CigsViewer` throws. "Keine" leaves `defaultCamera` unset, so
 * `CigsViewer` falls back to its own implicit default (`'C2'`, or the
 * first camera if `'C2'` isn't selected).
 */
export function DefaultCameraSelector({ cameras, value, onChange }: Props) {
  return (
    <fieldset className='default-camera-selector mb-6 rounded-md border border-[#dce3eb] p-3'>
      <legend className='text-sm font-semibold'>Default-Kamera</legend>
      <div className='default-camera-options grid grid-cols-3 gap-2'>
        <label className='m-0 flex items-center gap-1.5 text-sm font-semibold'>
          <input
            type='radio'
            name='defaultCamera'
            className={`max-w-full ${focusStyles}`}
            checked={value === undefined}
            onChange={() => onChange(undefined)}
          />
          Keine (Standard: C2)
        </label>
        {cameras.map((id) => (
          <label
            className='m-0 flex items-center gap-1.5 text-sm font-semibold'
            key={id}
          >
            <input
              type='radio'
              name='defaultCamera'
              className={`max-w-full ${focusStyles}`}
              checked={value === id}
              onChange={() => onChange(id)}
            />
            {id}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

import { DEFAULT_CAMERAS, type ViewerCameraId } from 'cigs-viewer';
import { buttonBaseStyles, focusStyles } from '../utilities.js';

const presetStyles =
  `border-[#9caabd] bg-white px-1 py-2 text-[#18212d] ${buttonBaseStyles}`;

const allIds = DEFAULT_CAMERAS.map(({ id }) => id);

interface Props {
  cameras: readonly ViewerCameraId[];
  onChange: (cameras: readonly ViewerCameraId[]) => void;
}

export function CameraSelector({ cameras, onChange }: Props) {
  return (
    <fieldset className='camera-selector mb-6 rounded-md border border-[#dce3eb] p-3'>
      <legend className='text-sm font-semibold'>Kameras</legend>
      <div className='camera-presets grid grid-cols-3 gap-2'>
        <button className={presetStyles} type='button' onClick={() => onChange(allIds)}>
          Alle
        </button>
        <button className={presetStyles} type='button' onClick={() => onChange(['C1'])}>
          Nur C1
        </button>
        <button className={presetStyles} type='button' onClick={() => onChange(['C6'])}>
          Nur C6
        </button>
      </div>
      <div className='camera-options mt-3 grid grid-cols-3 gap-2'>
        {DEFAULT_CAMERAS.map(({ id }) => (
          <label className='m-0 flex items-center gap-1.5 text-sm font-semibold' key={id}>
            <input
              type='checkbox'
              className={`max-w-full ${focusStyles}`}
              checked={cameras.includes(id)}
              onChange={(event) =>
                onChange(
                  allIds.filter((candidate) =>
                    candidate === id
                      ? event.target.checked
                      : cameras.includes(candidate)
                  )
                )
              }
            />
            {id}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

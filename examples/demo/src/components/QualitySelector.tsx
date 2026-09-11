import { RENDER_QUALITIES, type RenderQuality } from 'cigs-viewer';
import { focusStyles } from '../utilities.js';

interface Props {
  value: RenderQuality;
  onChange: (value: RenderQuality) => void;
  label?: string;
}

function isRenderQuality(value: string): value is RenderQuality {
  return RENDER_QUALITIES.some((quality) => quality === value);
}

export function QualitySelector({
  value,
  onChange,
  label = 'Bildqualitaet',
}: Props) {
  return (
    <label className='mb-6 block text-sm font-semibold'>
      {label}
      <select
        className={`mt-2 block w-full rounded-md border border-[#9caabd] bg-white p-2.5 ${focusStyles}`}
        value={value}
        onChange={(event) => {
          if (!isRenderQuality(event.target.value)) {
            throw new TypeError('Unsupported render quality selected.');
          }
          onChange(event.target.value);
        }}
      >
        {RENDER_QUALITIES.map((quality) => (
          <option key={quality} value={quality}>
            {quality}
          </option>
        ))}
      </select>
    </label>
  );
}

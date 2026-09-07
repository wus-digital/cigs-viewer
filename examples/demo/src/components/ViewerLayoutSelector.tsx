import { useId } from 'react';
import { viewerLayouts, type ViewerLayout } from '../viewer-example.js';
import { focusStyles } from '../utilities.js';

interface Props {
  value: ViewerLayout;
  onChange: (value: ViewerLayout) => void;
}

export function ViewerLayoutSelector({ value, onChange }: Props) {
  const name = useId();
  return (
    <fieldset className='mb-6 grid gap-2 rounded-md border border-[#dce3eb] p-3'>
      <legend className='text-sm font-semibold'>Darstellung</legend>
      {viewerLayouts.map((option) => (
        <label key={option.value} className='flex items-center gap-2 text-sm'>
          <input
            type='radio'
            name={name}
            value={option.value}
            checked={value === option.value}
            className={`size-4 ${focusStyles}`}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}

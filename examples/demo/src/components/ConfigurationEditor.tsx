import { useRef, useState } from 'react';
import type { RenderConfiguration } from 'cigs-viewer';
import { parseConfiguration, type ConfigurationEntry } from '../configuration';
import { buttonBaseStyles, buttonStyles, inputStyles, paragraphStyles } from '../utilities.js';

interface Props {
  initialConfiguration: RenderConfiguration;
  onApply: (configuration: RenderConfiguration) => void;
}

export function ConfigurationEditor({ initialConfiguration, onApply }: Props) {
  const [entries, setEntries] = useState<ConfigurationEntry[]>(() =>
    Object.entries(initialConfiguration).map(([key, value], id) => ({
      id,
      key,
      value: String(value ?? ''),
    }))
  );
  const nextId = useRef(entries.length);
  const [error, setError] = useState<string | null>(null);

  function updateEntry(id: number, field: 'key' | 'value', value: string) {
    setEntries((current) =>
      current.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      )
    );
    setError(null);
  }

  return (
    <form
      aria-label='Konfiguration bearbeiten'
      onSubmit={(event) => {
        event.preventDefault();
        const result = parseConfiguration(entries);
        setError(result.error);
        if (result.configuration) onApply(result.configuration);
      }}
    >
      <p id='configuration-help' className={paragraphStyles}>
        Keys und Values bearbeiten, Paare hinzufuegen oder loeschen. Erst mit
        &quot;Konfiguration anwenden&quot; werden neue Bilder geladen.
      </p>
      <div className='configuration-entries grid gap-3'>
        {entries.map((entry, index) => (
          <div className='configuration-row grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2' key={entry.id}>
            <label className='m-0 block min-w-0 text-sm font-semibold'>
              Key {index + 1}
              <input
                type='text'
                className={inputStyles}
                value={entry.key}
                onChange={(event) =>
                  updateEntry(entry.id, 'key', event.target.value)
                }
                autoCapitalize='off'
                spellCheck={false}
              />
            </label>
            <label className='m-0 block min-w-0 text-sm font-semibold'>
              Value {index + 1}
              <input
                type='text'
                className={inputStyles}
                value={entry.value}
                onChange={(event) =>
                  updateEntry(entry.id, 'value', event.target.value)
                }
                autoCapitalize='off'
                spellCheck={false}
              />
            </label>
            <button
              type='button'
              className={`mt-3 ${buttonStyles}`}
              aria-label={`Paar ${index + 1} loeschen`}
              onClick={() => {
                setEntries((current) =>
                  current.filter(({ id }) => id !== entry.id)
                );
                setError(null);
              }}
            >
              Loeschen
            </button>
          </div>
        ))}
      </div>
      {entries.length === 0 && (
        <p role='status' className={paragraphStyles}>Keine Key-Value-Paare vorhanden.</p>
      )}
      <button
        type='button'
        className={`mt-3 ${buttonStyles}`}
        onClick={() => {
          const id = nextId.current++;
          setEntries((current) => [...current, { id, key: '', value: '' }]);
          setError(null);
        }}
      >
        + Paar hinzufuegen
      </button>
      {error && <p role='alert' className='my-4 leading-[1.6] text-[#a61919]'>{error}</p>}
      <button type='submit' aria-describedby='configuration-help' className={`mt-3 border-[#176bba] bg-[#176bba] px-3 py-2.5 text-white ${buttonBaseStyles}`}>
        Konfiguration anwenden
      </button>
    </form>
  );
}

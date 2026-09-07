import type { RenderConfiguration } from 'cigs-viewer';

export interface ConfigurationEntry {
  id: number;
  key: string;
  value: string;
}

type ConfigurationResult =
  | { configuration: RenderConfiguration; error: null }
  | { configuration: null; error: string };

export function parseConfiguration(
  entries: readonly ConfigurationEntry[]
): ConfigurationResult {
  if (entries.length === 0) {
    return {
      configuration: null,
      error: 'Bitte mindestens ein Paar hinzufuegen.',
    };
  }

  const keys = new Set<string>();
  for (const [index, entry] of entries.entries()) {
    if (!entry.key || !entry.value) {
      return {
        configuration: null,
        error: `Paar ${index + 1}: Key und Value duerfen nicht leer sein.`,
      };
    }
    if (
      /[^a-zA-Z0-9_-]/.test(entry.key) ||
      /[^a-zA-Z0-9_-]/.test(entry.value)
    ) {
      return {
        configuration: null,
        error: `Paar ${index + 1}: Nur Buchstaben, Ziffern, Unterstriche und Bindestriche sind erlaubt.`,
      };
    }
    if (keys.has(entry.key)) {
      return {
        configuration: null,
        error: `Key "${entry.key}" ist doppelt vorhanden.`,
      };
    }
    keys.add(entry.key);
  }

  return {
    configuration: Object.fromEntries(
      entries.map(({ key, value }) => [key, value])
    ),
    error: null,
  };
}

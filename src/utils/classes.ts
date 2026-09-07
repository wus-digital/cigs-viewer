import { twMerge } from 'tailwind-merge';

export function slotClasses(
  marker: string,
  defaults: string,
  override?: string,
  className?: string
) {
  return `${marker} ${twMerge(defaults, override, className)}`;
}

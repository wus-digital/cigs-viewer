import { Children, cloneElement, forwardRef, useContext } from 'react';
import type { ButtonHTMLAttributes, MouseEvent, ReactElement } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { slotClasses } from '../utils/classes.js';
import { ViewerLayoutContext } from './ViewerContext.js';
import type { ViewerClassNames } from '../types/viewer.js';

export interface CigsViewerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** One native-button-based component that forwards its props and ref. */
  asChild?: boolean;
}

interface Props extends CigsViewerButtonProps {
  marker: string;
  slot: keyof ViewerClassNames;
  defaults: string;
  slotOverride: string | undefined;
  unavailable: boolean;
  label: string;
  action: () => void;
}

export const ViewerButton = forwardRef<HTMLButtonElement, Props>(
  function ViewerButton(
    {
      asChild = false,
      marker,
      slot,
      defaults,
      slotOverride,
      unavailable,
      label,
      action,
      children,
      className,
      disabled,
      onClick,
      ...props
    },
    ref
  ) {
    const layout = useContext(ViewerLayoutContext);
    defaults = `${defaults} ${layout[slot] ?? ''}`;
    const buttonProps = {
      ...props,
      type: 'button' as const,
      'aria-label': props['aria-label'] ?? label,
      disabled: unavailable || disabled,
      onClick: (event: MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (!event.defaultPrevented && !event.currentTarget.disabled) action();
      },
    };
    if (asChild) {
      const child = Children.only(children) as ReactElement<
        ButtonHTMLAttributes<HTMLButtonElement>
      >;
      // Normalize protected native props before Slot composes the child's events and ref.
      // This does not inspect component identity or require a particular design system.
      return (
        <Slot {...buttonProps} ref={ref}>
          {cloneElement(child, {
            type: 'button',
            disabled: buttonProps.disabled || child.props.disabled,
            'aria-label':
              child.props['aria-label'] ?? buttonProps['aria-label'],
            className: slotClasses(
              marker,
              defaults,
              slotOverride,
              [className, child.props.className].filter(Boolean).join(' ')
            ),
          })}
        </Slot>
      );
    }
    return (
      <button
        {...buttonProps}
        ref={ref}
        className={slotClasses(marker, defaults, slotOverride, className)}
      >
        {children}
      </button>
    );
  }
);

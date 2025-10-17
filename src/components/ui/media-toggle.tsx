import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import {
  MEDIA_CONFIGS,
  type MediaType,
  type MediaTone,
} from '@/config/media-constants';
import { getMonochromeClass } from '@/lib/theme-utils';

export type MediaToggleVariant = 'list' | 'compact' | 'chip' | 'icon';

export interface MediaToggleProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  type: MediaType;
  isActive: boolean;
  isProcessing?: boolean;
  variant?: MediaToggleVariant;
  showDescription?: boolean;
  showLabel?: boolean;
  labelOverride?: string;
  descriptionOverride?: string;
}

const toneToClass = (tone: MediaTone) => {
  switch (tone) {
    case 'primary':
      return 'text-primary';
    case 'accent':
    default:
      return 'text-[hsl(var(--accent))]';
  }
};

const srString = (label: string) => (
  <span className="sr-only">{label}</span>
);

export const MediaToggle = forwardRef<HTMLButtonElement, MediaToggleProps>(
  function MediaToggle(props, ref) {
    const {
      type,
      isActive,
      isProcessing = false,
      variant = 'list',
      showDescription = true,
      showLabel,
      labelOverride,
      descriptionOverride,
      className,
      disabled,
      ...buttonProps
    } = props;

    const config = MEDIA_CONFIGS[type];
    const Icon =
      config.icons[isActive || isProcessing ? 'active' : 'inactive'];
    const label =
      labelOverride ??
      (isActive || isProcessing
        ? config.copy.stopLabel
        : config.copy.startLabel);
    const description =
      descriptionOverride ??
      (isProcessing
        ? config.copy.processingDescription ?? config.copy.activeDescription
        : isActive
          ? config.copy.activeDescription
          : config.copy.inactiveDescription);

    const resolvedShowLabel =
      showLabel ?? (variant !== 'compact' && variant !== 'icon');

    if (variant === 'compact') {
      return (
        <button
          ref={ref}
          type="button"
          className={cn(
            'inline-flex h-8 items-center justify-center rounded-full px-3',
            'bg-muted/50 text-muted-foreground transition-colors',
            'hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-offset-2 focus-visible:ring-[hsl(var(--accent))]/50',
            isActive || isProcessing
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : null,
            disabled && 'cursor-not-allowed opacity-50',
            getMonochromeClass(),
            className,
          )}
          aria-pressed={isActive}
          disabled={disabled}
          {...buttonProps}
        >
          <Icon
            className={cn(
              'h-3 w-3',
              isProcessing && 'animate-pulse',
            )}
            aria-hidden="true"
          />
          {resolvedShowLabel ? label : srString(label)}
        </button>
      );
    }

    if (variant === 'chip') {
      return (
        <button
          ref={ref}
          type="button"
          className={cn(
            'inline-flex items-center gap-1 rounded-full border border-border/40',
            'bg-muted/40 px-3 py-2.5 text-[11px] transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            'focus-visible:ring-[hsl(var(--accent))]/40',
            disabled && 'cursor-not-allowed opacity-50',
            getMonochromeClass(),
            className,
          )}
          aria-pressed={isActive}
          disabled={disabled}
          {...buttonProps}
        >
          <span
            className={cn(
              'inline-block h-1.5 w-1.5 rounded-full',
              config.indicatorClass,
            )}
            aria-hidden="true"
          />
          <Icon className="h-3 w-3" aria-hidden="true" />
          {resolvedShowLabel && (
            <span>{labelOverride ?? config.copy.label}</span>
          )}
        </button>
      );
    }

    if (variant === 'icon') {
      return (
        <button
          ref={ref}
          type="button"
          className={cn(
            'inline-flex h-10 w-10 items-center justify-center rounded-md',
            'border border-border/40 bg-muted',
            'hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-offset-2 focus-visible:ring-[hsl(var(--accent))]/50',
            disabled && 'cursor-not-allowed opacity-50',
            getMonochromeClass(),
            className,
          )}
          aria-pressed={isActive}
          disabled={disabled}
          {...buttonProps}
        >
          <Icon
            className={cn(
              'h-4 w-4',
              isActive || isProcessing
                ? toneToClass(config.tone)
                : 'text-muted-foreground',
              isProcessing && 'animate-pulse',
            )}
            aria-hidden="true"
          />
          {resolvedShowLabel ? label : srString(label)}
        </button>
      );
    }

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'flex w-full items-start gap-3 rounded px-2 py-2 text-left',
          'transition-colors duration-150 hover:bg-muted',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'focus-visible:ring-[hsl(var(--accent))]/40',
          'min-h-[44px]',
          disabled && 'cursor-not-allowed opacity-50',
          getMonochromeClass(),
          className,
        )}
        aria-pressed={isActive}
        disabled={disabled}
        {...buttonProps}
      >
        <Icon
          className={cn(
            'h-5 w-5 flex-shrink-0',
            isActive || isProcessing
              ? toneToClass(config.tone)
              : 'text-muted-foreground',
            isProcessing && 'animate-pulse',
          )}
          aria-hidden="true"
        />
        <span className="flex flex-col">
          <span className="text-sm font-medium text-foreground">
            {label}
          </span>
          {showDescription && (
            <span className="text-xs text-muted-foreground">
              {description}
            </span>
          )}
        </span>
      </button>
    );
  },
);

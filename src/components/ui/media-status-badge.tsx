import React from 'react';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  MEDIA_CONFIGS,
  type MediaType,
} from '@/config/media-constants';
import { getMonochromeClass } from '@/lib/theme-utils';

interface MediaStatusBadgeProps extends Omit<BadgeProps, 'children'> {
  type: MediaType;
  isActive?: boolean;
  isProcessing?: boolean;
  showIcon?: boolean;
  labelOverride?: string;
}

export function MediaStatusBadge({
  type,
  isActive = true,
  isProcessing = false,
  showIcon = true,
  labelOverride,
  className,
  variant,
  ...rest
}: MediaStatusBadgeProps) {
  const config = MEDIA_CONFIGS[type];
  const Icon = config.icons[isActive || isProcessing ? 'active' : 'inactive'];
  const label = labelOverride ?? config.copy.shortLabel;

  return (
    <Badge
      variant={variant ?? 'default'}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium',
        isProcessing && 'animate-pulse',
        getMonochromeClass(),
        className,
      )}
      aria-live={isActive ? 'polite' : 'off'}
      {...rest}
    >
      {showIcon && <Icon className="h-3 w-3" aria-hidden="true" />}
      <span>{label}</span>
    </Badge>
  );
}

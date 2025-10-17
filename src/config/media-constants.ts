import type { LucideIcon } from 'lucide-react';
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  MonitorOff,
  MonitorUp,
} from 'lucide-react';

export type MediaType = 'voice' | 'camera' | 'screen';

export type MediaTone = 'accent' | 'primary';

export interface MediaCopy {
  label: string;
  shortLabel: string;
  startLabel: string;
  stopLabel: string;
  inactiveDescription: string;
  activeDescription: string;
  processingDescription?: string;
}

export interface MediaIconsConfig {
  active: LucideIcon;
  inactive: LucideIcon;
}

export interface MediaConfig {
  type: MediaType;
  copy: MediaCopy;
  icons: MediaIconsConfig;
  indicatorClass: string;
  tone: MediaTone;
  keyboardShortcut?: string;
}

const ACCENT_TONE: MediaTone = 'accent';

export const MEDIA_CONFIGS: Record<MediaType, MediaConfig> = {
  voice: {
    type: 'voice',
    copy: {
      label: 'Voice',
      shortLabel: 'Voice',
      startLabel: 'Start Voice',
      stopLabel: 'Stop Voice',
      inactiveDescription: 'Use voice input',
      activeDescription: 'Currently recording',
      processingDescription: 'Processing voice input',
    },
    icons: {
      active: Mic,
      inactive: MicOff,
    },
    indicatorClass: 'bg-emerald-500',
    tone: ACCENT_TONE,
    keyboardShortcut: 'Ctrl+M',
  },
  camera: {
    type: 'camera',
    copy: {
      label: 'Camera',
      shortLabel: 'Cam',
      startLabel: 'Start Camera',
      stopLabel: 'Stop Camera',
      inactiveDescription: 'Use camera input',
      activeDescription: 'Camera is active',
      processingDescription: 'Initializing camera',
    },
    icons: {
      active: Camera,
      inactive: CameraOff,
    },
    indicatorClass: 'bg-emerald-500',
    tone: ACCENT_TONE,
    keyboardShortcut: 'Ctrl+Shift+C',
  },
  screen: {
    type: 'screen',
    copy: {
      label: 'Screen Share',
      shortLabel: 'Screen',
      startLabel: 'Start Screen Share',
      stopLabel: 'Stop Screen Share',
      inactiveDescription: 'Share your screen',
      activeDescription: 'Sharing screen',
      processingDescription: 'Starting screen share',
    },
    icons: {
      active: MonitorUp,
      inactive: MonitorOff,
    },
    indicatorClass: 'bg-blue-500',
    tone: ACCENT_TONE,
    keyboardShortcut: 'Ctrl+Shift+S',
  },
} as const;

export const MEDIA_TYPES = Object.keys(MEDIA_CONFIGS) as MediaType[];

export const MEDIA_ICON_SIZE = {
  default: 20,
  compact: 16,
  micro: 12,
} as const;

export const MEDIA_MOTION_VARIANTS = {
  slideInRight: {
    initial: { opacity: 0, x: 20, scale: 0.9 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: 20, scale: 0.9 },
    transition: { duration: 0.2 },
  },
  fadeInScale: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
    transition: { duration: 0.2 },
  },
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 },
  },
} as const;

export type MotionVariantKey = keyof typeof MEDIA_MOTION_VARIANTS;

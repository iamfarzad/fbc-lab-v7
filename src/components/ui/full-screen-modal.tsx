import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MEDIA_MOTION_VARIANTS } from '@/lib/animations';

interface FullScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function FullScreenModal({
  isOpen,
  onClose,
  title,
  children,
  className,
  contentClassName,
}: FullScreenModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        {...MEDIA_MOTION_VARIANTS.fadeIn}
        className={cn('fixed inset-0 z-50 bg-background', className)}
      >
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div
          className={cn(
            'flex h-[calc(100vh-73px)] flex-col',
            contentClassName,
          )}
        >
          {children}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

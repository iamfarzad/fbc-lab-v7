import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { DESIGN_TOKENS } from '../tokens/design-tokens';

interface VoiceWaveformProps {
  isActive: boolean;
  barCount?: number;
  className?: string;
}

export function VoiceWaveform({ 
  isActive, 
  barCount = 20, 
  className 
}: VoiceWaveformProps) {
  const bars = Array.from({ length: barCount }, (_, i) => i);
  
  return (
    <div className={cn("flex items-center justify-center gap-1", className)}>
      {bars.map((i) => (
        <motion.div
          key={i}
          className={cn(
            "w-1 bg-foreground/20",
            isActive && "bg-foreground/80",
            DESIGN_TOKENS.corners.default,
            DESIGN_TOKENS.corners.none
          )}
          animate={isActive ? {
            height: [16, Math.random() * 48 + 16, 16],
            opacity: [0.3, 1, 0.3],
          } : {
            height: 16,
            opacity: 0.3,
          }}
          transition={{
            duration: 0.5 + Math.random() * 0.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

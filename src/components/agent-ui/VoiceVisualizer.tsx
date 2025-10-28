'use client';

import { motion } from 'motion/react'
import { useLiveApi } from '@/hooks/useLiveApi'

export function VoiceVisualizer() {
  const liveApi = useLiveApi()

  return (
    <div className="flex items-end gap-1 h-8" aria-label="Voice activity">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full bg-primary"
          animate={{
            height: liveApi.isProcessing ? [8, 28, 12, 24, 10][i % 5] : 8,
          }}
          transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.08, ease: 'easeInOut' }}
          style={{ height: 8 }}
        />
      ))}
    </div>
  )
}


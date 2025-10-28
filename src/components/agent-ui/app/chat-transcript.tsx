'use client';

import { AnimatePresence, type HTMLMotionProps, motion } from 'motion/react';
import { LiveChatMessages } from '@/components/agent-ui/app/LiveChatMessages'
import type { Message } from '@/types/core'

const MotionContainer = motion.create('div');

const CONTAINER_MOTION_PROPS = {
  variants: {
    hidden: {
      opacity: 0,
    },
    visible: {
      opacity: 1,
    },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
  transition: {
    duration: 0.3,
    ease: 'easeOut' as const,
  },
};

// message transitions handled within LiveChatMessages / AI elements

interface ChatTranscriptProps {
  hidden?: boolean
  messages?: Message[]
}

export function ChatTranscript({
  hidden = false,
  messages = [],
  ...props
}: ChatTranscriptProps & Omit<HTMLMotionProps<'div'>, 'ref'>) {
  return (
    <AnimatePresence>
      {!hidden && (
        <MotionContainer {...CONTAINER_MOTION_PROPS} {...props}>
          <LiveChatMessages messages={messages} />
        </MotionContainer>
      )}
    </AnimatePresence>
  );
}

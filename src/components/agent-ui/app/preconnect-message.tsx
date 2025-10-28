'use client';

import { AnimatePresence, motion } from 'motion/react';
import type { Message } from '@/types/core';
import { ShimmerText } from '@/components/agent-ui/livekit/shimmer-text';
import { cn } from '@/lib/utils';
import { MessageContent } from "@/components/ai-elements/core/message";
import { Response } from "@/components/ai-elements/core/response";

const MotionMessage = motion.create('div');

const VIEW_MOTION_PROPS = {
  variants: {
    visible: {
      opacity: 1,
    },
    hidden: {
      opacity: 0,
    },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
  transition: {
    duration: 0.5,
    ease: 'easeIn' as const,
  },
};

interface PreConnectMessageProps {
  messages?: Message[];
  className?: string;
}

export function PreConnectMessage({ className, messages = [] }: PreConnectMessageProps) {
  return (
    <AnimatePresence>
      {messages.length === 0 && (
        <MotionMessage
          {...VIEW_MOTION_PROPS}
          aria-hidden={messages.length > 0}
          className={cn('pointer-events-none text-center', className)}
        >
          <MessageContent>
            <ShimmerText className="text-sm font-semibold">
              <Response>Agent is listening, ask it a question</Response>
            </ShimmerText>
          </MessageContent>
        </MotionMessage>
      )}
    </AnimatePresence>
  );
}

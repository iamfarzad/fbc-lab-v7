import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatState } from "../types/chatTypes";
import { CHAT_CONSTANTS } from "../constants/chatConstants";
interface ChatContainerProps {
  chatState: ChatState;
  children: React.ReactNode;
}

export function ChatContainer({ chatState, children }: ChatContainerProps) {
  if (!chatState.isOpen) return null;

  const getContainerClasses = () => {
    if (chatState.isExpanded) {
      return "fixed inset-0 z-[100] flex flex-col bg-[hsl(var(--background))] text-[hsl(var(--foreground))] overflow-hidden";
    }

    const baseClasses = [
      "fixed z-[100] flex flex-col transition-all duration-300 safe-area-inset-bottom",
      CHAT_CONSTANTS.STYLING.CONTAINER,
    ];

    if (chatState.isMinimized) {
      baseClasses.push(
        "bottom-4 right-4 sm:bottom-6 sm:right-6",
        CHAT_CONSTANTS.UI.CHAT_WIDTH.MINIMIZED,
        CHAT_CONSTANTS.UI.CHAT_HEIGHT.MINIMIZED
      );
    } else {
      baseClasses.push(
        "bottom-4 left-4 right-4 sm:bottom-6 sm:right-6 sm:left-auto",
        CHAT_CONSTANTS.UI.CHAT_WIDTH.NORMAL,
        CHAT_CONSTANTS.UI.CHAT_HEIGHT.NORMAL
      );
    }

    return baseClasses.join(" ");
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: CHAT_CONSTANTS.ANIMATION.FADE_IN }}
        className={getContainerClasses()}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

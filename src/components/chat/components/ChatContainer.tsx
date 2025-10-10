import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatState } from "../types/chatTypes";
import { CHAT_CONSTANTS } from "../constants/chatConstants";
import { cn } from "@/lib/utils";

interface ChatContainerProps {
  chatState: ChatState;
  children: React.ReactNode;
}

export function ChatContainer({ chatState, children }: ChatContainerProps) {
  if (!chatState.isOpen) return null;

  const getContainerClasses = () => {
    // Mobile-first: full screen on mobile, floating on desktop
    if (chatState.isExpanded) {
      return "fixed inset-0 z-[100] flex flex-col bg-[hsl(var(--background))] text-[hsl(var(--foreground))] overflow-hidden";
    }

    // Mobile (< 640px): Full screen with safe areas
    const mobileClasses = [
      "fixed inset-0 z-[100] flex flex-col bg-[hsl(var(--background))] text-[hsl(var(--foreground))]",
      "overflow-hidden safe-area-inset-top safe-area-inset-bottom",
      // Remove rounded corners and shadows on mobile
      "md:rounded-[32px] md:shadow-[0_24px_80px_-60px_rgba(12,18,26,0.45)] md:border md:border-border/40",
    ];

    // Desktop (> 1024px): Floating window style
    const desktopClasses = [
      "lg:fixed lg:z-[100] lg:flex lg:flex-col lg:transition-all lg:duration-300",
      "lg:bottom-6 lg:right-6",
      CHAT_CONSTANTS.STYLING.CONTAINER,
    ];

    if (chatState.isMinimized) {
      desktopClasses.push(
        "lg:bottom-4 lg:right-4 lg:sm:bottom-6 lg:sm:right-6",
        CHAT_CONSTANTS.UI.CHAT_WIDTH.MINIMIZED,
        CHAT_CONSTANTS.UI.CHAT_HEIGHT.MINIMIZED
      );
    } else {
      desktopClasses.push(
        "lg:bottom-4 lg:left-4 lg:right-4 lg:sm:bottom-6 lg:sm:right-6 lg:sm:left-auto",
        CHAT_CONSTANTS.UI.CHAT_WIDTH.NORMAL,
        CHAT_CONSTANTS.UI.CHAT_HEIGHT.NORMAL
      );
    }

    // Combine mobile and desktop classes
    return cn(...mobileClasses, ...desktopClasses);
  };

  return (
    <div className={getContainerClasses()}>
      {children}
    </div>
  );
}

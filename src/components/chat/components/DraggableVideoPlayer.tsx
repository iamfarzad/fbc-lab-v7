'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DraggableVideoPlayerProps {
  stream: MediaStream;
  onClose: () => void;
  title: string;
  type: 'webcam' | 'screen';
}

export function DraggableVideoPlayer({ 
  stream, 
  onClose, 
  title,
  type 
}: DraggableVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);

  // State for position and size
  const [position, setPosition] = useState({ x: 20, y: 80 });
  const [size, setSize] = useState({ width: 320, height: 180 });

  // State for dragging
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // State for resizing
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleDragMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsResizing(true);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && playerRef.current) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setPosition({ x: newX, y: newY });
    }
    if (isResizing && playerRef.current) {
      const newWidth = e.clientX - playerRef.current.offsetLeft;
      const newHeight = e.clientY - playerRef.current.offsetTop;
      setSize({ width: Math.max(240, newWidth), height: Math.max(135, newHeight) });
    }
  }, [isDragging, isResizing, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={playerRef}
      className={cn(
        "fixed z-[250] flex flex-col bg-background border-2 border-border rounded-lg overflow-hidden shadow-2xl",
        "select-none"
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
      }}
    >
      {/* Header - Draggable */}
      <div 
        className={cn(
          "flex items-center justify-between px-3 py-2 bg-muted/80 cursor-move",
          "border-b border-border"
        )}
        onMouseDown={handleDragMouseDown}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-foreground">{title}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-6 w-6 p-0 hover:bg-destructive/20"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Video Content */}
      <div className="flex-1 relative bg-black overflow-hidden">
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          playsInline
          className={cn(
            "w-full h-full",
            type === 'webcam' ? "object-cover" : "object-contain"
          )}
          style={{
            transform: type === 'webcam' ? 'scaleX(-1)' : 'scaleX(1)'
          }}
        />
      </div>

      {/* Resize Handle */}
      <div
        className={cn(
          "absolute bottom-0 right-0 w-4 h-4 cursor-se-resize",
          "bg-primary/50 hover:bg-primary/80 transition-colors"
        )}
        style={{
          clipPath: 'polygon(100% 0, 100% 100%, 0 100%)'
        }}
        onMouseDown={handleResizeMouseDown}
      />
    </div>
  );
}


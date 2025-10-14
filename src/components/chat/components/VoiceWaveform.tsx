import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface VoiceWaveformProps {
  isActive: boolean;
  isProcessing?: boolean;
  height?: number;
  barWidth?: number;
  barGap?: number;
  barCount?: number;
  className?: string;
}

export function VoiceWaveform({ 
  isActive,
  isProcessing = false,
  height = 80,
  barWidth = 3,
  barGap = 2,
  barCount = 40,
  className 
}: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const barsRef = useRef<number[]>([]);
  const targetBarsRef = useRef<number[]>([]);
  const phaseRef = useRef(0);

  // Initialize bars
  useEffect(() => {
    barsRef.current = Array(barCount).fill(0.1);
    targetBarsRef.current = Array(barCount).fill(0.1);
  }, [barCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get computed colors from CSS variables
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    
    const getColor = (varName: string, alpha: number) => {
      const value = computedStyle.getPropertyValue(varName).trim();
      if (!value) return `rgba(136, 136, 136, ${alpha})`; // fallback
      
      // If it's HSL values like "25 95% 53%", convert to hsla()
      if (/^\d+\s+\d+%\s+\d+%$/.test(value)) {
        return `hsla(${value} / ${alpha})`;
      }
      // If it's RGB values like "255 107 53", convert to rgba()
      if (/^\d+\s+\d+\s+\d+$/.test(value)) {
        return `rgba(${value} / ${alpha})`;
      }
      return `rgba(136, 136, 136, ${alpha})`; // fallback
    };

    // Set canvas size accounting for device pixel ratio
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const totalBarWidth = barWidth + barGap;
    const waveformWidth = barCount * totalBarWidth - barGap;
    const startX = (rect.width - waveformWidth) / 2;

    const animate = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Update phase for smooth animation
      phaseRef.current += isActive ? 0.08 : 0.02;

      barsRef.current.forEach((bar, i) => {
        // Generate smooth wave-like targets
        if (isActive) {
          const wave1 = Math.sin(phaseRef.current + i * 0.3) * 0.5 + 0.5;
          const wave2 = Math.sin(phaseRef.current * 1.3 + i * 0.2) * 0.3 + 0.3;
          targetBarsRef.current[i] = Math.min(0.9, Math.max(0.3, wave1 * 0.6 + wave2 * 0.4));
        } else if (isProcessing) {
          // Gentle pulse when processing
          const pulse = Math.sin(phaseRef.current * 2 + i * 0.1) * 0.15 + 0.25;
          targetBarsRef.current[i] = pulse;
        } else {
          // Inactive state - minimal height
          targetBarsRef.current[i] = 0.15;
        }

        // Smooth interpolation
        const diff = targetBarsRef.current[i] - barsRef.current[i];
        barsRef.current[i] += diff * 0.15;

        // Draw bar
        const barHeight = barsRef.current[i] * height;
        const x = startX + i * totalBarWidth;
        const y = (height - barHeight) / 2;

        // Create gradient based on state
        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        
        if (isActive) {
          // Active: vibrant gradient
          gradient.addColorStop(0, getColor('--primary', 0.8));
          gradient.addColorStop(1, getColor('--primary', 0.4));
        } else if (isProcessing) {
          // Processing: subtle pulse
          gradient.addColorStop(0, getColor('--muted-foreground', 0.5));
          gradient.addColorStop(1, getColor('--muted-foreground', 0.3));
        } else {
          // Inactive: very muted
          gradient.addColorStop(0, getColor('--muted-foreground', 0.2));
          gradient.addColorStop(1, getColor('--muted-foreground', 0.1));
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        // Use roundRect if available, otherwise use regular rect
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
        } else {
          ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, isProcessing, height, barWidth, barGap, barCount]);

  return (
    <div className={cn("relative w-full", className)} style={{ height }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ width: '100%', height }}
      />
    </div>
  );
}

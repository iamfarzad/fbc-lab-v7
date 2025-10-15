"use client";

import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DESIGN_TOKENS } from "../design-tokens";
import { getMonochromeClass } from "@/lib/theme-utils";

type TabKey = 'voice' | 'camera' | 'screen';

interface MediaPanelProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: TabKey;

  voiceActive: boolean;
  voiceProcessing: boolean;
  voiceTranscript?: string;
  voicePartial?: string;
  voiceError?: string | null;
  onToggleVoice: () => void | Promise<void>;

  cameraActive: boolean;
  cameraStream: MediaStream | null;
  cameraError?: string;
  onToggleCamera: () => void | Promise<void>;
  onSwitchCamera?: () => void | Promise<void>;
  hasMultipleCameras?: boolean;

  screenActive: boolean;
  screenStream: MediaStream | null;
  screenThumbnail?: string | null;
  screenError?: string;
  onToggleScreen: () => void | Promise<void>;
}

export function MediaPanel(props: MediaPanelProps) {
  const [tab, setTab] = React.useState<TabKey>(props.defaultTab || 'voice');
  const panelRef = useRef<HTMLDivElement | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const titleId = useRef(`media-panel-${Math.random().toString(36).slice(2)}`).current;

  useEffect(() => {
    if (props.defaultTab) setTab(props.defaultTab);
  }, [props.defaultTab]);

  useEffect(() => {
    const el = cameraVideoRef.current;
    if (!el) return;
    if (props.cameraStream && props.cameraActive) {
      el.srcObject = props.cameraStream;
      el.play().catch(() => undefined);
    } else {
      el.srcObject = null;
    }
  }, [props.cameraStream, props.cameraActive]);

  useEffect(() => {
    const el = screenVideoRef.current;
    if (!el) return;
    if (props.screenStream && props.screenActive) {
      el.srcObject = props.screenStream;
      el.play().catch(() => undefined);
    } else {
      el.srcObject = null;
    }
  }, [props.screenStream, props.screenActive]);

  // Focus trap
  useEffect(() => {
    if (!props.isOpen) return;
    const root = panelRef.current;
    if (!root) return;
    const focusable = root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose();
      if (e.key !== 'Tab') return;
      if (focusable.length === 0) return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          (last || first).focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          (first || last).focus();
        }
      }
    };
    root.addEventListener('keydown', onKey);
    return () => root.removeEventListener('keydown', onKey);
  }, [props.isOpen, props.onClose]);

  const statusDot = (color: string) => (
    <span className={cn("inline-block h-2 w-2 rounded-full", color)} />
  );

  return (
    <AnimatePresence>
      {props.isOpen && (
        <div className="fixed inset-0 z-[180] pointer-events-none">
          {/* Panel */}
          <motion.aside
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className={cn(
              'absolute right-0 top-0 h-full w-[380px] max-w-[90vw] pointer-events-auto',
              'bg-background border-l border-border/30 p-4',
              DESIGN_TOKENS.shadows.md,
              getMonochromeClass()
            )}
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h2 id={titleId} className={cn('text-sm font-semibold text-foreground')}>Media</h2>
              <Button variant="ghost" size="sm" onClick={props.onClose} aria-label="Close media panel">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 mb-3">
              <button
                className={cn('px-3 py-1 text-xs border', tab === 'voice' ? 'border-foreground/40' : 'border-border/50 text-muted-foreground', DESIGN_TOKENS.corners.default)}
                onClick={() => setTab('voice')}
              >Voice</button>
              <button
                className={cn('px-3 py-1 text-xs border', tab === 'camera' ? 'border-foreground/40' : 'border-border/50 text-muted-foreground', DESIGN_TOKENS.corners.default)}
                onClick={() => setTab('camera')}
              >Camera</button>
              <button
                className={cn('px-3 py-1 text-xs border', tab === 'screen' ? 'border-foreground/40' : 'border-border/50 text-muted-foreground', DESIGN_TOKENS.corners.default)}
                onClick={() => setTab('screen')}
              >Screen</button>
            </div>

            {/* Content */}
            <div className="space-y-3">
              {tab === 'voice' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    {props.voiceProcessing ? statusDot('bg-amber-500') : props.voiceActive ? statusDot('bg-emerald-500') : statusDot('bg-muted-foreground/40')}
                    <span>{props.voiceProcessing ? 'Processing' : props.voiceActive ? 'Recording' : 'Inactive'}</span>
                  </div>
                  {(props.voicePartial || props.voiceTranscript) && (
                    <div className="text-xs text-muted-foreground border border-border/40 p-2 rounded-md">
                      <span className="font-medium text-foreground/90">Preview:</span>{' '}
                      {props.voicePartial || props.voiceTranscript?.split('\n').slice(-1)[0]}
                    </div>
                  )}
                  {props.voiceError && <div className="text-xs text-destructive/80">{props.voiceError}</div>}
                  <div className="pt-1">
                    <Button onClick={props.onToggleVoice} className="w-full">{props.voiceActive || props.voiceProcessing ? 'Stop Voice' : 'Start Voice'}</Button>
                  </div>
                </div>
              )}

              {tab === 'camera' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    {props.cameraActive ? statusDot('bg-emerald-500') : statusDot('bg-muted-foreground/40')}
                    <span>{props.cameraActive ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div className="aspect-video w-full rounded-md overflow-hidden border border-border/40 bg-muted/20">
                    {props.cameraActive && props.cameraStream ? (
                      <video ref={cameraVideoRef} muted playsInline className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No camera stream</div>
                    )}
                  </div>
                  {props.cameraError && <div className="text-xs text-destructive/80">{props.cameraError}</div>}
                  <div className="grid grid-cols-2 gap-2">
                    <Button onClick={props.onToggleCamera}>{props.cameraActive ? 'Stop Camera' : 'Start Camera'}</Button>
                    <Button variant="outline" onClick={props.onSwitchCamera} disabled={!props.hasMultipleCameras}>Switch</Button>
                  </div>
                </div>
              )}

              {tab === 'screen' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    {props.screenActive ? statusDot('bg-blue-500') : statusDot('bg-muted-foreground/40')}
                    <span>{props.screenActive ? 'Sharing' : 'Inactive'}</span>
                  </div>
                  <div className="aspect-video w-full rounded-md overflow-hidden border border-border/40 bg-muted/20">
                    {props.screenActive && props.screenStream ? (
                      <video ref={screenVideoRef} muted playsInline className="w-full h-full object-cover" />
                    ) : props.screenThumbnail ? (
                      <img src={props.screenThumbnail} alt="Screen thumbnail" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No screen share</div>
                    )}
                  </div>
                  {props.screenError && <div className="text-xs text-destructive/80">{props.screenError}</div>}
                  <div className="pt-1">
                    <Button onClick={props.onToggleScreen} className="w-full">{props.screenActive ? 'Stop Screen Share' : 'Start Screen Share'}</Button>
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}


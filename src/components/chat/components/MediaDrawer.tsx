"use client";

import React, { useEffect, useRef } from "react";
import { BottomSheet } from "./BottomSheet";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DESIGN_TOKENS } from "../design-tokens";

type TabKey = 'voice' | 'camera' | 'screen';

interface MediaDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: TabKey;

  // Voice
  voiceActive: boolean;
  voiceProcessing: boolean;
  voiceTranscript?: string;
  voicePartial?: string;
  voiceError?: string | null;
  onToggleVoice: () => void | Promise<void>;

  // Camera
  cameraActive: boolean;
  cameraStream: MediaStream | null;
  cameraError?: string;
  onToggleCamera: () => void | Promise<void>;
  onSwitchCamera?: () => void | Promise<void>;
  hasMultipleCameras?: boolean;

  // Screen
  screenActive: boolean;
  screenStream: MediaStream | null;
  screenThumbnail?: string | null;
  screenError?: string;
  onToggleScreen: () => void | Promise<void>;
}

export function MediaDrawer(props: MediaDrawerProps) {
  const [tab, setTab] = React.useState<TabKey>(props.defaultTab || 'voice');
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);

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

  const statusDot = (color: string) => (
    <span className={cn("inline-block h-2 w-2 rounded-full", color)} />
  );

  return (
    <BottomSheet isOpen={props.isOpen} onClose={props.onClose} title="Media">
      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4">
        <button
          className={cn(
            "px-3 py-1 text-xs border",
            tab === 'voice' ? "border-foreground/40" : "border-border/50 text-muted-foreground",
            DESIGN_TOKENS.corners.default
          )}
          onClick={() => setTab('voice')}
        >Voice</button>
        <button
          className={cn(
            "px-3 py-1 text-xs border",
            tab === 'camera' ? "border-foreground/40" : "border-border/50 text-muted-foreground",
            DESIGN_TOKENS.corners.default
          )}
          onClick={() => setTab('camera')}
        >Camera</button>
        <button
          className={cn(
            "px-3 py-1 text-xs border",
            tab === 'screen' ? "border-foreground/40" : "border-border/50 text-muted-foreground",
            DESIGN_TOKENS.corners.default
          )}
          onClick={() => setTab('screen')}
        >Screen</button>
      </div>

      {/* Voice */}
      {tab === 'voice' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            {props.voiceProcessing
              ? statusDot('bg-amber-500')
              : props.voiceActive
                ? statusDot('bg-emerald-500')
                : statusDot('bg-muted-foreground/40')}
            <span>
              {props.voiceProcessing ? 'Processing' : props.voiceActive ? 'Recording' : 'Inactive'}
            </span>
          </div>
          {(props.voicePartial || props.voiceTranscript) && (
            <div className="text-xs text-muted-foreground border border-border/40 p-2 rounded-md">
              <span className="font-medium text-foreground/90">Preview:</span>{' '}
              {props.voicePartial || props.voiceTranscript?.split('\n').slice(-1)[0]}
            </div>
          )}
          {props.voiceError && (
            <div className="text-xs text-destructive/80">{props.voiceError}</div>
          )}
          <div className="pt-1">
            <Button onClick={props.onToggleVoice} className="w-full">
              {props.voiceActive || props.voiceProcessing ? 'Stop Voice' : 'Start Voice'}
            </Button>
          </div>
        </div>
      )}

      {/* Camera */}
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
          {props.cameraError && (
            <div className="text-xs text-destructive/80">{props.cameraError}</div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={props.onToggleCamera}>
              {props.cameraActive ? 'Stop Camera' : 'Start Camera'}
            </Button>
            <Button variant="outline" onClick={props.onSwitchCamera} disabled={!props.hasMultipleCameras}>
              Switch
            </Button>
          </div>
        </div>
      )}

      {/* Screen */}
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
          {props.screenError && (
            <div className="text-xs text-destructive/80">{props.screenError}</div>
          )}
          <div className="pt-1">
            <Button onClick={props.onToggleScreen} className="w-full">
              {props.screenActive ? 'Stop Screen Share' : 'Start Screen Share'}
            </Button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}


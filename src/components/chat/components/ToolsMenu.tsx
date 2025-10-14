import React from "react";
import { BottomSheet, BottomSheetListItem } from "./BottomSheet";
import { 
  Mic, 
  Camera, 
  Monitor, 
  Settings,
  MicOff,
  CameraOff,
  MonitorOff
} from "lucide-react";
import { useIsMobile } from '@/hooks/useIsMobile';

interface ToolsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  // Voice state
  isVoiceActive: boolean;
  onToggleVoice: () => void;
  // Camera state
  isCameraActive: boolean;
  onToggleCamera: () => void;
  // Screen share state
  isScreenSharing: boolean;
  onToggleScreenShare: () => void;
  // Settings
  onToggleSettings: () => void;
  // Mobile mode
  onOpenVoiceFullScreen?: () => void;
  onOpenCameraFullScreen?: () => void;
}

export function ToolsMenu({
  isOpen,
  onClose,
  isVoiceActive,
  onToggleVoice,
  isCameraActive,
  onToggleCamera,
  isScreenSharing,
  onToggleScreenShare,
  onToggleSettings,
  onOpenVoiceFullScreen,
  onOpenCameraFullScreen
}: ToolsMenuProps) {
  const isMobile = useIsMobile();

  // Unified media handler factory
  const createMediaHandler = (
    toggleFn: () => void,
    openFullScreenFn?: () => void
  ) => () => {
    if (isMobile && openFullScreenFn) {
      openFullScreenFn();
    } else {
      toggleFn();
    }
    onClose();
  };

  const handleVoiceClick = createMediaHandler(onToggleVoice, onOpenVoiceFullScreen);
  const handleCameraClick = createMediaHandler(onToggleCamera, onOpenCameraFullScreen);
  const handleScreenShareClick = createMediaHandler(onToggleScreenShare);

  const handleSettingsClick = () => {
    onToggleSettings();
    onClose();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Tools"
      className="max-w-md"
    >
      <div className="space-y-2">
        <BottomSheetListItem
          icon={
            isVoiceActive ? (
              <Mic className="h-5 w-5 text-primary" />
            ) : (
              <MicOff className="h-5 w-5 text-muted-foreground" />
            )
          }
          label={isVoiceActive ? "Stop Voice" : "Start Voice"}
          description={isVoiceActive ? "Currently recording" : "Use voice input"}
          onClick={handleVoiceClick}
        />

        <BottomSheetListItem
          icon={
            isCameraActive ? (
              <Camera className="h-5 w-5 text-primary" />
            ) : (
              <CameraOff className="h-5 w-5 text-muted-foreground" />
            )
          }
          label={isCameraActive ? "Stop Camera" : "Start Camera"}
          description={isCameraActive ? "Camera is active" : "Use camera input"}
          onClick={handleCameraClick}
        />

        <BottomSheetListItem
          icon={
            isScreenSharing ? (
              <Monitor className="h-5 w-5 text-primary" />
            ) : (
              <MonitorOff className="h-5 w-5 text-muted-foreground" />
            )
          }
          label={isScreenSharing ? "Stop Screen Share" : "Start Screen Share"}
          description={isScreenSharing ? "Sharing screen" : "Share your screen"}
          onClick={handleScreenShareClick}
        />

        <div className="border-t border-border/20 my-4" />

        <BottomSheetListItem
          icon={<Settings className="h-5 w-5 text-muted-foreground" />}
          label="Settings"
          description="Configure chat preferences"
          onClick={handleSettingsClick}
        />
      </div>
    </BottomSheet>
  );
}

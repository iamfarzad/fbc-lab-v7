import React, { useState } from 'react';
import { BottomSheet, BottomSheetListItem } from './BottomSheet';
import {
  Calendar,
  Download,
  Paperclip,
  Image as ImageIcon,
  Settings
} from "lucide-react";
import { SettingsDialog } from './SettingsDialog';
import { useIsMobile } from '@/hooks/useIsMobile';
import { MediaToggle } from '@/components/ui/media-toggle';

interface ActionsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  // Actions
  onScheduleCall: () => void;
  onExportSummary: () => void;
  onUploadFiles: () => void;
  onUploadImages: () => void;
  // State
  canExportSummary: boolean;
  // Media controls
  isVoiceActive?: boolean;
  onToggleVoice?: () => void;
  isCameraActive?: boolean;
  onToggleCamera?: () => void;
  isScreenSharing?: boolean;
  onToggleScreenShare?: () => void;
  onToggleSettings?: () => void;
  onOpenVoiceFullScreen?: () => void;
  onOpenCameraFullScreen?: () => void;
  onOpenScreenFullScreen?: () => void;
  currentTheme?: string;
  onToggleTheme?: () => void;
  // Preferences
  autoShowMediaPanel?: boolean;
  onToggleAutoShowMediaPanel?: (value: boolean) => void;
}

export function ActionsMenu({
  isOpen,
  onClose,
  onScheduleCall,
  onExportSummary,
  onUploadFiles,
  onUploadImages,
  canExportSummary,
  // Media controls
  isVoiceActive = false,
  onToggleVoice,
  isCameraActive = false,
  onToggleCamera,
  isScreenSharing = false,
  onToggleScreenShare,
  onOpenVoiceFullScreen,
  onOpenCameraFullScreen,
  onOpenScreenFullScreen,
  currentTheme = 'default',
  onToggleTheme,
  autoShowMediaPanel = true,
  onToggleAutoShowMediaPanel,
}: ActionsMenuProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleScheduleCall = () => {
    onScheduleCall();
    onClose();
  };

  const handleExportSummary = () => {
    if (canExportSummary) {
      onExportSummary();
      onClose();
    }
  };

  const handleUploadFiles = () => {
    onUploadFiles();
    onClose();
  };

  const handleUploadImages = () => {
    onUploadImages();
    onClose();
  };

  const isMobile = useIsMobile();

  // Unified media handler factory
  const createMediaHandler = (
    toggleFn?: () => void,
    openFullScreenFn?: () => void
  ) => () => {
    if (isMobile && openFullScreenFn) {
      openFullScreenFn();
    } else {
      toggleFn?.();
    }
    onClose();
  };

  const handleVoiceClick = createMediaHandler(onToggleVoice, onOpenVoiceFullScreen);
  const handleCameraClick = createMediaHandler(onToggleCamera, onOpenCameraFullScreen);
  const handleScreenShareClick = createMediaHandler(onToggleScreenShare, onOpenScreenFullScreen);

  const handleSettingsClick = () => {
    setIsSettingsOpen(true);
    onClose();
  };

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Actions & Tools"
        className="max-w-md"
      >
        <div className="space-y-2">
          {/* Actions Section */}
          <div className="space-y-2">
            <BottomSheetListItem
              icon={<Calendar className="h-5 w-5 text-primary" />}
              label="Schedule a call"
              description="Book a consultation session"
              onClick={handleScheduleCall}
            />

            <BottomSheetListItem
              icon={<Download className="h-5 w-5 text-primary" />}
              label="Export summary"
              description="Download conversation summary"
              onClick={handleExportSummary}
              disabled={!canExportSummary}
            />
          </div>

          <div className="border-t border-border/20 my-4" />

          {/* Upload Section */}
          <div className="space-y-2">
            <BottomSheetListItem
              icon={<Paperclip className="h-5 w-5 text-accent" />}
              label="Upload files"
              description="Attach documents or PDFs"
              onClick={handleUploadFiles}
            />

            <BottomSheetListItem
              icon={<ImageIcon className="h-5 w-5 text-accent" />}
              label="Upload images"
              description="Share photos or screenshots"
              onClick={handleUploadImages}
            />
          </div>

          <div className="border-t border-border/20 my-4" />

          {/* Media Controls Section */}
          <div className="space-y-2">
            <MediaToggle
              type="voice"
              variant="list"
              className="px-3 py-3"
              isActive={Boolean(isVoiceActive)}
              onClick={handleVoiceClick}
            />
            <MediaToggle
              type="camera"
              variant="list"
              className="px-3 py-3"
              isActive={Boolean(isCameraActive)}
              onClick={handleCameraClick}
            />
            <MediaToggle
              type="screen"
              variant="list"
              className="px-3 py-3"
              isActive={Boolean(isScreenSharing)}
              onClick={handleScreenShareClick}
            />
          </div>

          <div className="border-t border-border/20 my-4" />

          {/* Settings Section */}
          <div className="space-y-2">
            <BottomSheetListItem
              icon={<Settings className="h-5 w-5 text-muted-foreground" />}
              label="Settings"
              description="Configure chat preferences"
              onClick={handleSettingsClick}
            />

            <BottomSheetListItem
              icon={<span className="inline-block h-5 w-5 rounded-sm border border-border/50 flex items-center justify-center text-[10px]">{autoShowMediaPanel ? '✓' : ''}</span>}
              label="Auto-show media panel"
              description="Open media panel when voice/camera/screen activate"
              onClick={() => onToggleAutoShowMediaPanel?.(!autoShowMediaPanel)}
            />
          </div>
        </div>
      </BottomSheet>

      {/* Settings Dialog */}
      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentTheme={currentTheme}
        onToggleTheme={onToggleTheme}
      />
    </>
  );
}

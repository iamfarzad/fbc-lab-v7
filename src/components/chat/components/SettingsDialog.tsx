import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { DESIGN_TOKENS } from '../tokens/design-tokens';
import { getMonochromeClass } from '@/lib/theme-utils';
import { useTheme } from 'next-themes';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onToggleTheme?: () => void;
  currentTheme?: string;
  onVoiceSettingsChange?: (settings: VoiceSettings) => void;
  voiceSettings?: VoiceSettings;
}

interface VoiceSettings {
  autoStart: boolean;
  language: string;
  voice: string;
  sampleRate: number;
}

export function SettingsDialog({
  isOpen,
  onClose,
  onVoiceSettingsChange,
  voiceSettings = {
    autoStart: false,
    language: 'en-US',
    voice: 'Puck',
    sampleRate: 16000
  }
}: SettingsDialogProps) {
  const { theme, setTheme, themes } = useTheme();
  const handleVoiceSettingChange = (key: keyof VoiceSettings, value: any) => {
    const newSettings = { ...voiceSettings, [key]: value };
    onVoiceSettingsChange?.(newSettings);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "sm:max-w-md",
        getMonochromeClass()
      )}>
        <DialogHeader>
          <DialogTitle className={cn(DESIGN_TOKENS.typography.heading, "text-foreground")}>Chat Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Theme Settings */}
          <div className="space-y-3">
            <Label className={cn(DESIGN_TOKENS.typography.body, "font-medium text-foreground")}>Appearance</Label>
            <div className="space-y-2">
              <Label className={cn(DESIGN_TOKENS.typography.body, "text-foreground")}>Theme</Label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger className={cn("w-full", DESIGN_TOKENS.touchTarget.sm, getMonochromeClass())}>
                  <SelectValue placeholder="Select a theme" />
                </SelectTrigger>
                <SelectContent className={getMonochromeClass()}>
                  {themes.map(t => (
                    <SelectItem key={t} value={t} className={getMonochromeClass()}>
                      {t.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className={DESIGN_TOKENS.borders.default} />

          {/* Voice Settings */}
          <div className="space-y-3">
            <Label className={cn(DESIGN_TOKENS.typography.body, "font-medium text-foreground")}>Voice Settings</Label>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className={cn(DESIGN_TOKENS.typography.body, "text-foreground")}>Auto-start voice</Label>
                <p className={cn(DESIGN_TOKENS.typography.disclaimer, "text-muted-foreground")}>
                  Automatically start voice when chat opens
                </p>
              </div>
              <Switch
                checked={voiceSettings.autoStart}
                onCheckedChange={(checked) => 
                  handleVoiceSettingChange('autoStart', checked)
                }
              />
            </div>

            <div className="space-y-2">
              <Label className={cn(DESIGN_TOKENS.typography.body, "text-foreground")}>Language</Label>
              <Select
                value={voiceSettings.language}
                onValueChange={(value) => 
                  handleVoiceSettingChange('language', value)
                }
              >
                <SelectTrigger className={cn(DESIGN_TOKENS.touchTarget.sm, getMonochromeClass())}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={getMonochromeClass()}>
                  <SelectItem value="en-US" className={getMonochromeClass()}>English (US)</SelectItem>
                  <SelectItem value="en-GB" className={getMonochromeClass()}>English (UK)</SelectItem>
                  <SelectItem value="es-ES" className={getMonochromeClass()}>Spanish</SelectItem>
                  <SelectItem value="fr-FR" className={getMonochromeClass()}>French</SelectItem>
                  <SelectItem value="de-DE" className={getMonochromeClass()}>German</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className={cn(DESIGN_TOKENS.typography.body, "text-foreground")}>Voice</Label>
              <Select
                value={voiceSettings.voice}
                onValueChange={(value) => 
                  handleVoiceSettingChange('voice', value)
                }
              >
                <SelectTrigger className={cn(DESIGN_TOKENS.touchTarget.sm, getMonochromeClass())}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={getMonochromeClass()}>
                  <SelectItem value="Puck" className={getMonochromeClass()}>Puck (Default)</SelectItem>
                  <SelectItem value="Gemini" className={getMonochromeClass()}>Gemini</SelectItem>
                  <SelectItem value="Aria" className={getMonochromeClass()}>Aria</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className={DESIGN_TOKENS.borders.default} />

          {/* Notification Settings */}
          <div className="space-y-3">
            <Label className={cn(DESIGN_TOKENS.typography.body, "font-medium text-foreground")}>Notifications</Label>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className={cn(DESIGN_TOKENS.typography.body, "text-foreground")}>Sound notifications</Label>
                <p className={cn(DESIGN_TOKENS.typography.disclaimer, "text-muted-foreground")}>
                  Play sound when receiving messages
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className={cn(DESIGN_TOKENS.typography.body, "text-foreground")}>Desktop notifications</Label>
                <p className={cn(DESIGN_TOKENS.typography.disclaimer, "text-muted-foreground")}>
                  Show notifications when chat is minimized
                </p>
              </div>
              <Switch />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button 
            variant="outline" 
            onClick={onClose} 
            className={cn(DESIGN_TOKENS.touchTarget.sm, "px-3", getMonochromeClass())}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import React, { createContext, useContext, useMemo } from "react";
import { useRealtimeVoice, type UseRealtimeVoiceOptions, type VoiceContextUpdate } from "@/hooks/useRealtimeVoice";

// Unified Live API surface made available via React context so all Agent UI
// components share a single voice session instance. This fixes the issue where
// separate calls to useLiveApi() created independent realtime instances.

export type LiveApiValue = ReturnType<typeof useRealtimeVoice> & {
  sendScreenShareMessage: (
    imageBase64: string,
    prompt: string,
    opts?: { sessionId?: string; voiceConnectionId?: string; type?: "screen" | "document" }
  ) => Promise<{ analysis?: string; ok: boolean }>;
  sendWebcamAnalyze: (
    blob: Blob,
    opts?: { sessionId?: string; voiceConnectionId?: string }
  ) => Promise<{ analysis?: string; ok: boolean }>;
  uploadAttachments: (files: File[], sessionId: string) => Promise<{
    ok: boolean;
    attachments: unknown[];
    error?: string;
    prompt?: string;
  }>;
  sendRealtimeInput: (chunks: Array<{ mimeType: string; data: string }>) => void;
  sendContextUpdate: (update: VoiceContextUpdate) => void;
};

const LiveApiContext = createContext<LiveApiValue | null>(null);

export function LiveApiProvider({
  children,
  sessionId,
  options,
}: {
  children: React.ReactNode;
  sessionId?: string;
  options?: UseRealtimeVoiceOptions;
}) {
  const realtime = useRealtimeVoice({ ...(options || {}), sessionId });

  // One-shot HTTP helpers mirrored from useLiveApi
  const sendScreenShareMessage: LiveApiValue["sendScreenShareMessage"] = async (
    imageBase64,
    prompt,
    opts
  ) => {
    const body = {
      image: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
      type: opts?.type ?? "screen",
      context: {
        prompt,
        trigger: realtime.isSessionActive ? "voice" : "manual",
      },
    };

    const response = await fetch("/api/tools/screen", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(opts?.sessionId ? { "x-intelligence-session-id": opts.sessionId } : {}),
        ...(opts?.voiceConnectionId ? { "x-voice-connection-id": opts.voiceConnectionId } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) return { ok: false };
    const data = await response.json().catch(() => ({}));
    const analysis = data?.output?.analysis || data?.analysis;
    return { ok: true, analysis };
  };

  const sendWebcamAnalyze: LiveApiValue["sendWebcamAnalyze"] = async (blob, opts) => {
    const formData = new FormData();
    formData.append("webcamCapture", blob, `webcam-${Date.now()}.jpg`);
    const response = await fetch("/api/tools/webcam", {
      method: "POST",
      headers: {
        ...(opts?.sessionId ? { "x-intelligence-session-id": opts.sessionId } : {}),
        ...(opts?.voiceConnectionId ? { "x-voice-connection-id": opts.voiceConnectionId } : {}),
      },
      body: formData,
    });
    if (!response.ok) return { ok: false };
    const data = await response.json().catch(() => ({}));
    const analysis = data?.analysis || data?.output?.analysis;
    return { ok: true, analysis };
  };

  const uploadAttachments: LiveApiValue["uploadAttachments"] = async (files, sid) => {
    const formData = new FormData();
    formData.append("sessionId", sid);
    files.forEach((file) => formData.append("files", file, file.name));
    const response = await fetch("/api/chat/attachments", { method: "POST", body: formData });
    if (!response.ok) return { ok: false, attachments: [], error: "Upload failed" } as const;
    const data = await response.json().catch(() => ({}));
    if (!data?.ok) return { ok: false, attachments: [], error: data?.error || "Upload error" } as const;
    return { ok: true, attachments: data.attachments, prompt: data.prompt } as const;
  };

  const directSendRealtimeInput: LiveApiValue["sendRealtimeInput"] = (chunks) => {
    realtime.sendRealtimeInput(chunks);
  };

  const directSendContextUpdate: LiveApiValue["sendContextUpdate"] = (update) => {
    if (!update?.analysis) return; // require analysis text
    realtime.sendContextUpdate(update);
  };

  const value: LiveApiValue = useMemo(
    () => ({
      ...realtime,
      sendScreenShareMessage,
      sendWebcamAnalyze,
      uploadAttachments,
      sendRealtimeInput: directSendRealtimeInput,
      sendContextUpdate: directSendContextUpdate,
    }),
    [realtime]
  );

  return <LiveApiContext.Provider value={value}>{children}</LiveApiContext.Provider>;
}

export function useLiveApiContext(): LiveApiValue | null {
  return useContext(LiveApiContext);
}


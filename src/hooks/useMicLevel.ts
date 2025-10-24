import { useEffect, useRef, useState } from 'react';

// Lightweight mic level meter using Web Audio API.
// Returns a value in [0, 1] representing current input RMS level.
export function useMicLevel(active: boolean) {
  const [level, setLevel] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const srcRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const cleanup = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect();
        analyserRef.current = null;
      }
      if (srcRef.current) {
        srcRef.current.disconnect();
        srcRef.current = null;
      }
      if (ctxRef.current) {
        try { ctxRef.current.close(); } catch { /* ignore close errors */ }
        ctxRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };

    const start = async () => {
      if (!active) return;
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;

      // Gate on existing permission: avoid prompting the user.
      try {
        const permissions = (navigator as any).permissions as Permissions | undefined;
        if (permissions && typeof permissions.query === 'function') {
          const status = await permissions.query({ name: 'microphone' as PermissionName });
          if (status.state !== 'granted') {
            return; // do not request; keep meter inactive until permission is granted elsewhere
          }
        }
      } catch {
        // If Permissions API not available or fails, do not request mic here to avoid extra prompts
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
        if (!Ctx) return;
        const ctx = new Ctx();
        ctxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        srcRef.current = src;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.85;
        analyserRef.current = analyser;
        src.connect(analyser);

        const buffer = new Float32Array(analyser.fftSize);

        const tick = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getFloatTimeDomainData(buffer);
          // Compute RMS
          let sum = 0;
          for (let i = 0; i < buffer.length; i++) {
            const v = buffer[i];
            sum += v * v;
          }
          const rms = Math.sqrt(sum / buffer.length);
          // Clamp and apply a mild boost for visual perception
          const value = Math.max(0, Math.min(1, rms * 2));
          setLevel(value);
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        // Silently ignore if we can't access mic.
      }
    };

    start();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [active]);

  return level;
}

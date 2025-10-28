# Voice Issues Fix

## Issues Identified

### 1. "Barrel" Sound Quality
**Root Cause**: DSP (Digital Signal Processing) disabled by default
- Echo cancellation: OFF
- Noise suppression: OFF  
- Auto gain control: OFF

### 2. Terminal Log Spam / Multiple WebSocket Connections
**Root Cause**: Multiple components trying to connect simultaneously
- Console shows: "Socket already exists, skipping connect"
- WebSocket connection attempted multiple times

## IMMEDIATE FIX

### Step 1: Set Environment Variables (Fixes Audio Quality)
```bash
# Run this in your terminal:
export NEXT_PUBLIC_VOICE_DSP_DEFAULT=true
export NEXT_PUBLIC_VOICE_ECHO_CANCELLATION=true
export NEXT_PUBLIC_VOICE_NOISE_SUPPRESSION=true  
export NEXT_PUBLIC_VOICE_AUTO_GAIN=true
export NEXT_PUBLIC_VOICE_VERBOSE_LOGS=false
```

### Step 2: Restart Development Server
```bash
# Kill existing server
pkill -f "pnpm.*dev"

# Start clean
pnpm dev:all:clean
```

### Step 3: Add to your .env.local file (Permanent Fix)
```bash
# Add these lines to your .env.local:
NEXT_PUBLIC_VOICE_DSP_DEFAULT=true
NEXT_PUBLIC_VOICE_ECHO_CANCELLATION=true
NEXT_PUBLIC_VOICE_NOISE_SUPPRESSION=true
NEXT_PUBLIC_VOICE_AUTO_GAIN=true
NEXT_PUBLIC_VOICE_VERBOSE_LOGS=false
```

## Technical Details

### Audio Configuration
- File: `src/lib/audio-utils.ts:254-263`
- The `STANDARD_AUDIO_CONSTRAINTS` object reads these env vars
- Default DSP state was `false`, causing hollow/barrel sound

### WebSocket Connection Issue
- File: `src/core/live/client.ts:42-45`
- Multiple components calling `connect()`
- Should use `LiveApiProvider` for shared instance
- Provider pattern in `src/hooks/LiveApiProvider.tsx` prevents duplicates

### Expected Results After Fix
✅ Voice sounds natural (no more barrel effect)
✅ Console logs are minimal
✅ Single WebSocket connection
✅ Terminal stays clean during voice sessions


#!/bin/bash
echo "Setting voice configuration environment variables..."

# Fix the "barrel" sound by enabling DSP
export NEXT_PUBLIC_VOICE_DSP_DEFAULT=true
export NEXT_PUBLIC_VOICE_ECHO_CANCELLATION=true
export NEXT_PUBLIC_VOICE_NOISE_SUPPRESSION=true
export NEXT_PUBLIC_VOICE_AUTO_GAIN=true

# Keep verbose logs disabled to reduce terminal spam
export NEXT_PUBLIC_VOICE_VERBOSE_LOGS=false

echo "Voice configuration applied!"
echo "Now restart your dev server with: pnpm dev:all:clean"

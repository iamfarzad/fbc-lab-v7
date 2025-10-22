# Gemini Voice Model - Source of Truth

## Official Model for Live API Voice
**Model Name:** `gemini-2.5-flash-native-audio-preview-09-2025`

**Location in Code:** `src/config/constants.ts`
- Constant: `GEMINI_MODELS.AUDIO_2025_09`
- Used by: `GEMINI_MODELS.DEFAULT_VOICE`

## Why This Specific Model

### Google Official Documentation (verified Oct 22, 2025)
- **Supports:** Live API, native audio input/output, text, video
- **Does NOT work:** `gemini-2.5-flash-preview-09-2025` (missing `-native-audio-`)
- **Deprecated Dec 9, 2025:** `gemini-live-2.5-flash-preview`

### Verified Working
- Working prototype at `/Users/farzad/Downloads/fcb_prototype_multimodal` uses this exact model
- Line 25 of `lib/constants.ts`: `'gemini-2.5-flash-native-audio-preview-09-2025'`
- Line 82 of `lib/genai-live-client.ts`: Same model hardcoded

## Model Name Pattern
```
gemini-2.5-flash-native-audio-preview-09-2025
       │      │        │              │
       │      │        │              └─ Release month-year
       │      │        └──────────────── CRITICAL: "native-audio" = Live API support
       │      └───────────────────────── Model tier (flash/pro)
       └──────────────────────────────── Model version
```

**Key Rule:** Voice/Live API REQUIRES `-native-audio-` in the model name.

## Change History
| Date | Model | Reason | Result |
|------|-------|--------|--------|
| 2025-10-22 | `gemini-2.5-flash-preview-09-2025` | Set after Fly.io v59 | ❌ "model not found" in Live API |
| 2025-10-22 | `gemini-2.5-flash-native-audio-preview-09-2025` | Fixed to match prototype + Google docs | ✅ Working |

## How to Update in Future

### When Google Releases New Models
1. Check Google's official Live API model list
2. Verify model name includes `-native-audio-` for voice support
3. Update `GEMINI_MODELS.AUDIO_2025_09` (or add new constant)
4. Update `GEMINI_MODELS.DEFAULT_VOICE` to point to new constant
5. Update this document with change history
6. Test in dev before deploying

### If Voice Breaks Again
1. Check this document first
2. Verify model name has `-native-audio-`
3. Check Google deprecation notices
4. Compare against working prototype if still available

## References
- [Google Gemini Models Docs](https://ai.google.dev/gemini-api/docs/models/experimental-models)
- [Google Cloud Blog - Voice Agents](https://cloud.google.com/blog/products/ai-machine-learning/build-a-real-time-voice-agent-with-gemini-adk)
- Working prototype: `/Users/farzad/Downloads/fcb_prototype_multimodal`

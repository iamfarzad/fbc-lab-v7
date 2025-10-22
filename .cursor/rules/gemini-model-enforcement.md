# Gemini Model Enforcement Rule

## Voice Model Requirements
- **ALWAYS use** `gemini-2.5-flash-native-audio-preview-09-2025` for Live API voice
- Model name MUST contain `-native-audio-` to support Live API
- Import from `GEMINI_MODELS.DEFAULT_VOICE` in `@/config/constants`
- NEVER hardcode model names outside `src/config/constants.ts`

## Verification Before Changes
Before changing `GEMINI_MODELS.DEFAULT_VOICE`:
1. ✅ Check `.cursor/rules/gemini-voice-model-sot.md` for current source of truth
2. ✅ Verify new model name contains `-native-audio-` for voice support
3. ✅ Confirm model exists in Google's official Live API documentation
4. ✅ Test in development environment first
5. ✅ Update source of truth documentation with change reason

## Red Flags - STOP and Ask User
- Changing DEFAULT_VOICE to a model without `-native-audio-`
- Using `gemini-2.5-flash-preview-09-2025` for voice (no Live API support)
- Hardcoding model names in components/hooks instead of importing constant
- Making model changes without updating `.cursor/rules/gemini-voice-model-sot.md`

## If Voice Breaks
1. Read `.cursor/rules/gemini-voice-model-sot.md` first
2. Verify model name in `src/config/constants.ts` line 115
3. Check if model has `-native-audio-` in the name
4. Compare against working prototype or Google docs
5. Do NOT randomly try different model names without documentation

## Type Safety Checklist
- [ ] No new Message/Chat types created (uses Message from @/types/core)
- [ ] No hardcoded URLs or API keys
- [ ] Passes `pnpm type-check` with strict mode
- [ ] No code deleted without explanation
- [ ] If consolidating duplicates, old code was deleted in same commit

## AI Assistant Declaration
- [ ] I did not delete any working code to fix errors
- [ ] I did not create duplicate types/hooks/components
- [ ] I used existing types from @/types/core
- [ ] I checked for existing implementations before creating new ones

## Configuration Checklist
- [ ] WebSocket URLs use WEBSOCKET_CONFIG from @/config/constants
- [ ] Model names use GEMINI_MODELS from @/config/constants
- [ ] No hardcoded values that should be in config

## Testing
- [ ] Existing tests still pass
- [ ] New functionality has tests (if applicable)
- [ ] `pnpm type-check` passes
- [ ] `pnpm lint` passes

## Description
<!-- Describe what this PR does and why -->

## Changes Made
<!-- List specific files and what changed -->

## Migration Notes
<!-- If this consolidates/removes duplicates, explain what was deleted and why -->


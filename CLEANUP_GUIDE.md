# 🧹 Project Cleanup & Optimization Guide

## Current Issues
- **node_modules**: 1.4GB (main) + 111MB (server)
- **.next cache**: 591MB
- **puppeteer**: Heavy dependency (~200MB) only used for PDFs

## Cleanup Scripts

### Quick Clean (Safe - Run Anytime)
```bash
./cleanup.sh
```
Removes: Build cache, test artifacts, logs (~600MB freed)

### Deep Clean (Requires Reinstall)
```bash
./cleanup-deep.sh
```
Removes: Everything above + node_modules (~2GB freed)

### Nuclear Option (Complete Reset)
```bash
git clean -fdx -e .env -e .env.local
pnpm install
```

## Performance Optimizations

### 1. Replace Puppeteer (High Impact)
Puppeteer is 200MB+. Consider alternatives:

**Option A: Use @vercel/og** (Recommended)
```bash
pnpm add @vercel/og
pnpm remove puppeteer
```
- 95% smaller
- Vercel-native
- Perfect for PDF/image generation

**Option B: Use pdf-lib only**
- Already installed
- No browser needed
- Lighter weight

**Files using puppeteer:**
- `src/core/pdf-generator-puppeteer.ts`
- `app/api/export-summary/route.ts`
- `app/api/send-pdf-summary/route.ts`
- `src/core/workflows/finalizeLeadSession.ts`

### 2. Optimize Dependencies

**Potentially Unused (Need Verification):**
```bash
# Check if these are actually used:
pnpm why cytoscape      # Graph visualization - used?
pnpm why three          # 3D graphics - used?
pnpm why @nlux/react    # Chat UI - used?
pnpm why tokenlens      # Token counting - used?
pnpm why streamdown     # Markdown streaming - used?
```

### 3. Add to .gitignore
```bash
# Add these to .gitignore:
*.log
coverage/
playwright-report/
test-results/
.next/
*.log.tmp
*.json.tmp
```

### 4. Development Speed Improvements

**Enable Turbopack (Next.js 15):**
```json
// package.json
"dev": "next dev --turbo",
"dev:all": "pnpm concurrently \"pnpm dev --turbo\" \"pnpm --dir server dev\""
```

**Optimize TypeScript:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "incremental": true,
    "skipLibCheck": true  // Already enabled
  }
}
```

### 5. Build Optimizations

**Add to next.config.js:**
```js
module.exports = {
  // Already using SWC minifier (good!)
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-*',
      'framer-motion'
    ]
  }
}
```

### 6. Regular Maintenance

**Add npm scripts:**
```json
{
  "clean": "./cleanup.sh",
  "clean:deep": "./cleanup-deep.sh",
  "clean:cache": "rm -rf .next && pnpm store prune",
  "analyze": "pnpm build:analyze"
}
```

## Automated Cleanup

**Pre-push cleanup** (optional - add to .husky/pre-push):
```bash
# Clean logs before push
find logs -name "*.log" -mtime +7 -delete
```

**Cron job** (optional):
```bash
# Add to crontab: Clean weekly
0 2 * * 0 cd /path/to/fbc_lab_v7 && ./cleanup.sh
```

## Immediate Action Plan

1. ✅ Run `./cleanup.sh` - Safe, immediate benefit
2. 📊 Run `pnpm build:analyze` - See what's bloating bundle
3. 🔍 Verify puppeteer usage - Can we replace it?
4. 📦 Check unused dependencies
5. 🚀 Enable Turbopack for dev speed
6. 🔄 Consider deep clean if still slow

## Expected Results

| Action | Time | Space Freed | Risk |
|--------|------|-------------|------|
| Quick Clean | 10s | ~600MB | None |
| Deep Clean | 2min | ~2GB | Low |
| Replace Puppeteer | 1hr | ~200MB | Medium |
| Remove Unused Deps | 30min | ~100MB | Low |

## Monitoring

**Check build size:**
```bash
pnpm build:analyze
```

**Check dependency sizes:**
```bash
npx bundle-phobia-cli
```

**Find large files:**
```bash
find . -type f -size +10M -not -path "*/node_modules/*" -not -path "*/.next/*"
```


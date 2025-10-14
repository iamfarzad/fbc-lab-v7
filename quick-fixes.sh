#!/bin/bash
# Quick fixes for today's issues
# Run this to fix the test configuration and restore workflows

echo "🔧 Fixing Jest configuration..."

# Fix 1: Add TransformStream polyfill to jest.setup.cjs
cat >> jest.setup.cjs << 'EOF'

// Polyfill for Node.js environment
if (typeof global.TransformStream === 'undefined') {
  const { TransformStream } = require('stream/web');
  global.TransformStream = TransformStream;
}
EOF

echo "✅ Jest polyfill added"

# Fix 2: Restore GitHub Actions workflows
echo "🔧 Restoring GitHub Actions workflows..."

mkdir -p .github/workflows

# Restore e2e.yml with OAuth fix
git show 0f0b56a:.github/workflows/e2e.yml > .github/workflows/e2e.yml

# Restore e2e-nightly.yml with OAuth fix  
git show 0f0b56a:.github/workflows/e2e-nightly.yml > .github/workflows/e2e-nightly.yml

echo "✅ Workflows restored"

# Fix 3: Add proper permissions to workflows
echo "🔧 Adding OAuth permissions to workflows..."

# Add permissions to e2e.yml after 'name:' line
sed -i '' '/^name:/a\
\
permissions:\
  contents: read\
  checks: write\
  pull-requests: write
' .github/workflows/e2e.yml

# Add permissions to e2e-nightly.yml after 'name:' line
sed -i '' '/^name:/a\
\
permissions:\
  contents: read\
  checks: write
' .github/workflows/e2e-nightly.yml

echo "✅ OAuth permissions added"

echo ""
echo "🎉 All fixes applied!"
echo ""
echo "Next steps:"
echo "1. Run: npm test"
echo "2. Commit: git add -A && git commit -m 'fix: Restore workflows with OAuth permissions and Jest polyfill'"
echo "3. Push: git push"



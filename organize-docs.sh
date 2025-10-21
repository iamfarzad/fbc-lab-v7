#!/bin/bash
set -e

echo "📚 Documentation Organization Script"
echo "===================================="
echo ""

# Files to keep in root (never move)
KEEP_FILES=(
    "README.md"
    "README_FIRST.md"
    "NEXT_STEPS.md"
    "CLEANUP_GUIDE.md"
    "OPTIMIZATION_SUMMARY.md"
    "ROOT_CLEANUP_PLAN.md"
    "DOCUMENT_LIFECYCLE.md"
)

# Create docs directory if it doesn't exist
mkdir -p docs

# Counter for moved files
moved_count=0
skipped_count=0
error_count=0

# Array to store moved files for summary
declare -a moved_files=()

echo "🔍 Scanning root directory for markdown files..."
echo ""

# Process each .md file in root
for file in *.md; do
    # Skip if no .md files found
    if [ ! -f "$file" ]; then
        continue
    fi
    
    # Check if file should be kept in root
    should_keep=false
    for keep in "${KEEP_FILES[@]}"; do
        if [ "$file" = "$keep" ]; then
            should_keep=true
            break
        fi
    done
    
    if [ "$should_keep" = true ]; then
        echo "✓ Keeping in root: $file"
        ((skipped_count++))
        continue
    fi
    
    # Get file modification date
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        mod_date=$(stat -f "%Sm" -t "%Y-%m-%d" "$file")
    else
        # Linux
        mod_date=$(stat -c "%y" "$file" | cut -d' ' -f1)
    fi
    
    # Create new filename with date prefix
    new_name="${mod_date}_${file}"
    new_path="docs/${new_name}"
    
    # Check if file already exists in docs
    if [ -f "$new_path" ]; then
        echo "⚠️  Already exists: $new_path (skipping)"
        ((skipped_count++))
        continue
    fi
    
    # Move the file
    if mv "$file" "$new_path"; then
        echo "✓ Moved: $file → $new_path"
        moved_files+=("$file → docs/$new_name")
        ((moved_count++))
    else
        echo "❌ Error moving: $file"
        ((error_count++))
    fi
done

echo ""
echo "===================================="
echo "📊 Summary"
echo "===================================="
echo "Moved:   $moved_count files"
echo "Kept:    $skipped_count files"
echo "Errors:  $error_count files"
echo ""

if [ $moved_count -gt 0 ]; then
    echo "📝 Files moved to docs/:"
    echo ""
    for item in "${moved_files[@]}"; do
        echo "  • $item"
    done
    echo ""
fi

if [ $moved_count -eq 0 ]; then
    echo "✨ Root directory is already organized!"
else
    echo "✅ Documentation organization complete!"
    echo ""
    echo "Next steps:"
    echo "  1. Review moved files in docs/ directory"
    echo "  2. Verify root directory only has essential docs"
    echo "  3. Commit changes with: git add -A && git commit -m 'docs: Organize documentation by date'"
fi

echo ""


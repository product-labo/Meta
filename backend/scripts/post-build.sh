#!/bin/bash
# Post-build script to create .js symlinks for .cjs files
# This allows CommonJS requires to work with .js extensions

echo "Creating .js symlinks for .cjs files..."

# Find all .cjs files in dist and create .js symlinks
find dist -name "*.cjs" -type f | while read cjs_file; do
    js_file="${cjs_file%.cjs}.js"
    if [ ! -e "$js_file" ]; then
        ln -sf "$(basename "$cjs_file")" "$js_file"
        echo "  Created: $js_file -> $(basename "$cjs_file")"
    fi
done

echo "Post-build complete!"

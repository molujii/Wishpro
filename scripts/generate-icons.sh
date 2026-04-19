#!/bin/bash
# Generates icon.icns from assets/icons/icon.png (requires macOS sips + iconutil)
set -e

SRC="assets/icons/icon.png"
ICONSET="assets/icons/icon.iconset"

if [ ! -f "$SRC" ]; then
  echo "Error: $SRC not found. Place a 512x512 PNG there first." >&2
  exit 1
fi

mkdir -p "$ICONSET"

for size in 16 32 64 128 256 512; do
  sips -z $size $size "$SRC" --out "$ICONSET/icon_${size}x${size}.png" > /dev/null
  sips -z $((size * 2)) $((size * 2)) "$SRC" --out "$ICONSET/icon_${size}x${size}@2x.png" > /dev/null
done

iconutil -c icns "$ICONSET" -o assets/icons/icon.icns
echo "Generated assets/icons/icon.icns"

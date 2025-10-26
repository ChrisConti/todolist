#!/bin/bash
# Script pour builder et soumettre l'app iOS sur TestFlight

set -e

echo "🔨 Building archive..."
cd /Users/chris_/Documents/todolist/ios
SENTRY_ALLOW_FAILURE=true xcodebuild \
  -workspace tribubaby.xcworkspace \
  -scheme tribubaby \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  archive \
  -archivePath ./build/tribubaby.xcarchive

echo "📦 Exporting archive..."
xcodebuild -exportArchive \
  -archivePath ./build/tribubaby.xcarchive \
  -exportOptionsPlist <(cat <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>uploadBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
</dict>
</plist>
EOF
) \
  -exportPath ./build/export

echo "🚀 Submitting to TestFlight..."
cd /Users/chris_/Documents/todolist
eas submit --platform ios --path ./ios/build/export/tribubaby.ipa

echo "✅ Done!"

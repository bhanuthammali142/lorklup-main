#!/usr/bin/env bash
# ============================================================================
# HostelOS — Mobile Build Setup
# Run this from inside the lorklup-main project root, on your Mac.
# It applies the bugfixes, points the app at your real backend, builds the
# web assets, and syncs them into the native Android/iOS projects.
# ============================================================================
set -euo pipefail

echo "=================================================================="
echo " HostelOS Mobile Setup"
echo "=================================================================="

# ---------------------------------------------------------------------------
# 0. Sanity checks
# ---------------------------------------------------------------------------
if [ ! -f "package.json" ] || [ ! -d "backend" ]; then
  echo "❌ Run this from the root of the lorklup-main project (where package.json and backend/ live)."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js is not installed. Install it first: https://nodejs.org"
  exit 1
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "❌ npx not found (comes with Node.js/npm). Check your Node install."
  exit 1
fi

# ---------------------------------------------------------------------------
# 1. Apply the bugfix patch (safe to skip if already applied)
# ---------------------------------------------------------------------------
PATCH_FILE="hostelos-bugfixes.patch"
if [ -f "$PATCH_FILE" ]; then
  if git apply --check "$PATCH_FILE" >/dev/null 2>&1; then
    echo "▶ Applying bugfix patch..."
    git apply "$PATCH_FILE"
    echo "✅ Patch applied."
  else
    echo "ℹ️  Patch already applied or doesn't match current tree — skipping."
  fi
else
  echo "⚠️  $PATCH_FILE not found next to this script — skipping patch step."
  echo "    (Copy it into the project root if you haven't applied it yet.)"
fi

# ---------------------------------------------------------------------------
# 2. Ask for the production backend URL and write .env.production
#    (Vite bakes VITE_API_URL into the build at build time — the packaged
#    mobile app has no access to your dev machine's localhost, so this must
#    be a real, publicly reachable URL.)
# ---------------------------------------------------------------------------
ENV_FILE=".env.production"
if [ -f "$ENV_FILE" ] && grep -q "VITE_API_URL=" "$ENV_FILE" 2>/dev/null; then
  CURRENT_URL=$(grep "VITE_API_URL=" "$ENV_FILE" | cut -d'=' -f2-)
  echo ""
  echo "ℹ️  Found existing $ENV_FILE with VITE_API_URL=$CURRENT_URL"
  read -r -p "   Keep this URL? [Y/n] " KEEP
  if [[ "$KEEP" =~ ^[Nn]$ ]]; then
    read -r -p "   Enter your production backend URL (e.g. https://api.yourapp.com/api): " API_URL
    echo "VITE_API_URL=$API_URL" > "$ENV_FILE"
  fi
else
  echo ""
  read -r -p "Enter your production backend URL (e.g. https://api.yourapp.com/api): " API_URL
  if [ -z "$API_URL" ]; then
    echo "❌ A backend URL is required — the app won't be able to reach your API otherwise."
    exit 1
  fi
  echo "VITE_API_URL=$API_URL" > "$ENV_FILE"
  echo "✅ Wrote $ENV_FILE"
fi

# ---------------------------------------------------------------------------
# 3. Install dependencies
# ---------------------------------------------------------------------------
echo ""
echo "▶ Installing dependencies (this can take a few minutes the first time)..."
npm install

# ---------------------------------------------------------------------------
# 4. Build the web assets with the production API URL baked in
# ---------------------------------------------------------------------------
echo ""
echo "▶ Building web assets..."
npm run build

# ---------------------------------------------------------------------------
# 5. Sync into native Android/iOS projects
# ---------------------------------------------------------------------------
echo ""
echo "▶ Syncing Capacitor (copies dist/ + plugin config into android/ and ios/)..."
npx cap sync

echo ""
echo "=================================================================="
echo " ✅ Done. Next steps (manual, one-time per platform):"
echo "=================================================================="
echo ""
echo "  ANDROID (needs Android Studio installed):"
echo "    npx cap open android"
echo "    → press ▶ Run, pick your USB-connected phone (USB debugging on) or an emulator"
echo ""
echo "  iOS (needs Xcode installed):"
echo "    npx cap open ios"
echo "    → select your Team under Signing & Capabilities (needs your Apple ID)"
echo "    → press ▶ Run, pick your connected iPhone or a simulator"
echo ""
echo "  Whenever you change frontend code and want to test again, just re-run:"
echo "    npm run build && npx cap sync"
echo ""
echo "  To publish:"
echo "    Android → Android Studio → Build > Generate Signed Bundle/APK → upload .aab to Play Console"
echo "    iOS     → Xcode → Product > Archive → upload via Organizer to App Store Connect"
echo "=================================================================="

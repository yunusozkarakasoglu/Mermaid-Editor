#!/usr/bin/env bash
# Mermaid Editor — Linux kurulum scripti
# .mmd dosyalarını çift tıklayınca açması için .desktop + MIME ilişkilendirmesi kurar.
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN_NAME="mermaid-editor"
DESKTOP_FILE="$HOME/.local/share/applications/$BIN_NAME.desktop"

# 1) Başlatıcı (launcher)
LAUNCHER="$HOME/.local/bin/$BIN_NAME"
mkdir -p "$HOME/.local/bin"
cat > "$LAUNCHER" <<EOF
#!/usr/bin/env bash
exec "$APP_DIR/node_modules/.bin/electron" "$APP_DIR/main.js" "\$@"
EOF
chmod +x "$LAUNCHER"
echo "✓ başlatıcı: $LAUNCHER"

# 2) MIME tipi: *.mmd / *.mermaid
MIME_DIR="$HOME/.local/share/mime/packages"
mkdir -p "$MIME_DIR"
cat > "$MIME_DIR/x-mermaid.xml" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<mime-info xmlns="http://www.freedesktop.org/standards/shared-mime-info">
  <mime-type type="text/x-mermaid">
    <comment>Mermaid diagram</comment>
    <glob pattern="*.mmd"/>
    <glob pattern="*.mermaid"/>
  </mime-type>
</mime-info>
EOF
update-mime-database "$HOME/.local/share/mime" >/dev/null 2>&1 || true
echo "✓ MIME tipi: text/x-mermaid"

# 3) .desktop kaydı
mkdir -p "$HOME/.local/share/applications"
cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Name=Mermaid Editor
Comment=Mermaid diagram editor with live preview and AI generation
Exec=$LAUNCHER %F
Icon=accessories-text-editor
Terminal=false
Type=Application
Categories=Development;Graphics;
MimeType=text/x-mermaid;
StartupNotify=false
EOF
update-desktop-database "$HOME/.local/share/applications" >/dev/null 2>&1 || true

# 4) Varsayılan uygulama olarak ata
MIMEAPPS="$HOME/.config/mimeapps.list"
touch "$MIMEAPPS"
if grep -q "^text/x-mermaid=" "$MIMEAPPS"; then
  sed -i "s|^text/x-mermaid=.*|text/x-mermaid=$BIN_NAME.desktop|" "$MIMEAPPS"
else
  echo "text/x-mermaid=$BIN_NAME.desktop" >> "$MIMEAPPS"
fi
echo "✓ .desktop: $DESKTOP_FILE"
echo ""
echo "Kurulum tamam. Şimdi .mmd dosyasına çift tıklayabilirsin."
echo "Not: dosya yöneticisi (nemo) açıksa yenile: nemo -q"

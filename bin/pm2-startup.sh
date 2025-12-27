#!/bin/sh
# Helper to setup pm2 persistence on Linux (systemd)
# Usage: ./pm2-startup.sh <user>
# Example: ./pm2-startup.sh deployuser

USER_NAME="$1"
if [ -z "$USER_NAME" ]; then
  echo "Usage: $0 <user>"
  exit 2
fi

# Ensure pm2 is installed globally
if ! command -v pm2 >/dev/null 2>&1; then
  echo "pm2 not found. Installing pm2 globally..."
  npm install -g pm2 || { echo "npm install failed"; exit 3; }
fi

# Start the app (assume package.json scripts)
npm run deploy || { echo "npm run deploy failed"; exit 4; }

# Save current process list
pm2 save || { echo "pm2 save failed"; exit 5; }

# Generate and run startup script for systemd
STARTUP_CMD="$(pm2 startup systemd -u $USER_NAME --hp /home/$USER_NAME | sed -n '1,200p')"
# pm2 startup prints a command to run with sudo; show it and try to run if we are root
echo "pm2 startup output:"
pm2 startup systemd -u $USER_NAME --hp /home/$USER_NAME

echo "If the previous command printed a sudo command, run it as root (or run this script with sudo)."

echo "Done. Re-run 'pm2 save' after running the generated sudo command if needed."

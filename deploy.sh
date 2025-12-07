#!/bin/sh

export HOME=/home/SVKruik

# Git
git config --global --add safe.directory "$HOME/Documents/GitHub/Dispatch"
git reset --hard
git pull
echo "Git setup complete"

# Dispatch
npm install
npm run build

echo "Deployment complete. Reloading server."
sudo systemctl restart dispatch-api.service
#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

REPO_NAME="ringtone-studio"
GITHUB_USER="krisatrader"
REMOTE_URL="git@github.com:${GITHUB_USER}/${REPO_NAME}.git"

echo "📱 iPhone Ringtone Studio feltöltése a GitHubra..."
echo "📍 Cél repository: ${REMOTE_URL}"

# Initialize git if needed
if [ ! -d ".git" ]; then
  git init
fi

git branch -M main

# Configure remote
if git remote | grep -q "^origin$"; then
  git remote set-url origin "$REMOTE_URL"
else
  git remote add origin "$REMOTE_URL"
fi

# Stage and commit all files
git add .
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
  git commit -m "Initial release of iPhone Ringtone Studio (.m4r)"
fi

echo "🔍 GitHub kapcsolat ellenőrzése..."
if ! git ls-remote "$REMOTE_URL" >/dev/null 2>&1; then
  echo ""
  echo "⚠️  A(z) '${REPO_NAME}' repository még nem létezik a GitHub fiókodban (${GITHUB_USER})!"
  echo "👉 Kérlek nyisd meg az alábbi linket a böngésződben és kattints a 'Create repository' zöld gombra:"
  echo ""
  echo "   🔗 https://github.com/new?name=${REPO_NAME}&public=true"
  echo ""
  echo "Miután létrehoztad, futtasd újra ezt a parancsot:"
  echo "   ./publish_to_github.sh"
  exit 1
fi

echo "🚀 Feltöltés a main ágra..."
git push -u origin main

echo "🌐 GitHub Pages ág (gh-pages) előkészítése és közzététele..."
git subtree split --prefix public -b gh-pages-deploy
git push -f origin gh-pages-deploy:gh-pages
git branch -D gh-pages-deploy

echo ""
echo "=========================================================="
echo "🎉 SIKERES FELTÖLTÉS & KÖZZÉTÉTEL!"
echo "=========================================================="
echo "📁 GitHub Forráskód: https://github.com/${GITHUB_USER}/${REPO_NAME}"
echo "🌐 Élő Publikált Weboldal: https://${GITHUB_USER}.github.io/${REPO_NAME}/"
echo ""
echo "⚙️  Ha az élő weboldal még nem aktív a repo-n, ellenőrizd itt:"
echo "   https://github.com/${GITHUB_USER}/${REPO_NAME}/settings/pages"
echo "   (Source: 'GitHub Actions' vagy 'Deploy from a branch' -> 'gh-pages')"
echo "=========================================================="

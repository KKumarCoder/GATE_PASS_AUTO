#!/usr/bin/env bash
set -euo pipefail
# Run as the dedicated srps Unix account. Deploy only a reviewed commit with passing CI.
commit="${1:?Usage: deploy/release.sh FULL_REVIEWED_COMMIT_SHA}"
[[ "$commit" =~ ^[a-f0-9]{40}$ ]] || { echo 'A full 40-character commit SHA is required.'; exit 1; }
base=/srv/srps
repo="$base/repository"
release="$base/releases/$commit"
previous="$(readlink -f "$base/current" || true)"
cd "$repo"
git fetch origin main
git merge-base --is-ancestor "$commit" origin/main
[[ ! -e "$release" ]] || { echo 'Release already exists; choose a new commit.'; exit 1; }
mkdir -p "$release"
git archive "$commit" srps-gate-pass | tar -x -C "$release" --strip-components=1
ln -s "$base/shared/.env" "$release/.env"
mkdir -p "$base/shared/uploads"
ln -s "$base/shared/uploads" "$release/server/uploads"
cd "$release"
npm ci
npm run build
node server/utils/migrate.js
npm prune --omit=dev
ln -sfn "$release" "$base/current.next"
mv -Tf "$base/current.next" "$base/current"
pm2 startOrReload "$release/deploy/ecosystem.config.cjs" --update-env
healthy=false
for attempt in {1..15}; do
    if curl --fail --silent http://127.0.0.1:4000/api/health > /dev/null; then healthy=true; break; fi
    sleep 1
done
if [[ "$healthy" != true ]]; then
    if [[ -n "$previous" && -d "$previous" ]]; then
        ln -sfn "$previous" "$base/current.rollback"
        mv -Tf "$base/current.rollback" "$base/current"
        pm2 startOrReload "$previous/deploy/ecosystem.config.cjs" --update-env
    fi
    echo 'Health check failed. Previous release restored where available.'
    exit 1
fi
pm2 save
printf 'Deployed reviewed commit %s\n' "$commit"

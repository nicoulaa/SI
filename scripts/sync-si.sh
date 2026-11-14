#!/bin/bash
# À placer dans /Users/nicolas/Documents/Lesprojets/wplace/sync-si.sh
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
if [[ -d "$SCRIPT_DIR/SI/.git" ]]; then
  REPO="$SCRIPT_DIR/SI"
elif [[ -d "$SCRIPT_DIR/../.git" ]]; then
  # Fonctionne également depuis SI/scripts/.
  REPO="$(cd "$SCRIPT_DIR/.." && pwd)"
else
  echo "Erreur : dépôt SI introuvable à côté du script." >&2
  exit 1
fi
cd "$REPO"
if [[ "$(git branch --show-current)" != "main" ]]; then
  echo "Arrêt : sélectionnez la branche main avant de synchroniser." >&2
  exit 1
fi
for state in rebase-merge rebase-apply MERGE_HEAD CHERRY_PICK_HEAD REVERT_HEAD; do
  if [[ -e "$(git rev-parse --git-path "$state")" ]]; then
    echo "Arrêt : une opération Git est déjà en cours. Terminez-la avant de relancer." >&2
    exit 1
  fi
done
# Ne pas inclure ou déplacer involontairement d'autres travaux suivis.
while IFS= read -r -d '' path; do
  case "$path" in
    Overlays/*|Visionneuse/*|scripts/*|.github/workflows/pages.yml|.gitignore) ;;
    *) echo "Arrêt : changements hors du périmètre SI à traiter : $path" >&2; exit 1 ;;
  esac
done < <(git diff HEAD --name-only -z)

# Retirer les métadonnées Finder déjà présentes et ignorer les futures.
find . -path './.git' -prune -o -type f \
  \( -name '.DS_Store' -o -name 'Thumbs.db' -o -name 'ehthumbs.db' \
     -o -iname 'desktop.ini' -o -name '._*' \) -delete

# Vérifier l'accès distant avant de créer un commit local.
echo "Récupération du dépôt distant…"
git fetch origin

paths=()
for path in Overlays Visionneuse scripts .github/workflows/pages.yml .gitignore; do
  if [[ -e "$path" ]] || [[ -n "$(git ls-files -- "$path")" ]]; then
    paths+=("$path")
  fi
done
if (( ${#paths[@]} )); then
  git add -A -- "${paths[@]}"
fi
if ! git diff --cached --quiet; then
  git commit -m "${1:-Synchronisation des overlays et de la visionneuse}"
else
  echo "Aucun changement local à enregistrer."
fi

# Les suppressions dans les dossiers synchronisés sont également enregistrées.
if git show-ref --verify --quiet refs/remotes/origin/main; then
  if ! git rebase origin/main; then
    echo "Conflit : aucun envoi effectué. Résolvez les conflits puis lancez git rebase --continue," >&2
    echo "ou annulez la récupération avec git rebase --abort. Relancez ensuite ce script." >&2
    exit 1
  fi
fi

git push -u origin main
echo "Synchronisation terminée : https://github.com/nicoulaa/SI"

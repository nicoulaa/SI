param(
    [Parameter(Position = 0)]
    [string]$CommitMessage = "Synchronisation des overlays et de la visionneuse"
)

$ErrorActionPreference = 'Stop'

function Invoke-Git {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$GitArgs)
    & git @GitArgs
    if ($LASTEXITCODE -ne 0) {
        throw "La commande git $($GitArgs -join ' ') a échoué (code $LASTEXITCODE)."
    }
}

$ScriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$SiblingRepository = Join-Path $ScriptDirectory 'SI'
$ParentRepository = Split-Path -Parent $ScriptDirectory

if (Test-Path (Join-Path $SiblingRepository '.git')) {
    $Repository = (Resolve-Path $SiblingRepository).Path
} elseif (Test-Path (Join-Path $ParentRepository '.git')) {
    $Repository = (Resolve-Path $ParentRepository).Path
} else {
    throw "Dépôt SI introuvable à côté du script. Placez sync-si.ps1 dans wplace/ ou SI/scripts/."
}

Set-Location $Repository
$Branch = (& git branch --show-current).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Impossible de lire la branche Git actuelle.' }
if ($Branch -ne 'main') {
    throw "Arrêt : la branche actuelle est '$Branch'. Sélectionnez main avant la synchronisation."
}

foreach ($State in @('rebase-merge', 'rebase-apply', 'MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD')) {
    $GitPath = (& git rev-parse --git-path $State).Trim()
    if ($LASTEXITCODE -ne 0) { throw "Impossible de vérifier l'état Git ($State)." }
    if (Test-Path $GitPath) {
        throw "Arrêt : une opération Git ($State) est déjà en cours. Terminez-la avant de relancer."
    }
}

# Supprimer les métadonnées créées par macOS et Windows Explorer, hors base Git.
$GitDirectory = (Resolve-Path '.git').Path.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
$GeneratedNames = @('.DS_Store', 'Thumbs.db', 'ehthumbs.db', 'desktop.ini')
Get-ChildItem -LiteralPath $Repository -Recurse -Force -File -ErrorAction SilentlyContinue |
    Where-Object {
        -not $_.FullName.StartsWith($GitDirectory, [StringComparison]::OrdinalIgnoreCase) -and
        ($GeneratedNames -contains $_.Name -or $_.Name.StartsWith('._', [StringComparison]::Ordinal))
    } |
    ForEach-Object { Remove-Item -LiteralPath $_.FullName -Force }

Write-Host 'Récupération du dépôt distant…'
Invoke-Git fetch origin

# Ajouter uniquement les dossiers et fichiers du projet concernés.
Invoke-Git add -A -- Overlays Visionneuse scripts .github/workflows/pages.yml .gitignore

& git diff --cached --quiet
$HasStagedChanges = $LASTEXITCODE -ne 0
if ($LASTEXITCODE -gt 1) { throw 'Impossible de vérifier les changements préparés.' }
if ($HasStagedChanges) {
    Invoke-Git commit -m $CommitMessage
} else {
    Write-Host 'Aucun changement local à enregistrer.'
}

& git show-ref --verify --quiet refs/remotes/origin/main
$HasRemoteMain = $LASTEXITCODE -eq 0
if ($LASTEXITCODE -gt 1) { throw 'Impossible de vérifier la branche distante origin/main.' }
if ($HasRemoteMain) {
    & git rebase origin/main
    if ($LASTEXITCODE -ne 0) {
        Write-Error 'Conflit : aucun envoi effectué. Résolvez les conflits puis lancez git rebase --continue, ou annulez avec git rebase --abort. Relancez ensuite le script.'
        exit 1
    }
}

Invoke-Git push -u origin main
Write-Host 'Synchronisation terminée : https://github.com/nicoulaa/SI'

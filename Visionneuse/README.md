# Visionneuse Wplace

Ouvrez **index.html** par double-clic dans un navigateur récent (Chrome, Edge, Firefox ou Safari). Aucune installation, connexion Internet ni serveur web n’est nécessaire. Gardez `index.html`, `style.css` et `app.js` dans le même dossier.

1. Cliquez sur **Ouvrir un dossier** et choisissez `Overlays` (ou le dossier SI pour inclure tous ses sous-dossiers). Si le navigateur demande une autorisation de lecture, acceptez. Le libellé « importer » du navigateur désigne une lecture locale : aucun fichier n’est envoyé.
2. Utilisez l’arborescence pour filtrer un dossier et tous ses descendants. La recherche porte sur les noms et les chemins.
3. Cliquez sur une miniature pour la sélectionner. Les quatre flèches déplacent la sélection dans la grille. Entrée ou un double-clic ouvre l’image.
4. Dans la visionneuse, utilisez **+ / −**, la molette ou les touches **+ / −** pour zoomer. Glissez l’image pour la déplacer. **Adapter**, la touche **0** ou un double-clic recentre l’image. **1:1** affiche un pixel de l’image par pixel CSS. **Fond** alterne damier, blanc et noir.
5. Les flèches gauche/droite ou les boutons passent aux images voisines dans les résultats. Échap ferme la vue.

Les informations affichent tous les champs du fichier et les dimensions réelles. La longue donnée de l’image est remplacée par une mention dans les métadonnées. L’image est affichée avec son alpha d’origine, indépendamment de l’opacité ou de la visibilité de l’overlay sur la carte Wplace. **Enregistrer l’image** extrait l’image intégrée.

Les fichiers JSON standards et ceux contenant des séparateurs littéraux `\n` sont pris en charge. Les images intégrées PNG, JPEG, WebP, GIF et BMP sont acceptées. Les fichiers illisibles sont signalés sans bloquer les autres.

Par sécurité, un navigateur ne peut pas parcourir vos dossiers automatiquement depuis une page locale. Il faut donc sélectionner le dossier à chaque ouverture. Si la sélection de dossier n’est pas disponible, utilisez **Ouvrir des fichiers** ; l’arborescence n’est alors pas conservée. Aucun service externe, stockage persistant ou bibliothèque tierce n’est utilisé.

## Tri, identification et copie

Le menu de tri propose le nom de fichier de A à Z (par défaut), de Z à A ou la date de modification la plus récente. Les fichiers directement dans le dossier choisi apparaissent en premier ; les autres sont regroupés par chemin de sous-dossier, dans l’ordre alphabétique. Le tri choisi s’applique aux fichiers dans chaque groupe. Dans « Tous les fichiers », le dossier racine importé est considéré comme dossier courant.

Les noms des vignettes des sous-dossiers portent un préfixe `▣ sous-dossier /`. Les noms longs sont tronqués ; laissez le pointeur immobile pour afficher l’infobulle native avec le nom complet et le chemin. Le délai dépend du navigateur.

La vue détaillée propose le nom et le chemin relatif complets dans des champs sélectionnables, et deux boutons de copie. Si la copie automatique est bloquée, le texte est sélectionné pour une copie manuelle par ⌘C ou Ctrl+C.

La date de création et le chemin absolu ne sont pas accessibles via la sélection de fichiers du navigateur. Le tri par création est donc indiqué comme indisponible ; aucune date de modification n’est utilisée à sa place. Le chemin copié inclut le dossier importé et le nom du fichier, sans le chemin absolu sur l’ordinateur.

## Mode en ligne et GitHub Pages

Sur une page HTTP/HTTPS, la visionneuse charge automatiquement `catalogue.json`, puis les fichiers `../Overlays/…`. Le bouton **Overlays en ligne** recharge le catalogue, notamment après avoir utilisé le mode local. Les boutons d’ouverture locale restent disponibles. Par double-clic sur `index.html` (`file://`), aucune requête réseau n’est effectuée : seule la sélection locale est proposée.

Le catalogue est généré pendant la publication et ne doit pas être entretenu manuellement. La création Git correspond à la première apparition dans l’historique suivi du fichier ; la modification Git correspond au dernier commit touchant le fichier. Ce ne sont pas les dates du système de fichiers. Les fichiers sans historique ont une date indisponible et sont classés après ceux ayant une date connue. Les sous-dossiers conservent toujours leur ordre alphabétique.

### Première publication depuis main

1. Envoyez sur GitHub `Visionneuse/`, `scripts/build_pages.py`, `.github/workflows/pages.yml` et `.gitignore`, ainsi que vos overlays.
2. Dans le dépôt GitHub, ouvrez **Settings → Pages → Build and deployment**.
3. Pour **Source**, sélectionnez **GitHub Actions**. Il n’y a pas de branche à choisir dans cet écran : le workflow fourni utilise explicitement `main`.
4. Dans l’onglet **Actions**, choisissez **Publier la visionneuse**, puis **Run workflow**, branche **main**, et confirmez **Run workflow**. Cela permet aussi de relancer une première publication qui aurait échoué avant l’activation de Pages.
5. Attendez le succès du workflow. La visionneuse sera disponible sur `https://nicoulaa.github.io/SI/Visionneuse/`. La racine `https://nicoulaa.github.io/SI/` y redirige également.

Chaque nouvel envoi sur `main` reconstruit et republie les overlays et le catalogue. Aucun serveur applicatif, token dans le JavaScript ou appel à l’API GitHub n’est nécessaire. Les fichiers locaux sélectionnés dans la visionneuse ne sont jamais envoyés.

Le workflow ne publie que les ressources de la visionneuse, les fichiers `.wplace` et le catalogue. Le site Pages est destiné à une consultation publique : les overlays publiés sont téléchargeables.

Si GitHub refuse l’envoi du fichier de workflow avec un token fin, ajoutez **Workflows → Read and write** aux permissions de ce token pour le dépôt SI, en plus de **Contents → Read and write**.

### Vérification locale du paquet publié (facultative)

Depuis la racine du dépôt :

```bash
python3 scripts/build_pages.py --output _site
```

Le dossier `_site` contient le site complet et est ignoré par Git. Le fonctionnement hors ligne par double-clic ne nécessite pas cette commande ; il suffit d’utiliser `Visionneuse/index.html` et de sélectionner un dossier.

### Script de synchronisation

Copiez `scripts/sync-si.sh` dans le dossier parent `wplace/`, puis lancez `bash sync-si.sh`. Vous pouvez aussi le lancer directement avec `bash scripts/sync-si.sh` depuis SI. Un message de commit personnalisé peut être passé en premier argument.

Le script récupère le dépôt distant, enregistre les ajouts, modifications **et suppressions** dans `Overlays/`, `Visionneuse/`, `scripts/`, le workflow Pages et `.gitignore`, puis réapplique les commits locaux sur `origin/main` et envoie le résultat. Il refuse de travailler sur une autre branche, pendant une opération Git en cours ou en présence de modifications suivies hors de ce périmètre. En cas de conflit, il s’arrête sans forcer l’envoi. L’authentification utilise votre configuration Git habituelle ; aucun token n’est écrit dans le script.
